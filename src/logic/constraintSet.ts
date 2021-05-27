import {Constraint} from "./constraint";
import {VariableAssignments} from "./variableAssignments";

/**
 * A set of constraints that we can perform sound inferences on and add additional constraints to.
 */
export class ConstraintSet {
    static readonly logSelfAfterConstraintIntro = false;

    public fixedVariables: VariableAssignments;
    private constraints: Constraint[] = [];

    // A few fields to track how much progress is being made.
    private maxSize: number = 0;
    private disjointifyInferenceChangesMade: number = 0;
    private pigeonHoleTrueInferenceChangesMade: number = 0;
    private pigeonHoleFalseInferenceChangesMade: number = 0;
    private reWriteChangesMade: number = 0;
    private pruneChangesMade: number = 0;
    private failedSimpleAssumptionChangesMade: number = 0;

    constructor(private numVars: number) {
        this.fixedVariables = new VariableAssignments();
    }

    public get size(): number {
        return this.constraints.length;
    }

    public toString(): string {
        let shortConstraints = 0;
        for (let i = 0; i < this.size; i++) {
            if (this.constraints[i].size <= 2) {
                shortConstraints++;
            }
        }
        return `ConstraintSet with ${this.size} constraints, was max ${this.maxSize}. ` +
            `ReWrites: ${this.reWriteChangesMade}, ` +
            `Prunes: ${this.pruneChangesMade}, ` +
            `Disjointify: ${this.disjointifyInferenceChangesMade}, ` +
            `BadGuess: ${this.failedSimpleAssumptionChangesMade}, ` +
            `Pigeon: ${this.pigeonHoleTrueInferenceChangesMade}/${this.pigeonHoleFalseInferenceChangesMade}, \n` +
            `ShortConstraintCount: ${shortConstraints}`;
    }


    public tryToBuildExtension(requirements: VariableAssignments): VariableAssignments | undefined {
        const toy = this.copy();
        // On failure to merge, we return undefined.
        if (!toy.fixedVariables.mergeFrom(requirements)) return undefined;
        try {
            return toy.findRandomCompleteAssignment();
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Build an assignment (minefield) satisfying these constraints.
     * All of our probability measurement is based on this routine succeeding sufficiently frequently.
     */
    public findRandomCompleteAssignment(): VariableAssignments | undefined {
        const toy = this.copy();
        let fixedConstraintCount = 0;

        // If we set enough trues, we'll either fuck up and have an unsatisfiable set of constraints or we'll reduce
        // all of the constraints to trivially true and make them disappear.
        while (toy.size > 0) {
            // Pick a random constraint and satisfy it with whatever variable assignment.
            const randomConstraint = toy.randomConstraint();
            const newSettings = randomConstraint.randomSatisfyingAssignment();
            fixedConstraintCount++;

            try {
                toy.fixedVariables.mergeFrom(newSettings);
                toy.inferenceLoop(false);
            } catch (e) {
                // We produced a false contradiction with our haphazard guessing.
                // If we know we had failed quickly enough (after a single variable assignment) then we could
                // use this failure to learn in the outer context. Actually, this is easy to do and free learning.
                if (fixedConstraintCount === 1 && randomConstraint.looksLikeXor) {
                    // If we're here, we made a bad guess and immediately found a contradiction. There is only
                    // alternative to the xor constraint we chose, so we can infer it must hold in the original
                    // constraint system we're looking to satisfy.

                    // HAHAHA, in practice this never runs, even if we use the heavier inference loop in this function.
                    // Maybe it's covered by by pigeonhole, or maybe we just don't end up with many xor-like
                    // constraints. I was thinking of implementing some bipartite graph logic for xor-like constraints
                    // and treating them specially, like so we could resolve "wires" quicker. Total waste of effort,
                    // nevermind that.
                    this.failedSimpleAssumptionChangesMade++;
                    console.log(`BUSTED ON CONSTRAINT ${randomConstraint.toString()}`);
                    this.fixedVariables.mergeFrom(newSettings.invertAssignments());
                }

                return undefined;
            }
        }
        return toy.fixedVariables;
    }

    /**
     * Add new constraints and propagate some inferences into our fixedVariables
     * @param constraints
     */
    public introduceConstraints = (constraints: Constraint[]) => {
        // for (let i = 0; i < constraints.length; i++) {
        //     constraints[i].rewrite(this.fixedVariables);
        // }
        this.constraints.push(...constraints);
        this.maxSize = Math.max(this.maxSize, this.size);

        // See if we can get any juice out of the new constraints.
        this.inferenceLoop(true);

        // Report on how we're doing.
        if (ConstraintSet.logSelfAfterConstraintIntro) {
            console.log(this.toString());
        }
    };

    /**
     * Is the set of constraints represented by this consistent with the proposed variable assignments?
     * @param variableAssignments
     */
    public allSatisfiedBy(variableAssignments: VariableAssignments): boolean {
        // We can't already know that some setting was wrong.
        if (!variableAssignments.mergeFrom(this.fixedVariables)) return false;
        // Every constraint has to be satisfied exactly.
        return this.constraints.every(c => c.madeTrueBy(variableAssignments));
    }

    /**
     * Get a random constraint, always preferring not-the-first, which is in practice always the
     * global minecount constraint.
     */
    private randomConstraint() {
        if (this.size === 1) return this.constraints[0];
        const index = 1 + Math.floor(Math.random() * (this.size - 1));
        return this.constraints[index];
    }

    /**
     * Attempt to separate a pair of constraints from each other is the smaller one subtracts out.
     * This is done for all pairs, so it's relatively expensive.
     * This would be easier to do if we tracked neighbouring constraints.
     */
    private doPigeonHoleInference(): number {
        let totalChanges = 0;
        for (let i = 0; i < this.size; i++) {
            for (let j = i + 1; j < this.size; j++) {
                const c1 = this.constraints[i];
                const c2 = this.constraints[j];
                // We store the location with the constraints just so we can do this shortcutting step.
                // Here we don't bother investigating constraint pairs that have no chance of having a common
                // variable due to their origin on a minesweeper board.
                if (!c1.location || !c2.location || c2.location.near(c2.location))
                    totalChanges += this.tryPigeonHole(c1, c2);
            }
        }
        return totalChanges;
    }

    /**
     * Rewrite every constraint using our current fixedVariables.
     */
    private reWriteConstraints(): number {
        let changes = 0;
        for (let i = 0; i < this.size; i++) {
            const constraint = this.constraints[i];
            changes += constraint.rewrite(this.fixedVariables);
        }
        this.reWriteChangesMade += changes;
        return changes;
    }

    /**
     * Prune out constraint list, possibly throwing an error if we find a false constraint.
     */
    private pruneTrivialConstraints(): number {
        let changes = 0;
        for (let i = 0; i < this.size; i++) {
            const constraint = this.constraints[i];
            if (constraint.isFalse()) {
                throw new Error('Found false constraint. Bad.');
            }
            if (constraint.isSimple()) {
                changes += 1;
                constraint.propagateKnowledge(this.fixedVariables.setTrue, this.fixedVariables.setFalse);
            }
            // Nothing interesting happened.
        }
        if (changes) {
            this.constraints = this.constraints.filter(c => !c.isSimple());
        }
        this.pruneChangesMade += changes;
        return changes;
    }

    private inferenceLoop(useSlowInferenceTechniques: boolean) {
        // TODO: Maybe testing single-variable assignments for contradictions in here would be efficient enough and
        //  give us enough new knowledge to be worthwhile.
        let totalChanges = 0;
        let needsReWrite = true;
        let needsPrune = true;
        let needsPigeonHole = true;
        while (needsPrune || needsReWrite || (useSlowInferenceTechniques && needsPigeonHole)) {
            if (needsReWrite) {
                const changes = this.reWriteConstraints();
                needsReWrite = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsPrune = true;
                    needsPigeonHole = true;
                }
            }
            if (needsPrune) {
                const changes = this.pruneTrivialConstraints();
                needsPrune = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsReWrite = true;
                    needsPigeonHole = true;
                }
            }
            if (useSlowInferenceTechniques && needsPigeonHole) {
                const changes = this.doPigeonHoleInference();
                needsPigeonHole = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsPrune = true;
                    needsReWrite = true;
                }
            }
        }
        return totalChanges;
    }

    private copy() {
        const ret = new ConstraintSet(this.numVars);
        ret.fixedVariables = this.fixedVariables.copy();
        ret.constraints = this.constraints.map(c => c.copy());
        return ret;
    }

    private tryPigeonHole(x: Constraint, y: Constraint): number {
        let intersectionVars = x.vars.filter(v => y.vars.includes(v));
        if (intersectionVars.length === 0) {
            return 0;
        }

        let changes = 0;

        // If the intersection is the whole of one of the constraints, we can just transform them into disjoint
        // constraints. This is just subtracting one constraint from the other. We don't gain or lose knowledge, but
        // now our constraints are more independent. This mostly happens to the global minecount constraint.
        let xOnlyVars = x.vars.filter(v => !y.vars.includes(v));
        let yOnlyVars = y.vars.filter(v => !x.vars.includes(v));
        if (xOnlyVars.length === 0 || yOnlyVars.length === 0) {
            const result = x.tryEliminate(y);
            if (result !== 0) {
                this.disjointifyInferenceChangesMade += result;
                return 1;
            }

            console.log(`not eliminable, oddly`);
            console.log(x.toString());
            console.log(y.toString());
        }

        let intersectionMinTrues = Math.max(x.trueCount - xOnlyVars.length, y.trueCount - yOnlyVars.length);
        let intersectionMinFalses = Math.max(x.falseCount - xOnlyVars.length, y.falseCount - yOnlyVars.length);

        // If the intersection already satisfies either the number of trues or falses that we need for a constraint,
        // we can immediately infer the settings for its variables outside the intersection.
        if (intersectionMinTrues === x.trueCount) {
            xOnlyVars.forEach(this.fixedVariables.setFalse);
            this.pigeonHoleTrueInferenceChangesMade += xOnlyVars.length;
            changes += xOnlyVars.length;
        }
        if (intersectionMinTrues === y.trueCount) {
            yOnlyVars.forEach(this.fixedVariables.setFalse);
            this.pigeonHoleTrueInferenceChangesMade += yOnlyVars.length;
            changes += yOnlyVars.length;
        }

        if (intersectionMinFalses === x.falseCount) {
            xOnlyVars.forEach(this.fixedVariables.setTrue);
            this.pigeonHoleFalseInferenceChangesMade += xOnlyVars.length;
            changes += xOnlyVars.length;
        }
        if (intersectionMinFalses === y.falseCount) {
            yOnlyVars.forEach(this.fixedVariables.setTrue);
            this.pigeonHoleFalseInferenceChangesMade += yOnlyVars.length;
            changes += yOnlyVars.length;
        }

        return changes;
    }
}
