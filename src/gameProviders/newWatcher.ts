import {BoardLoc} from "../boardLoc";
import {DiagnosticInfo, FactualMineTestResult, FixedBoardMinesweeperConfig, SatisfyingAssignment} from "../types";

interface iWatcher {
    observe: (loc: BoardLoc, result: FactualMineTestResult) => void,
    diagnosticInfo: (loc: BoardLoc) => DiagnosticInfo,
}

class Constraint {
    public currentValue?: Constraint;

    constructor(public readonly vars: number[], public readonly trueCount: number) {
    }

    public reduce(trues: Set<number>, falses: Set<number>): Constraint {
        let newCount = this.trueCount;
        this.vars.forEach(loc => {
            if (trues.has(loc)) newCount--;
        });
        const newVars = this.vars.filter(loc => !trues.has(loc) && !falses.has(loc));
        this.currentValue = new Constraint(newVars, newCount);
        return this.currentValue;
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

    // If this constraint is trivial, call the passed functions on the known variable assignments, returning the number
    // of calls performed.
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

    public randomVariable(): number {
        console.assert(this.vars.length > 0);
        const index = Math.floor(Math.random() * this.vars.length);
        return this.vars[index];
    }
}

class ConstraintSet {
    public unknown = new Set<number>();
    public knownTrue = new Set<number>();
    public knownFalse = new Set<number>();
    private constraints: Constraint[] = [];

    constructor(private numVars: number) {
        for (let i = 0; i < numVars; i++) {
            this.unknown.add(numVars);
        }
    }

    public add(constraint: Constraint) {
        this.constraints.push(constraint);
        this.doBasicInference();
    }

    public findRandomSatisfyingAssignment(): SatisfyingAssignment | undefined {
        const toy = this.copy();

        let iterCount = 0;
        // If we set enough mines, we'll either fuck up and have an unsatisfiable set of constraints or we'll reduce
        // all of the constraints to trivially true and make them disappear.
        while (toy.constraints.length > 0) {
            iterCount += 1;
            if (iterCount > this.numVars + 10) {
                console.error(`Breaking out early.`);
                console.log(toy.constraints);
                return undefined;
            }
            // Pick a random constraint.
            const constraint = toy.constraints[Math.floor(Math.random() * toy.constraints.length)];
            // Put a mine in a random location.
            toy.knownTrue.add(constraint.randomVariable());
            try {
                toy.doBasicInference();
            } catch (e) {
                // We produced a false constraint with our haphazard guessing.
                // console.log('Failed findRandomSatisfyingAssignment');
                return undefined;
            }
        }
        return {
            mines: toy.knownTrue,
            empties: toy.knownFalse,
        };
    }

    private setTrue = (variable: number) => {
        console.assert(!this.knownFalse.has(variable));
        this.knownTrue.add(variable);
        this.unknown.delete(variable);
    }

    private setFalse = (loc: number) => {
        console.assert(!this.knownTrue.has(loc));
        this.knownFalse.add(loc);
        this.unknown.delete(loc);
    }

    private doBasicInference(): number {
        let totalchanges = 0;
        // Dummy value to make sure we run the loop at least once.
        let changes = 1;
        while (changes > 0) {
            changes = 0;
            // Reduce everything with our knowledge.
            this.constraints = this.constraints
                .map(c => c.reduce(this.knownTrue, this.knownFalse))
                .filter(c => !c.isTrue());

            // If new trivials pop up, incorporate them.
            for (let i = 0; i < this.constraints.length; i++) {
                const c = this.constraints[i];
                if (c.isFalse()) {
                    throw new Error('Found false constraint. Bad.');
                }
                if (c.isSimple()) {
                    changes += c.propagateKnowledge(this.setTrue, this.setFalse);
                }
            }
            totalchanges += changes;
        }
        // console.log(`doBasicInference assigned ${totalchanges} locs.`);
        return totalchanges;
    }

    private copy() {
        const ret = new ConstraintSet(this.numVars);
        ret.knownTrue = new Set<number>(this.knownTrue);
        ret.knownFalse = new Set<number>(this.knownFalse);
        ret.unknown = new Set<number>(this.unknown);
        ret.constraints = this.constraints.map(c => c.reduce(new Set(), new Set()));
        return ret;
    }

    consistentAssignment = (ass: SatisfyingAssignment) => {
        let iter = this.knownFalse.entries();
        let next = iter.next();
        while (!next.done) {
            if (ass.mines.has(next.value[0])) return false;
            next = iter.next();
        }

        iter = this.knownTrue.entries();
        next = iter.next();
        while (!next.done) {
            if (ass.empties.has(next.value[0])) return false;
            next = iter.next();
        }

        return true;
    }
}


class NewWatcher implements iWatcher {
    // private mines = new Set<number>();
    // private empties = new Set<number>();
    // private unknown = new Set<number>();
    // private constraints: Constraint[];
    private constraints: ConstraintSet;
    private randomSatisfyingAssignments: SatisfyingAssignment[];
    private visited = new Set<number>();


    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        const numVariables = config.size.height * config.size.width;
        this.constraints = new ConstraintSet(numVariables);
        this.randomSatisfyingAssignments = [];
        const nums = [];
        for (let i = 0; i < numVariables; i++) nums.push(i);

        // This is the global total mine count constraint.
        this.constraints.add(new Constraint(nums, config.mineCount));
    }

    public observe(loc: BoardLoc, result: FactualMineTestResult) {
        const locnum = loc.toNumber(this.config.size);
        this.visited.add(locnum);
        const neighbours = loc.neighboursOnBoard(this.config.size).map(loc => loc.toNumber(this.config.size));

        if (result.explodedMine) {
            console.log(`Watcher saw a BOOM.`);
            this.constraints.add(new Constraint([locnum], 1));
            return;
        }
        if (result.neighboursWithMine === undefined) {
            console.error(`Invalid FactualMineTestResult ${result}`);
            return;
        }

        // When we observe a visit, the first thing we learn is that there was no mine there.
        this.constraints.add(new Constraint([locnum], 0));
        // The second thing we learn is a new constraint imposed by the neighbour count.
        this.constraints.add(new Constraint(neighbours, result.neighboursWithMine));

        this.findRandomSatisfyingAssignments();
    }

    diagnosticInfo(loc: BoardLoc): DiagnosticInfo {
        const locnum = loc.toNumber(this.config.size);
        const prob = this.mineProbability(locnum);
        return {
            onFrontierAndUnknown: !this.visited.has(locnum),
            knownNonMine: this.constraints.knownFalse.has(locnum),
            knownMine: this.constraints.knownTrue.has(locnum),
            mineProbability: prob,
            couldBeAMine: prob === undefined || prob > 0,
        }
    }

    private findRandomSatisfyingAssignments() {
        this.pruneRandomSatisfyingAssignments();
        const attempts = 50;
        let failures = 0;
        let i = 0;
        for (i = 0; i < attempts && this.randomSatisfyingAssignments.length < 500; i++) {
            let ass = this.constraints.findRandomSatisfyingAssignment();
            if (ass === undefined) failures++;
            else this.randomSatisfyingAssignments.push(ass);
        }

        console.log(`Know ${this.randomSatisfyingAssignments.length} minefiends in ${i} tries.`);
    }

    private mineProbability(locnum: number) {
        if (this.randomSatisfyingAssignments.length > 0) {
            const mineCount = this.randomSatisfyingAssignments.filter(sa => sa.mines.has(locnum)).length;
            return mineCount / this.randomSatisfyingAssignments.length;
        }
    }

    private pruneRandomSatisfyingAssignments() {
        this.randomSatisfyingAssignments =
            this.randomSatisfyingAssignments.filter(this.constraints.consistentAssignment);
    }
}

export default NewWatcher;