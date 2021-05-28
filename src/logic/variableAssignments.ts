/**
 * This captures a collection of boolean variables assigned as you please to true and false.
 * There are a few convenience functions in here for manipulating these things.
 */
import {Constraint} from "./constraint";

export class VariableAssignments {
    public trues = new Set<number>();
    public falses = new Set<number>();

    public get count(): number {
        return this.trues.size + this.falses.size;
    };

    public known = (variable: number) => this.trues.has(variable) || this.falses.has(variable);

    public setTrue = (variable: number) => {
        if (this.falses.has(variable)) {
            throw new Error('Trying to set known false variable to true.')
        }
        this.trues.add(variable);
    }

    public setFalse = (variable: number) => {
        if (this.trues.has(variable)) {
            throw new Error('Trying to set known true variable to false.')
        }
        this.falses.add(variable);
    }

    public copy(): VariableAssignments {
        const ret = new VariableAssignments();
        this.trues.forEach(v => ret.trues.add(v));
        this.falses.forEach(v => ret.falses.add(v));
        return ret;
    }

    /**
     * Push all of the variables from other into this. Return true if everything is cool, false if a conflict was
     * found preventing the merger.
     * @param other
     */
    public mergeFrom(other: VariableAssignments): boolean {
        if (!this.consistentWith(other)) return false;

        let iter = other.falses.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            this.falses.add(i.value);
        }
        iter = other.trues.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            this.trues.add(i.value);
        }

        return true;
    }

    /**
     * Returns false if some variable in this and in requirements contradict each other, true if it is conceivable
     * that both this and requirements could hold.
     * @param requirements
     */
    public consistentWith(requirements: VariableAssignments) {
        let iter = requirements.falses.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            if (this.trues.has(i.value)) {
                return false;
            }
        }
        iter = requirements.trues.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            if (this.falses.has(i.value)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Invert all of the assignments in place and return itself.
     */
    public invertAssignments() {
        const swapper = this.trues;
        this.trues = this.falses;
        this.falses = swapper;
        return this;
    }
}

/**
 * A variable assignment with the last constraint remaining so we can smooth out all of the probability remaining in
 * it cleanly instead of sampling from it.
 */
export class AbbreviatedVariableAssignment {
    constructor(private variableAssignments: VariableAssignments, private lastConstraint: Constraint) {

    }

    /**
     * Get the actual probabilities under this partial assignment and throw them all into the passed functions.
     * @param addTrueSample Method to call to include trueness
     * @param addFalseSample Method to call to include falseness
     * @param constantFactor Multiply
     */
    public addSamples(addTrueSample: (variableNumber: number, probabilitySample: number) => void,
               addFalseSample: (variableNumber: number, probabilitySample: number) => void,
               constantFactor: number = 1) {
        this.variableAssignments.trues.forEach(v => addTrueSample(v, constantFactor));
        this.variableAssignments.falses.forEach(v => addFalseSample(v, constantFactor));
        // We distribute the probability equally for each variable in the last constraint instead of randomly sampling
        // solutions. We get a truer and smoother distribution this way.
        this.lastConstraint.vars.forEach(v => {
            addTrueSample(v, constantFactor * this.lastConstraint.trueCount / this.lastConstraint.size);
            addFalseSample(v, constantFactor * this.lastConstraint.falseCount / this.lastConstraint.size);
        });
    }

    /**
     * Get the actual probabilities under this partial assignment and subtract them all via the passed functions.
     * @param addTrueSample Method to call to include trueness
     * @param addFalseSample Method to call to include falseness
     */
    public removeSamples(addTrueSample: (variableNumber: number, probabilitySample: number) => void,
                  addFalseSample: (variableNumber: number, probabilitySample: number) => void) {
        this.addSamples(addTrueSample, addFalseSample, -1);
    }
}