import {VariableAssignments} from "../types";
import {BoardLoc} from "../boardLoc";

export class Constraint {

    constructor(public vars: number[], public trueCount: number, public location: BoardLoc | undefined = undefined) {
        vars.sort(((a, b) => a - b));
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

    public reduce(vars: VariableAssignments) {
        let changes = 0;
        for (let i = 0; i < this.size; i++) {
            const variable = this.vars[i];
            if (vars.trues.has(variable)) {
                changes += 1;
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
     * @param setTrue
     * @param setFalse
     */
    public tryEliminate(shorterConstraint: Constraint): number {
        // We try to use the right order, but whatever, this is fine.
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
     * of calls performed.
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

export class ConstraintSet {
    static readonly logSelfAfterConstraintIntro = true;

    public fixedVariables: VariableAssignments;
    private constraints: Constraint[] = [];
    private maxSize: number = 0;

    private disjointifyInferenceChangesMade: number = 0;
    private pigeonHoleTrueInferenceChangesMade: number = 0;
    private pigeonHoleFalseInferenceChangesMade: number = 0;
    private reWriteChangesMade: number = 0;
    private pruneChangesMade: number = 0;

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
            `Pigeon: ${this.pigeonHoleTrueInferenceChangesMade}/${this.pigeonHoleFalseInferenceChangesMade}, \n` +
            `ShortConstraintCount: ${shortConstraints}`;
    }


    public tryToBuildExtension(requirements: VariableAssignments): VariableAssignments | undefined {
        const toy = this.copy();
        // On failure to merge, we return undefined.
        if (!toy.fixedVariables.mergeFrom(requirements)) return undefined;
        try {
            const ret = toy.findRandomCompleteAssignment();
            return ret;
        } catch (e) {
            return undefined;
        }
    }

    //
    // public findRandomConsistentPartialAssignment(mustBeSet: Set<number>) {
    //     const toy = this.copy();
    //     const mustSet = Array.from(mustBeSet);
    //     // Peel off another variable.
    //     const randomVar = () => {
    //         if (mustSet.length === 0) return undefined;
    //         const loc = Math.floor(Math.random() * mustSet.length);
    //         const ret = mustSet[loc];
    //         mustSet[loc] = mustSet[mustSet.length - 1];
    //         mustSet.pop();
    //         return ret;
    //     }
    //
    //     let iterCount = 0;
    //     // If we set enough trues, we'll either fuck up and have an unsatisfiable set of constraints or we'll reduce
    //     // all of the constraints to trivially true and make them disappear.
    //     while (toy.constraints.length > 0) {
    //         iterCount += 1;
    //         if (iterCount > this.numVars + 10) {
    //             console.error(`Breaking out early from bad loop.`);
    //             console.log(toy.constraints);
    //             return undefined;
    //         }
    //
    //         // Put a mine in a random location.
    //         let nextvar = randomVar();
    //         if (nextvar === undefined) return toy.fixedVariables;
    //         while (toy.fixedVariables.known(nextvar)) {
    //             nextvar = randomVar();
    //             if (nextvar === undefined)
    //                 return toy.fixedVariables;
    //         }
    //
    //         if (Math.random() > .5) {
    //             toy.fixedVariables.setTrue(nextvar);
    //         } else {
    //             toy.fixedVariables.setFalse(nextvar);
    //         }
    //
    //         try {
    //             toy.doBasicInference();
    //         } catch (e) {
    //             // We produced a false constraint with our haphazard guessing.
    //             // console.log('Failed findRandomCompleteAssignment');
    //             return undefined;
    //         }
    //     }
    //     // We got here if we constructed a complete assignment.
    //     return toy.fixedVariables;
    // }

    public findRandomCompleteAssignment(): VariableAssignments | undefined {
        const toy = this.copy();

        let iterCount = 0;
        // If we set enough trues, we'll either fuck up and have an unsatisfiable set of constraints or we'll reduce
        // all of the constraints to trivially true and make them disappear.
        while (toy.size > 0) {
            iterCount += 1;
            if (iterCount > this.numVars + 10) {
                console.error(`Breaking out early from bad loop.`);
                return undefined;
            }

            // Pick a random constraint and satisfy it with whatever variable assignment.
            const randomConstraint = toy.randomConstraint();
            const newSettings = randomConstraint.randomSatisfyingAssignment();

            try {
                toy.fixedVariables.mergeFrom(newSettings);
                toy.inferenceLoop(false);
            } catch (e) {
                // We produced a false constraint with our haphazard guessing.
                return undefined;
            }
        }
        return toy.fixedVariables;
    }

    //
    // public consistentWith = (ass: VariableAssignments) => {
    //     let iter = this.fixedVariables.falses.entries();
    //     let next = iter.next();
    //     while (!next.done) {
    //         if (ass.trues.has(next.value[0])) {
    //             // console.log(ass.trues);
    //             // console.log(this.knownFalse);
    //             return false;
    //         }
    //         next = iter.next();
    //     }
    //
    //     iter = this.fixedVariables.trues.entries();
    //     next = iter.next();
    //     while (!next.done) {
    //         if (ass.falses.has(next.value[0])) {
    //             // console.log(ass.falses);
    //             // console.log(this.knownTrue);
    //             return false;
    //         }
    //         next = iter.next();
    //     }
    //
    //     return true;
    // }

    /**
     * Add new constraints and propagate some inferences into our fixedVariables
     * @param constraints
     */
    public introduceConstraints = (constraints: Constraint[]) => {
        for (let i = 0; i < constraints.length; i++) {
            constraints[i].reduce(this.fixedVariables);
        }
        this.constraints.push(...constraints);
        this.maxSize = Math.max(this.maxSize, this.size);

        // See if we can get any juice out of the new constraints.
        this.inferenceLoop(false);
        this.doPigeonHoleInference();
        this.inferenceLoop(false);

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
     * Get a random constraint, always preferring not-the-first, which is in practice just the
     * global minecount constraint.
     */
    private randomConstraint() {
        if (this.size === 1) return this.constraints[0];
        const index = 1 + Math.floor(Math.random() * (this.size - 1));
        return this.constraints[index];
    }

    // /**
    //  * Attempt to separate a pair of constraints from each other is the smaller one subtracts out.
    //  * This is done for all pairs, so it's relatively expensive.
    //  * This would be easier to do if we tracked neighbouring constraints.
    //  */
    // private doFancyInference(): number {
    //     let totalChanges = 0;
    //     for (let i = 0; i < this.size; i++) {
    //         for (let j = i + 1; j < this.size; j++) {
    //             totalChanges += this.constraints[i].tryEliminate(this.constraints[j]);
    //         }
    //     }
    //     this.disjointifyInferenceChangesMade += totalChanges;
    //     return totalChanges;
    // }

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
            changes += constraint.reduce(this.fixedVariables);
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
            if (constraint.isTrue()) {
                changes += 1;
                continue;
            }
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
            this.constraints = this.constraints.filter(c => !(c.isTrue() || c.isSimple()));
        }
        this.pruneChangesMade += changes;
        return changes;
    }

    //
    // private doBasicInference(): number {
    //     let totalChanges = 0;
    //     // Dummy value to make sure we run the loop at least once.
    //     let changes = 1;
    //     while (changes > 0) {
    //         changes = 0;
    //         // Reduce everything with our knowledge.
    //         changes += this.reWriteConstraints();
    //
    //         // If new trivials pop up, incorporate them.
    //         for (let i = 0; i < this.size; i++) {
    //             const c = this.constraints[i];
    //             if (c.isFalse()) {
    //                 throw new Error('Found false constraint. Bad.');
    //             }
    //             if (c.isSimple()) {
    //                 changes += c.propagateKnowledge(this.fixedVariables.setTrue, this.fixedVariables.setFalse);
    //             }
    //         }
    //
    //         // We throw away the true constraints because they are boring and empty.
    //         // We throw away the simple, because we've fully assimilated them.
    //         this.constraints = this.constraints.filter(c => !c.isTrue() && !c.isSimple())
    //         totalChanges += changes;
    //     }
    //     // console.log(`doBasicInference assigned ${totalChanges} locs.`);
    //     this.basicInferenceChangesMade += totalChanges;
    //     return totalChanges;
    // }

    private inferenceLoop(useSlowInferenceTechniques: boolean) {
        let totalChanges = 0;
        let needsReWrite = true;
        let needsPrune = true;
        // let needsFancy = true;
        let needsPigeonHole = true;
        while (needsPrune || needsReWrite || (useSlowInferenceTechniques && needsPigeonHole)) {
            if (needsPrune) {
                const varsAssignedPrePrune = this.fixedVariables.count;
                const changes = this.pruneTrivialConstraints();
                needsPrune = false;
                if (changes > 0) {
                    totalChanges += changes;
                    // needsFancy = true;
                    needsReWrite = (varsAssignedPrePrune !== this.fixedVariables.count);
                    needsPigeonHole = true;
                }
            }
            if (needsReWrite) {
                const changes = this.reWriteConstraints();
                needsReWrite = false;
                if (changes > 0) {
                    totalChanges += changes;
                    // needsFancy = true;
                    needsPrune = true;
                    needsPigeonHole = true;
                }
            }
            // if (useSlowInferenceTechniques && needsFancy) {
            //     const changes = this.doFancyInference();
            //     needsFancy = false;
            //     if (changes > 0) {
            //         totalChanges += changes;
            //         needsPrune = true;
            //         needsReWrite = true;
            //         needsPigeonHole = true;
            //     }
            // }
            if (useSlowInferenceTechniques && needsPigeonHole) {
                const varsAssignedPrePigeon = this.fixedVariables.count;
                const changes = this.doPigeonHoleInference();
                needsPigeonHole = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsPrune = true;
                    needsReWrite = (this.fixedVariables.count !== varsAssignedPrePigeon);
                    // needsFancy = true;
                }
            }
        }
        return totalChanges;
    }

    //
    // private doAllInference() {
    //     let total = 0;
    //     let changes = 1;
    //     while (changes > 0) {
    //         changes = this.doBasicInference();
    //         changes += this.doFancyInference();
    //         total += changes;
    //     }
    //     return total;
    // }

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
        // constraints.
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
