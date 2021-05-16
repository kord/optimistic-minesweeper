import {BoardLoc} from "./boardLoc";
import {FactualMineTestResult, FixedBoardMinesweeperConfig, NeighbourhoodReport} from "./gameProviders/gameProvider";
import {FrontierKnowledge} from "./gameProviders/frontierKnowledge";

export class Watcher {
    private frontier: FrontierKnowledge;
    private results: Map<number, FactualMineTestResult>;
    private needsInvestigation: Set<number>;
    private satisfyingAssignments: Set<number>[];

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        this.frontier = new FrontierKnowledge(config.size);
        this.results = new Map<number, FactualMineTestResult>()
        this.needsInvestigation = new Set<number>();
        this.satisfyingAssignments = [];
    }

    private get size() {
        return this.config.size
    }

    private get naiveMineProbability(): number {
        return this.config.mineCount / (this.config.size.width * this.config.size.height);
    }

    public observe(loc: BoardLoc, result: FactualMineTestResult) {
        const locnum = loc.toNumber(this.size);
        console.assert(!this.results.has(locnum));

        this.results.set(locnum, result);

        const neighbours = loc.neighbourhoodIncludingSelf(this.size);
        neighbours.forEach(this.frontier.introduce);
        this.frontier.remove(loc);

        if (result.explodedMine) {
            console.log('Watcher saw an explosion.')
            return;
        }

        this.assignInvestigationOfNeighbourhood(loc);
        this.attemptSimpleInference();
        this.randomRollouts();

    }

    diagnosticInfo(loc: BoardLoc): DiagnosticInfo {
        let mineProbability = undefined;
        const onFrontierAndUnknown = this.frontier.onFrontierAndUnknown(loc);
        const locnum = loc.toNumber(this.size);
        if (onFrontierAndUnknown && this.satisfyingAssignments.length > 0) {
            const mineTimes = this.satisfyingAssignments.filter(ass => ass.has(locnum)).length;
            mineProbability =  mineTimes / this.satisfyingAssignments.length;
        }
        return {
            knownMine: this.frontier.isRequiredMine(loc),
            knownNonMine: this.frontier.isRequiredEmpty(loc),
            onFrontierAndUnknown: onFrontierAndUnknown,
            mineProbability: mineProbability,
        }
    }

    private neighbourhoodReport = (loc: number) => {
        const neighbours = BoardLoc.fromNumber(loc, this.size).neighboursOnBoard(this.size);
        const neighbourNums = neighbours.map(loc => loc.toNumber(this.size));

        const visited = neighbourNums.filter(loc => this.results.has(loc)).map(loc => BoardLoc.fromNumber(loc, this.size));
        const unvisited = neighbourNums.filter(loc => !this.results.has(loc)).map(loc => BoardLoc.fromNumber(loc, this.size));

        const knownMines = neighbours.filter(loc => this.frontier.isRequiredMine(loc));
        const knownNonMines = neighbours.filter(loc => this.frontier.isRequiredEmpty(loc));
        const unvisitedAndUnknown = unvisited.filter(loc => this.frontier.onFrontierAndUnknown(loc));

        return {
            neighbours: neighbours,
            visited: visited,
            unvisited: unvisited,

            unvisitedAndUnknown: unvisitedAndUnknown,
            knownMines: knownMines,
            knownNonMines: knownNonMines,

        } as NeighbourhoodReport;
    }

    private attemptSimpleInference(): WorkReport {
        const wr: WorkReport = {checks: 0, assignments: 0,};
        while (this.needsInvestigation.size > 0) {
            const loc = this.nextInvestigation();
            if (loc === undefined) continue;
            wr.checks++;
            const vr = this.results.get(loc);
            // We can only do useful work here if the loc has been visited.
            if (!vr) continue;

            let reportedMineNeighbours = vr.neighboursWithMine;
            if (reportedMineNeighbours === undefined) continue;
            const nr = this.neighbourhoodReport(loc);


            const neededMines = reportedMineNeighbours - nr.knownMines.length;
            if (neededMines < 0) {
                console.error(`Too many mines inferred`);
                console.error(loc);
                console.error(vr);
                console.error(nr);
            }

            let newlySet = 0;
            if (neededMines === 0) {
                // All unvisited unknowns are non-mines
                newlySet = this.frontier.setAllEmpty(nr.unvisitedAndUnknown);
            }
            if (neededMines > 0 && neededMines === nr.unvisitedAndUnknown.length) {
                // All unvisited unknowns must be mines.
                newlySet = this.frontier.setAllMine(nr.unvisitedAndUnknown);
            }
            wr.assignments += newlySet;
            if (newlySet > 0) this.assignInvestigationOfNeighbourhood(BoardLoc.fromNumber(loc, this.size));


        }
        console.log(`After attemptSimpleInference, frontier still size ${this.frontier.unknownSize} of ${this.frontier.size}`);
        console.log(wr);

        return wr;
    }

    private nextInvestigation() {
        if (this.needsInvestigation.size === 0) return undefined;
        //get iterator:
        var it = this.needsInvestigation.values();
        //get first entry:
        var first = it.next();
        //get value out of the iterator entry:
        const ret = first.value as number;

        this.needsInvestigation.delete(ret);
        return ret;
    }

    private assignInvestigationOfNeighbourhood(loc: BoardLoc) {
        loc.neighbourhoodIncludingSelf(this.size)
            .map(neighbour => neighbour.toNumber(this.size))
            .forEach(x => this.needsInvestigation.add(x));
    }

    private randomRollouts() {
        // Start from scratch.
        this.satisfyingAssignments = [];

        const rollouts = 5000;
        const mineProbability = this.naiveMineProbability;
        for (let i = 0; i < rollouts; i++) {
            const frontierMines: Set<number> = this.assignRandomly(this.frontier.unknowns, mineProbability);
            if (this.satisfiesConstraints(frontierMines)) {
                this.satisfyingAssignments.push(frontierMines);
            }
        }

        console.log(`${this.satisfyingAssignments.length} of ${rollouts} rollouts succeeded.`);


    }

    private assignRandomly(locs: Set<number>, mineProbability: number) {
        const ret = new Set<number>();
        locs.forEach(loc => {
            if (Math.random() <= mineProbability) ret.add(loc);
        });
        return ret;
    }

    private satisfiesConstraints(frontierMines: Set<number>): boolean {
        const hasMine = (loc: BoardLoc) => (frontierMines.has(loc.toNumber(this.size)) || this.frontier.isRequiredMine(loc));

        const iter = this.results.entries();
        let result = iter.next();
        while (!result.done) {
            const locnum = result.value[0];
            const requiredMines = result.value[1].neighboursWithMine;
            const loc = BoardLoc.fromNumber(locnum, this.size);
            const neighbourMinesInFrontier = loc.neighboursOnBoard(this.size).filter(hasMine);
            if (neighbourMinesInFrontier.length !== requiredMines) {
                return false;
            }
            result = iter.next();
        }
        return true;
    }
}

export interface DiagnosticInfo {
    knownNonMine?: boolean,
    knownMine?: boolean,
    onFrontierAndUnknown?: boolean,
    mineProbability?: number,
}

interface WorkReport {
    checks: number,
    assignments: number,
}