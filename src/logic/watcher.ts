import {BoardLoc} from "../boardLoc";
import {DiagnosticInfo, iWatcher, Observation, VariableAssignments} from "../types";
import {Constraint, ConstraintSet} from "./constraints";
import {FixedBoardMinesweeperConfig} from "../constants";
import {BoardSize} from "../boardSize";
import {SolutionTracker} from "./solutionTracker";

export interface WatcherConfig {
    maintainedFutures: number,
    futureReadsPerMove: number,
    alwaysKnowSomeConsistentMinefield: boolean,
}

class Watcher implements iWatcher {
    private static defaultWatcherConfig: WatcherConfig = {
        maintainedFutures: 200,
        futureReadsPerMove: 100,
        alwaysKnowSomeConsistentMinefield: true,
    };
    private constraints: ConstraintSet;
    private solutionTracker: SolutionTracker;
    private successRandomSatisfyingAssignment: number = 0;
    private attemptedRandomSatisfyingAssignment: number = 0;

    constructor(public readonly boardConfig: FixedBoardMinesweeperConfig,
                public readonly config: WatcherConfig = Watcher.defaultWatcherConfig,
    ) {
        const numVariables = boardConfig.dimensions.size.height * boardConfig.dimensions.size.width;
        this.constraints = new ConstraintSet(numVariables);
        this.solutionTracker = new SolutionTracker(numVariables);

        const nums = [];
        for (let i = 0; i < numVariables; i++) {
            nums.push(i);
        }

        // This is the global total mine count constraint.
        this.constraints.introduceConstraints([new Constraint(nums, boardConfig.dimensions.mineCount)]);
    }

    private _visited = new Set<number>();

    get visited(): Set<number> {
        return this._visited;
    }

    private _frontier = new Set<number>();

    get frontier(): Set<number> {
        return this._frontier;
    }

    private get size(): BoardSize {
        return this.boardConfig.dimensions.size;
    }

    public observe(observations: Observation[]) {
        let newConstraints: Constraint[] = [];
        for (let i = 0; i < observations.length; i++) {
            const loc = observations[i].loc
            const locnum = loc.toNumber(this.size);
            const result = observations[i].result;

            this._visited.add(locnum);
            this._frontier.delete(locnum);
            const neighbours = loc.neighboursOnBoard(this.size).map(nloc => nloc.toNumber(this.size));
            neighbours.forEach(nloc => {
                if (!this._visited.has(nloc))
                    this._frontier.add(nloc)
            });

            if (result.explodedMine) {
                console.log(`Watcher saw a BOOM.`);
                // this.constraints.fixedVariables.setTrue(locnum);
                return;
            }
            if (result.neighboursWithMine === undefined) {
                console.error(`Invalid FactualMineTestResult ${result}`);
                return;
            }

            // When we observe a visit, the first thing we learn is that there was no mine there.
            // The second thing we learn is a new constraint imposed by the neighbour count.
            this.constraints.fixedVariables.setFalse(locnum);
            newConstraints.push(new Constraint(neighbours, result.neighboursWithMine, loc));
        }
        // This generates a whirlwind of inference in this.constraints.
        this.constraints.introduceConstraints(newConstraints);

        this.pruneSolutions();

        this.findAndStoreContinuations();
        // setImmediate(this.findAndStoreContinuations);
    }

    public diagnosticInfo(loc: BoardLoc): DiagnosticInfo {
        const locnum = loc.toNumber(this.size);
        const prob = this.solutionTracker.mineProbability(locnum);
        return {
            onFrontierAndUnknown: this._frontier.has(locnum),
            // onFrontierAndUnknown: this.constraints.unknown.has(locnum),
            knownNonMine: this.constraints.fixedVariables.falses.has(locnum),
            knownMine: this.constraints.fixedVariables.trues.has(locnum),
            mineProbability: prob,
            couldBeAMine: prob === undefined || prob > 0,
        }
    }

    public findPartialSatisfyingAssignment(predicate: (sat: VariableAssignments) => boolean) {
        const iter = this.solutionTracker.knownSolutions.keys();
        for (let ass = iter.next(); !ass.done; ass = iter.next()) {
            if (predicate(ass.value)) return ass.value;
        }
        // for (let i = 0; i < this.knownSolutions.size; i++) {
        //     const assignment = this.knownSolutions[i];
        //     if (predicate(assignment)) {
        //         return assignment;
        //     }
        // }
        return undefined;
    }

    public searchKnownGameExtensions(requirements: VariableAssignments, attempts: number): VariableAssignments | undefined {
        const knownExtension = this.solutionTracker.findKnownSolutionConsistentWith(requirements);
        if (knownExtension) return knownExtension;

        for (let i = 0; i < attempts; i++) {
            const ass = this.constraints.tryToBuildExtension(requirements);
            if (ass) {
                console.log(`Found game extension. It took me ${i + 1} attempts.`);
                return ass;
            }
        }
    }

    public knownSafeLocs(): Set<number> {
        return this.constraints.fixedVariables.falses;
    }

    public locationsBySafenessOrder(): number[] {
        return this.solutionTracker.variablesInOrderOfHeuristicSafety();
    }

    public neverSeenAsMineLocs() {
        const ret = this.solutionTracker.variablesNotKnownConsistentAsMine();

        function setIntersection(a: Set<number>, b: Set<number>) {
            const ret = new Set<number>();
            a.forEach(n1 => {
                if (b.has(n1)) ret.add(n1);
            });
            return ret;
        }

        // We intersect this with the frontier so fluctuations in our guesses don't poison ForcedGuessesAlwaysSucceedGameProvider
        return setIntersection(this.frontier, ret);
    }

    /**
     * Try to find some full-board configurations that respect everything we know and all of the constraints we know.
     * Normally this is called internally when an observation is made and some of our continuations are evicted, but
     * we can also call it manually for replenishment before an important decision has to be made based on our
     * knowledge.
     */
    public findAndStoreContinuations = () => {
        const oldSizeKnowns = this.solutionTracker.size;
        let learnedSomething = false;

        if (this.solutionTracker.size >= this.config.maintainedFutures) return;

        const enoughContinuations = () => {
            if (this.config.alwaysKnowSomeConsistentMinefield && this.solutionTracker.size === 0) {
                return false;
            }
            return this.solutionTracker.size >= this.config.maintainedFutures;
        }

        let i = 0;
        for (i = 0; !enoughContinuations() || i < this.config.futureReadsPerMove; i++) {
            this.attemptedRandomSatisfyingAssignment++;
            // let ass = this.constraints.findRandomConsistentPartialAssignment(this.frontier);
            let ass = this.constraints.findRandomCompleteAssignment();
            if (ass) {
                this.solutionTracker.addSolution(ass);
                this.successRandomSatisfyingAssignment++;
            }
        }

        const sizeDiff = this.solutionTracker.size - oldSizeKnowns;

        console.log(`KnownSolutions ${oldSizeKnowns} +${sizeDiff} in ${i} attempts.`)

    }

    private pruneSolutions() {
        // this.knownSolutions.forEach(ass => this.removeSatisfyingAssignment(ass));
        // return;

        const baddies: VariableAssignments[] = [];
        const iter = this.solutionTracker.knownSolutions.keys();
        for (let ass = iter.next(); !ass.done; ass = iter.next()) {
            if (!this.constraints.allSatisfiedBy(ass.value)) baddies.push(ass.value);
        }

        // if (baddies.length > 0) {
        //     console.log(`Pruning ${baddies.length} minefields. ${this.solutionTracker.knownSolutions.size - baddies.length} remain.`);
        // }
        this.solutionTracker.removeSolutions(baddies);
        // baddies.forEach(ass => this.solutionTracker.removeSolution(ass));
    }

    private testSuspiciousVariables() {
        const suspicious = this.solutionTracker.unseenVariableSettings();
        // Don't do anything yet
    }
}

export default Watcher;