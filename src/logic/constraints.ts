import {VariableAssignments} from "../types";

export class Constraint {

    constructor(public vars: number[], public trueCount: number) {
        vars.sort(((a, b) => a-b));
    }

    public toString(): string {
        return `Need ${this.trueCount} of ${this.vars.join(', ')}`;
    }

    public reduce(vars: VariableAssignments) {
        let changes = 0;
        for (let i = 0; i < this.vars.length; i++) {
            const variable = this.vars[i];
            if (vars.trues.has(variable)) {
                changes += 1;
                this.trueCount--;
            }
            if (vars.falses.has(variable)) {
                changes += 1;
            }
        }
        if (changes > 0) this.vars = this.vars.filter(v => !vars.known(v));
        return changes;
    }

    /**
     * Try to subtract another constraint from ourselves.
     * @param shorterConstraint
     */
    public tryEliminate(shorterConstraint: Constraint): number {
        // We try to use the right order, but whatever, this is fine.
        if (this.vars.length < shorterConstraint.vars.length) {
            return shorterConstraint.tryEliminate(this);
        }
        // Here we try to subtract a constraint out of ourself.
        if (shorterConstraint.vars.every(v => this.vars.includes(v))) {
            console.log(`REDUCTION ${this}`);
            console.log(`Reducing with ${shorterConstraint}`);
            this.vars = this.vars.filter(v => !shorterConstraint.vars.includes(v));
            this.trueCount -= shorterConstraint.trueCount;
            return 1;
        }
        return 0;
    }

    public isSimple() {
        return this.vars.length === this.trueCount || this.trueCount === 0;
    }

    public isTrue() {
        return this.vars.length === 0 && this.trueCount === 0;
    }

    public isFalse() {
        return this.trueCount < 0 || this.trueCount > this.vars.length;
    }

    /**
     * If this constraint is trivial, call the passed functions on the known variable assignments, returning the number
     * of calls performed.
     */
    public propagateKnowledge(setTrue: (loc: number) => void, setFalse: (loc: number) => void): number {
        if (this.trueCount === 0) {
            this.vars.forEach(setFalse);
            return this.vars.length;
        } else if (this.trueCount === this.vars.length) {
            this.vars.forEach(setTrue);
            return this.vars.length;
        }
        return 0;
    }

    public madeTrueBy(variableAssignments: VariableAssignments) {
        return this.vars.filter(v => variableAssignments.trues.has(v)).length === this.trueCount;
    }

    public randomVariable(): number {
        console.assert(this.vars.length > 0);
        const index = Math.floor(Math.random() * this.vars.length);
        return this.vars[index];
    }

    public randomSatisfyingAssignment(): VariableAssignments {
        // Maybe shuffle instead.
        // https://www.codementor.io/@alexanderswilliams/how-to-efficiently-generate-a-random-subset-150hbz3na4

        const ret = new VariableAssignments();

        console.assert(!this.isFalse());
        if (this.isFalse()) {
            console.log(this.vars);
            console.log(this.trueCount);
        }
        // Pick out the right number of variables.
        while (ret.trues.size < this.trueCount) {
            const randomIndex = Math.floor(Math.random() * this.vars.length);
            ret.setTrue(this.vars[randomIndex]);
        }
        // Throw in the unassigned variables.
        this.vars.forEach(v => {
            if (!ret.trues.has(v)) ret.setFalse(v);
        })

        return ret;
    }

    public copy(): Constraint {
        return new Constraint([...this.vars], this.trueCount);
    }
}

export class ConstraintSet {
    static readonly logSelfAfterConstraintIntro = true;

    public fixedVariables: VariableAssignments;
    private constraints: Constraint[] = [];
    private maxConstraints: number = 0;

    private fancyInferenceChangesMade: number = 0;
    private reWriteChangesMade: number = 0;
    private pruneChangesMade: number = 0;

    constructor(private numVars: number) {
        this.fixedVariables = new VariableAssignments();
    }

    public toString(): string {
        return `ConstraintSet with ${this.constraints.length} constraints, was max ${this.maxConstraints}. ` +
            `ReWrites: ${this.reWriteChangesMade}, ` +
            `Prunes: ${this.pruneTrivialConstraints()}, ` +
            `Fancy: ${this.fancyInferenceChangesMade}.`;
    }


    public tryToFindExtension(requirements: VariableAssignments): VariableAssignments | undefined {
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
        while (toy.constraints.length > 0) {
            iterCount += 1;
            if (iterCount > this.numVars + 10) {
                console.error(`Breaking out early from bad loop.`);
                // console.log(toy.constraints);
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

    public introduceConstraint = (constraint: Constraint) => {
        constraint.reduce(this.fixedVariables);
        this.constraints.push(constraint);
        this.maxConstraints = Math.max(this.maxConstraints, this.constraints.length);

        // See if we can get any juice out of the new constraint.
        this.inferenceLoop(true);

        // Report on how we're doing.
        if (ConstraintSet.logSelfAfterConstraintIntro) {
            console.log(this.toString());
        }
    };

    /**
     * Get a random constraint, always preferring not-the-first, which is in practice just the global constraint.
     */
    private randomConstraint() {
        if (this.constraints.length === 1) return this.constraints[0];
        const index = 1 + Math.floor(Math.random() * (this.constraints.length - 1));
        return this.constraints[index];
    }


    /**
     * Attempt to eliminate one small constraint from a larger one.
     */
    private doFancyInference(): number {
        let totalChanges = 0;
        for (let i = 0; i < this.constraints.length; i++) {
            for (let j = i + 1; j < this.constraints.length; j++) {
                totalChanges += this.constraints[i].tryEliminate(this.constraints[j]);
            }
        }
        this.fancyInferenceChangesMade += totalChanges;
        return totalChanges;
    }

    /**
     * Rewrite every constraint using our current fixedVariables.
     */
    private reWriteConstraints(): number {
        let changes = 0;
        for (let i = 0; i < this.constraints.length; i++) {
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
        let changes = this.constraints.length;
        for (let i = 0; i < this.constraints.length; i++) {
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

    private inferenceLoop(useFancyInference : boolean) {
        let totalChanges = 0;
        let needsReWrite = true;
        let needsPrune = true;
        let needsFancy = true;
        while (needsPrune || needsReWrite || (useFancyInference && needsFancy)) {
            if (needsPrune) {
                const changes = this.pruneTrivialConstraints();
                needsPrune = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsFancy = true;
                    needsReWrite = true;
                }
            }
            if (needsReWrite) {
                const changes = this.reWriteConstraints();
                needsReWrite = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsFancy = true;
                    needsPrune = true;
                }
            }
            if (useFancyInference && needsFancy) {
                const changes = this.doFancyInference();
                needsFancy = false;
                if (changes > 0) {
                    totalChanges += changes;
                    needsPrune = true;
                    needsReWrite = true;
                }
            }
        }
        return totalChanges;
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
    //         for (let i = 0; i < this.constraints.length; i++) {
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

    private copy() {
        const ret = new ConstraintSet(this.numVars);
        ret.fixedVariables = this.fixedVariables.copy();
        ret.constraints = this.constraints.map(c => c.copy());
        return ret;
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

    allSatisfiedBy(variableAssignments: VariableAssignments) : boolean {
        // We can't already know that some setting was wrong.
        if (!variableAssignments.mergeFrom(this.fixedVariables)) return false;
        // Every constraint has to be satisfied exactly.
        return this.constraints.every(c => c.madeTrueBy(variableAssignments));
    }
}

// export class ConstraintSet2 {
//     public fixedVariables: VariableAssignments;
//     private constraints: Constraint[] = [];
//     private variableAdjacency: number[][] = [];
//
//     constructor(private numVars: number) {
//         this.fixedVariables = new VariableAssignments();
//         for(let i = 0; i < numVars; i++) {
//             this.variableAdjacency.push([]);
//         }
//     }
//
//     private introduceConstraint = (constraint : Constraint) => {
//         constraint.reduce(this.fixedVariables);
//         const constraintNum = this.constraints.length;
//         this.constraints.push(constraint);
//         constraint.vars.forEach(fsldjhflsjflksjfd)
//     };
//
//     public introduceConstraints(constraints: Constraint[]) {
//         constraints.forEach(this.introduceConstraint);
//         this.doBasicInference();
//         console.log(`There are currently ${this.constraints.length} constraints.`);
//     }
//
//     tryToFindExtension(requirements: VariableAssignments): VariableAssignments | undefined {
//         const toy = this.copy();
//         // On failure to merge, we return undefined.
//         if (!toy.fixedVariables.mergeFrom(requirements)) return undefined;
//         try {
//             const ret = toy.findRandomCompleteAssignment();
//             return ret;
//         } catch (e) {
//             return undefined;
//         }
//     }
//
//     findRandomConsistentPartialAssignment(mustBeSet: Set<number>) {
//         const toy = this.copy();
//         const mustSet = Array.from(mustBeSet);
//         // Peel off another variable.
//         const randomVar = () => {
//             if (mustSet.length === 0) return undefined;
//             const loc = Math.floor(Math.random() * mustSet.length);
//             const ret = mustSet[loc];
//             mustSet[loc] = mustSet[mustSet.length - 1];
//             mustSet.pop();
//             return ret;
//         }
//
//         let iterCount = 0;
//         // If we set enough trues, we'll either fuck up and have an unsatisfiable set of constraints or we'll reduce
//         // all of the constraints to trivially true and make them disappear.
//         while (toy.constraints.length > 0) {
//             iterCount += 1;
//             if (iterCount > this.numVars + 10) {
//                 console.error(`Breaking out early from bad loop.`);
//                 console.log(toy.constraints);
//                 return undefined;
//             }
//
//             // Put a mine in a random location.
//             let nextvar = randomVar();
//             if (nextvar === undefined) return toy.fixedVariables;
//             while (toy.fixedVariables.known(nextvar)) {
//                 nextvar = randomVar();
//                 if (nextvar === undefined)
//                     return toy.fixedVariables;
//             }
//
//             if (Math.random() > .5) {
//                 toy.fixedVariables.setTrue(nextvar);
//             } else {
//                 toy.fixedVariables.setFalse(nextvar);
//             }
//
//             try {
//                 toy.doBasicInference();
//             } catch (e) {
//                 // We produced a false constraint with our haphazard guessing.
//                 // console.log('Failed findRandomCompleteAssignment');
//                 return undefined;
//             }
//         }
//         // We got here if we constructed a complete assignment.
//         return toy.fixedVariables;
//     }
//
//     public findRandomCompleteAssignment(): VariableAssignments | undefined {
//         const toy = this.copy();
//
//         toy.doBasicInference();
//
//         let iterCount = 0;
//         // If we set enough trues, we'll either fuck up and have an unsatisfiable set of constraints or we'll reduce
//         // all of the constraints to trivially true and make them disappear.
//         while (toy.constraints.length > 0) {
//             iterCount += 1;
//             if (iterCount > this.numVars + 10) {
//                 console.error(`Breaking out early from bad loop.`);
//                 console.log(toy.constraints);
//                 return undefined;
//             }
//
//             // Pick a random constraint and satisfy it with whatever variable assignment.
//             const randomConstraint = toy.randomConstraint();
//             const newSettings = randomConstraint.randomSatisfyingAssignment();
//
//             try {
//                 toy.fixedVariables.mergeFrom(newSettings);
//                 toy.doBasicInference();
//             } catch (e) {
//                 // We produced a false constraint with our haphazard guessing.
//                 // console.log('Failed findRandomCompleteAssignment');
//                 return undefined;
//             }
//         }
//         return toy.fixedVariables;
//     }
//
//     consistentWith = (ass: VariableAssignments) => {
//         let iter = this.fixedVariables.falses.entries();
//         let next = iter.next();
//         while (!next.done) {
//             if (ass.trues.has(next.value[0])) {
//                 // console.log(ass.trues);
//                 // console.log(this.knownFalse);
//                 return false;
//             }
//             next = iter.next();
//         }
//
//         iter = this.fixedVariables.trues.entries();
//         next = iter.next();
//         while (!next.done) {
//             if (ass.falses.has(next.value[0])) {
//                 // console.log(ass.falses);
//                 // console.log(this.knownTrue);
//                 return false;
//             }
//             next = iter.next();
//         }
//
//         return true;
//     }
//
//     /**
//      * Get a random constraint, always preferring not-the-first, which is in practice just the global constraint.
//      */
//     private randomConstraint() {
//         if (this.constraints.length === 1) return this.constraints[0];
//         const index = 1 + Math.floor(Math.random() * (this.constraints.length - 1));
//         return this.constraints[index];
//     }
//
//     private doBasicInference(): number {
//         let totalchanges = 0;
//         // Dummy value to make sure we run the loop at least once.
//         let changes = 1;
//         while (changes > 0) {
//             changes = 0;
//             // Reduce everything with our knowledge.
//             this.constraints.forEach(c => c.reduce(this.fixedVariables));
//
//             // If new trivials pop up, incorporate them.
//             for (let i = 0; i < this.constraints.length; i++) {
//                 const c = this.constraints[i];
//                 if (c.isFalse()) {
//                     throw new Error('Found false constraint. Bad.');
//                 }
//                 if (c.isSimple()) {
//                     changes += c.propagateKnowledge(this.fixedVariables.setTrue, this.fixedVariables.setFalse);
//                 }
//             }
//
//             // We throw away the true constraints because they are boring and empty.
//             // We throw away the simple, because we've fully assimilated them.
//             this.constraints = this.constraints.filter(c => !c.isTrue() && !c.isSimple())
//             totalchanges += changes;
//         }
//         // console.log(`doBasicInference assigned ${totalchanges} locs.`);
//         return totalchanges;
//     }
//
//     private copy() {
//         const ret = new ConstraintSet(this.numVars);
//         ret.fixedVariables = this.fixedVariables.copy();
//         ret.constraints = this.constraints.map(c => c.copy());
//         return ret;
//     }
// }
