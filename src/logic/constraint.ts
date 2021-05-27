import {BoardLoc} from "../boardLoc";
import {VariableAssignments} from "./variableAssignments";

/**
 * A single constraint identifying a collection of boolean variables and their known sum.
 */
export class Constraint {
    constructor(public vars: number[], public trueCount: number, public location: BoardLoc | undefined = undefined) {
        vars.sort(((a, b) => a - b));
    }

    get looksLikeXor(): boolean {
        // This constraint says that of 2 variables, one has to be true, the other false.
        return this.size === 2 && this.trueCount === 1;
    }

    public get falseCount(): number {
        return this.size - this.trueCount;
    }

    public get size(): number {
        return this.vars.length;
    }

    public toString(): string {
        return `Need ${this.trueCount} of ${this.vars.join(', ')}`;
    }

    public rewrite(vars: VariableAssignments) {
        let changes = 0;
        for (let i = 0; i < this.size; i++) {
            const variable = this.vars[i];
            if (vars.trues.has(variable)) {
                changes += 1;
                // Rewrite the total since we'll be removing this variable later.
                this.trueCount--;
            }
            if (vars.falses.has(variable)) {
                changes += 1;
            }
        }
        // If something is new, rewrite the variables of this constraint from scratch.
        if (changes > 0) this.vars = this.vars.filter(v => !vars.known(v));
        return changes;
    }

    /**
     * Try to subtract another constraint from ourselves.
     * @param shorterConstraint
     */
    public tryEliminate(shorterConstraint: Constraint): number {
        // We need to be the longer constraint for this to have any chance of succeeding.
        if (this.size < shorterConstraint.size) {
            return shorterConstraint.tryEliminate(this);
        }

        // Here we try to subtract a constraint out of ourself.
        if (shorterConstraint.vars.every(v => this.vars.includes(v))) {
            // console.log(`REDUCTION ${this}`);
            // console.log(`Reducing with ${shorterConstraint}`);
            this.vars = this.vars.filter(v => !shorterConstraint.vars.includes(v));
            this.trueCount -= shorterConstraint.trueCount;
            return 1;
        }
        return 0;
    }

    public isSimple() {
        return this.trueCount === 0 || this.falseCount === 0;
    }

    public isTrue() {
        return this.trueCount === 0 && this.falseCount === 0;
    }

    public isFalse() {
        return this.trueCount < 0 || this.falseCount < 0;
    }

    /**
     * If this constraint is trivial, call the passed functions on the known variable assignments, returning the number
     * of assignments made.
     */
    public propagateKnowledge(setTrue: (loc: number) => void, setFalse: (loc: number) => void): number {
        if (this.trueCount === 0) {
            this.vars.forEach(setFalse);
            return this.size;
        } else if (this.falseCount === 0) {
            this.vars.forEach(setTrue);
            return this.size;
        }
        return 0;
    }

    public madeTrueBy(variableAssignments: VariableAssignments) {
        return this.vars.filter(v => variableAssignments.trues.has(v)).length === this.trueCount;
    }

    //
    // public randomVariable(): number {
    //     console.assert(this.size > 0);
    //     const index = Math.floor(Math.random() * this.size);
    //     return this.vars[index];
    // }

    public randomSatisfyingAssignment(): VariableAssignments {
        // Maybe shuffle instead.
        // https://www.codementor.io/@alexanderswilliams/how-to-efficiently-generate-a-random-subset-150hbz3na4

        console.assert(!this.isFalse());
        if (this.isFalse()) {
            console.log(this.vars);
            console.log(this.trueCount);
        }

        // Pick out the right number of variables.
        const ret = new VariableAssignments();
        while (ret.trues.size < this.trueCount) {
            const randomIndex = Math.floor(Math.random() * this.size);
            ret.setTrue(this.vars[randomIndex]);
        }

        // Throw in the unassigned variables.
        for (let i = 0; i < this.size; i++) {
            const v = this.vars[i];
            if (!ret.trues.has(v)) {
                ret.setFalse(v);
            }
        }

        return ret;
    }

    public copy(): Constraint {
        return new Constraint([...this.vars], this.trueCount, this.location);
    }

}