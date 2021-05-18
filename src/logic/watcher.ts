import {BoardLoc} from "../boardLoc";
import {
    DiagnosticInfo,
    FactualMineTestResult,
    FixedBoardMinesweeperConfig,
    iWatcher,
    VariableAssignments
} from "../types";
import {Constraint, ConstraintSet} from "./constraints";

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

    public locationKnownToBeFlexible(loc : number) {
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

}

class Watcher implements iWatcher {
    private constraints: ConstraintSet;
    private solutionTracker: SolutionTracker;
    private visited = new Set<number>();
    private frontier = new Set<number>();
    private successRandomSatisfyingAssignment: number = 0;
    private attemptedRandomSatisfyingAssignment: number = 0;

    constructor(public readonly config: FixedBoardMinesweeperConfig,
                public readonly maintainedFutures = 0,
                public readonly futureReadsPerMove = 0
    ) {
        const numVariables = config.size.height * config.size.width;
        this.constraints = new ConstraintSet(numVariables);
        this.solutionTracker = new SolutionTracker(numVariables);

        const nums = [];
        for (let i = 0; i < numVariables; i++) {
            nums.push(i);
        }

        // This is the global total mine count constraint.
        this.constraints.introduceConstraint(new Constraint(nums, config.mineCount));
    }

    public observe(loc: BoardLoc, result: FactualMineTestResult) {
        const locnum = loc.toNumber(this.config.size);
        this.visited.add(locnum);
        this.frontier.delete(locnum);
        const neighbours = loc.neighboursOnBoard(this.config.size).map(loc => loc.toNumber(this.config.size));
        neighbours.forEach(nloc => {
            if (!this.visited.has(nloc))
                this.frontier.add(nloc)
        });

        if (result.explodedMine) {
            console.log(`Watcher saw a BOOM.`);
            this.constraints.fixedVariables.setTrue(locnum);
            return;
        }
        if (result.neighboursWithMine === undefined) {
            console.error(`Invalid FactualMineTestResult ${result}`);
            return;
        }

        // When we observe a visit, the first thing we learn is that there was no mine there.
        // The second thing we learn is a new constraint imposed by the neighbour count.
        this.constraints.fixedVariables.setFalse(locnum);
        this.constraints.introduceConstraint(new Constraint(neighbours, result.neighboursWithMine));

        this.pruneSolutions();
        this.findAndStoreContinuations();
        // setImmediate(this.findAndStoreContinuations);
    }

    public diagnosticInfo(loc: BoardLoc): DiagnosticInfo {
        const locnum = loc.toNumber(this.config.size);
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

    findGameExtension(requirements: VariableAssignments): VariableAssignments | undefined {
        return this.constraints.tryToFindExtension(requirements);
    }

    private findAndStoreContinuations = () => {
        let learnedSomething = false;

        if (this.solutionTracker.size >= this.maintainedFutures) return;

        let i = 0
        for (i = 0; i < this.futureReadsPerMove && this.solutionTracker.size < this.maintainedFutures; i++) {
            this.attemptedRandomSatisfyingAssignment++;
            // let ass = this.constraints.findRandomConsistentPartialAssignment(this.frontier);
            let ass = this.constraints.findRandomCompleteAssignment();
            if (ass) {
                this.solutionTracker.addSolution(ass);
                learnedSomething = true;
                this.successRandomSatisfyingAssignment++;
            }
        }

        // setImmediate(this.findAndStoreContinuations);
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
            console.log(`Removing ${baddies.length} assignments.`);
        }
        baddies.forEach(ass => this.solutionTracker.removeSolution(ass));
    }


}

export default Watcher;