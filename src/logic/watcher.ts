import {BoardLoc} from "../boardLoc";
import {DiagnosticInfo, iWatcher, Observation, VariableAssignments} from "../types";
import {Constraint, ConstraintSet} from "./constraints";
import {FixedBoardMinesweeperConfig} from "../constants";
import {BoardSize} from "../boardSize";

class SolutionTracker {
    public knownSolutions: Set<VariableAssignments>;
    private timesMineInSolutions: number[];
    private timesEmptyInSolutions: number[];

    constructor(private numVariables: number) {
        this.knownSolutions = new Set<VariableAssignments>();
        this.timesMineInSolutions = new Array(numVariables);
        this.timesEmptyInSolutions = new Array(numVariables);
        for (let i = 0; i < numVariables; i++) {
            this.timesMineInSolutions[i] = 0;
            this.timesEmptyInSolutions[i] = 0;
        }
    }

    public get size(): number {
        return this.knownSolutions.size;
    }

    public mineProbability(locnum: number) {
        const involvedCount = this.timesMineInSolutions[locnum] + this.timesEmptyInSolutions[locnum];
        if (involvedCount > 0) {
            return this.timesMineInSolutions[locnum] / involvedCount;
        }
    }

    public locationKnownToBeFlexible(loc: number) {
        return this.timesEmptyInSolutions[loc] > 0 && this.timesMineInSolutions[loc] > 0;
    }


    public removeSolution(solution: VariableAssignments) {
        console.assert(this.knownSolutions.has(solution));
        this.knownSolutions.delete(solution);
        solution.trues.forEach(loc => this.timesMineInSolutions[loc]--);
        solution.falses.forEach(loc => this.timesEmptyInSolutions[loc]--);
    }

    public addSolution(solution: VariableAssignments) {
        this.knownSolutions.add(solution);
        solution.trues.forEach(loc => this.timesMineInSolutions[loc]++);
        solution.falses.forEach(loc => this.timesEmptyInSolutions[loc]++);
    }

    public variablesNotKnownConsistentAsMine(): Set<number> {
        const ret = new Set<number>();
        this.timesMineInSolutions.forEach((val, variable) => {
            if (val === 0) ret.add(variable);
        })
        return ret;
    }

    public unseenVariableSettings(): VariableAssignments {
        const ret = new VariableAssignments();
        // If we're not even tracking anything, this is useless knowledge and would contain inconsistencies so
        // we jump out early..
        if (this.knownSolutions.size === 0) {
            return ret;
        }
        this.timesEmptyInSolutions.forEach((val, variable) => {
            if (val === 0) ret.setFalse(variable);
        })
        this.timesMineInSolutions.forEach((val, variable) => {
            if (val === 0) ret.setTrue(variable);
        })
        return ret;
    }

    public variablesInOrderOfHeuristicSafety(): number[] {
        const locs = [];
        for (let i = 0; i < this.numVariables; i++) locs.push(i);
        locs.sort((a, b) => (this.mineProbability(a) || 0) - (this.mineProbability(b) || 0))
        return locs;
    }

    findConsistentWith(requirements: VariableAssignments): VariableAssignments | undefined {
        const iter = this.knownSolutions.keys();
        for (let ass = iter.next(); !ass.done; ass = iter.next()) {
            const assignment = ass.value;
            if (assignment.consistentWith(requirements)) return assignment;
        }
    }
}

export interface WatcherConfig {
    maintainedFutures: number,
    futureReadsPerMove: number,
    alwaysKnowSomeConsistentMinefield: boolean,
}

class Watcher implements iWatcher {
    private static defaultWatcherConfig: WatcherConfig = {
        maintainedFutures: 500,
        futureReadsPerMove: 50,
        alwaysKnowSomeConsistentMinefield: true,
    };
    private constraints: ConstraintSet;
    private solutionTracker: SolutionTracker;
    private visited = new Set<number>();
    private frontier = new Set<number>();
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

    private get size(): BoardSize {
        return this.boardConfig.dimensions.size;
    }

    public observe(observations: Observation[]) {
        let newConstraints: Constraint[] = [];
        for (let i = 0; i < observations.length; i++) {
            const loc = observations[i].loc
            const locnum = loc.toNumber(this.size);
            const result = observations[i].result;

            this.visited.add(locnum);
            this.frontier.delete(locnum);
            const neighbours = loc.neighboursOnBoard(this.size).map(nloc => nloc.toNumber(this.size));
            neighbours.forEach(nloc => {
                if (!this.visited.has(nloc))
                    this.frontier.add(nloc)
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
            newConstraints.push(new Constraint(neighbours, result.neighboursWithMine));
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
            onFrontierAndUnknown: this.frontier.has(locnum),
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

    public findGameExtension(requirements: VariableAssignments): VariableAssignments | undefined {
        const knownExtension = this.solutionTracker.findConsistentWith(requirements);
        if (knownExtension) return knownExtension;
        return this.constraints.tryToBuildExtension(requirements);
    }

    public knownSafeLocs(): Set<number> {
        return this.constraints.fixedVariables.falses;
    }

    public locationsBySafenessOrder(): number[] {
        return this.solutionTracker.variablesInOrderOfHeuristicSafety();
    }

    public neverSeenAsMineLocs() {
        return this.solutionTracker.variablesNotKnownConsistentAsMine();
    }

    private findAndStoreContinuations = () => {
        let learnedSomething = false;

        if (this.solutionTracker.size >= this.config.maintainedFutures) return;

        const enoughContinuations = () => {
            if (this.config.alwaysKnowSomeConsistentMinefield && this.solutionTracker.size === 0) {
                return false;
            }
            return this.solutionTracker.size >= this.config.maintainedFutures;
        }

        for (let i = 0; !enoughContinuations() || i < this.config.futureReadsPerMove; i++) {
            this.attemptedRandomSatisfyingAssignment++;
            // let ass = this.constraints.findRandomConsistentPartialAssignment(this.frontier);
            let ass = this.constraints.findRandomCompleteAssignment();
            if (ass) {
                this.solutionTracker.addSolution(ass);
                this.successRandomSatisfyingAssignment++;
            }
        }

    }

    private pruneSolutions() {
        // this.knownSolutions.forEach(ass => this.removeSatisfyingAssignment(ass));
        // return;

        const baddies = [];
        const iter = this.solutionTracker.knownSolutions.keys();
        for (let ass = iter.next(); !ass.done; ass = iter.next()) {
            if (!this.constraints.allSatisfiedBy(ass.value)) baddies.push(ass.value);
        }

        if (baddies.length > 0) {
            console.log(`Pruning ${baddies.length} minefields. ${this.solutionTracker.knownSolutions.size - baddies.length} remain.`);
        }
        baddies.forEach(ass => this.solutionTracker.removeSolution(ass));
    }

    private testSuspiciousVariables() {
        const suspicious = this.solutionTracker.unseenVariableSettings();
        // Don't do anything yet
    }
}

export default Watcher;