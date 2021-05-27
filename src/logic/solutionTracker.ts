import {VariableAssignments} from "./variableAssignments";

export class SolutionTracker {
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


    public removeSolutions(baddies: VariableAssignments[]) {
        baddies.forEach(this.removeSolution);
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

    public findKnownSolutionConsistentWith(requirements: VariableAssignments): VariableAssignments | undefined {
        // Some early rejection criteria.
        if (Array.from(requirements.trues).some(v => this.timesMineInSolutions[v] === 0)) return undefined;
        if (Array.from(requirements.falses).some(v => this.timesEmptyInSolutions[v] === 0)) return undefined;

        const iter = this.knownSolutions.keys();
        for (let ass = iter.next(); !ass.done; ass = iter.next()) {
            const assignment = ass.value;
            if (assignment.consistentWith(requirements)) return assignment;
        }
    }

    private removeSolution = (solution: VariableAssignments) => {
        console.assert(this.knownSolutions.has(solution));
        this.knownSolutions.delete(solution);
        solution.trues.forEach(loc => this.timesMineInSolutions[loc]--);
        solution.falses.forEach(loc => this.timesEmptyInSolutions[loc]--);
    }

}