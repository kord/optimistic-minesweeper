import {
    FactualMineTestResult,
    FixedBoardMinesweeperConfig,
    iMinesweeperGameProvider,
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import assert from "assert";

class DiagnosticGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private minelocs = new Set<number>();
    private frontier: Set<number> = new Set<number>();
    private requiredMines = new Set<number>();
    private requiredNonMines = new Set<number>();
    private firstMoveMade = false;
    private movesMade: number = 0;
    private mineVisited: boolean = false;

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
        this.rewriteStaticMineLocations();
        console.assert(this.config.mineCount && this.config.mineCount > 0 && this.config.mineCount < this.numLocs);
    }

    public get totalMines(): number {
        return this.config.mineCount;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        const locNumber = this.numberLocRep(loc);
        return this.minelocs.has(locNumber);
    }

    rewriteStaticMineLocations = () => {
        this.minelocs.clear();
        while (this.minelocs.size < this.config.mineCount) {
            this.minelocs.add(Math.floor(Math.random() * this.numLocs));
        }
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        // Svelte representation used in here.
        const locNum = this.numberLocRep(loc);

        // This demonstrates how we can change the board setup just in time after the user tries to visit somewhere.
        while (!this.firstMoveMade && this.hasMine(loc)) {
            this.rewriteStaticMineLocations();
        }
        this.firstMoveMade = true;

        this.movesMade++;

        let neighboursWithMine = 0;
        loc.neighbours.forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

        // Update the front landscape to exclude the visited location and include the unvisited neighbours of that
        // location.
        this.frontier.delete(locNum);
        loc.neighbours.forEach(nloc => {
            const nlocNum = this.numberLocRep(nloc);
            if (this.onBoard(nloc) && !this.visitResults.has(nlocNum)) {
                this.frontier.add(nlocNum);
            }
        });

        const isMine = this.hasMine(loc);
        if (this.requiredMines.has(locNum)) {
            console.log(`It's about to blow, and we know it!`);
            assert(isMine);
        }
        if (this.requiredNonMines.has(locNum)) {
            console.log(`You didn't get lucky, you could have known ${loc.toString()} is not a mine.`)
            this.frontier.delete(locNum);
            this.requiredNonMines.delete(locNum);
        }

        if (isMine) this.mineVisited = true;

        return {
            explodedMine: isMine,
            neighboursWithMine: neighboursWithMine,
        }
    }

    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

    /**
     * Override of superclass.
     */
    protected diagnosticInfo(loc: BoardLoc): object {
        let locNum = this.numberLocRep(loc);
        return {
            knownMine: this.requiredMines.has(locNum),
            knownNonMine: this.requiredNonMines.has(locNum),
            onFrontLandscape: this.frontier.has(locNum),
        }
    }

    /**
     * Override of superclass.
     */
    protected runAfterVisit() {
        this.propagateKnowledge();
    }

    private neighbourhoodReport = (loc: BoardLoc) => {
        const neighbours = loc.neighbours.filter(this.onBoard);
        const visited = neighbours.filter(loc => this.lastVisitResult(loc).everVisited);
        const unvisited = neighbours.filter(loc => !this.lastVisitResult(loc).everVisited);

        const knownMines = neighbours.filter(loc => this.requiredMines.has(this.numberLocRep(loc)));
        const knownNonMines = neighbours.filter(loc => this.requiredNonMines.has(this.numberLocRep(loc)));

        const unvisitedAndUnknown = unvisited.filter(loc => !this.requiredMines.has(this.numberLocRep(loc)) && !this.requiredNonMines.has(this.numberLocRep(loc)));

        return {
            neighbours: neighbours,
            visited: visited,
            unvisited: unvisited,

            unvisitedAndUnknown: unvisitedAndUnknown,
            knownMines: knownMines,
            knownNonMines: knownNonMines,

        } as NeighbourhoodReport;
    }

    private propagateKnowledgeStep = () => {
        let progressMade = false;
        this.locations.forEach(loc => {
            const vr = this.lastVisitResult(loc);
            let reportedMineNeighbours = vr.neighboursWithMine;
            if (reportedMineNeighbours === undefined) return;
            const nr = this.neighbourhoodReport(loc);
            if (nr.unvisitedAndUnknown.length === 0) return;

            const neededMines = reportedMineNeighbours - nr.knownMines.length;
            if (neededMines < 0) {
                console.error(`Too many mines inferred`);
                console.error(loc);
                console.error(vr);
                console.error(nr);
            }
            if (neededMines === 0) {
                // All unknowns are non-mines
                nr.unvisitedAndUnknown.forEach(loc => {
                    this.requiredNonMines.add(this.numberLocRep(loc));
                    progressMade = true;
                });
                return;
            }
            if (neededMines > 0 && neededMines === nr.unvisitedAndUnknown.length) {
                // All unvisited unknowns must be mines.
                nr.unvisitedAndUnknown.forEach(loc => {
                    this.requiredMines.add(this.numberLocRep(loc));
                    progressMade = true;
                });
                return;
            }
        });
        return progressMade;
    }

    private propagateKnowledge = () => {


        while (this.propagateKnowledgeStep()) {
        }
    }

    get success(): boolean {
        return this.config.mineCount + this.movesMade === this.numLocs && !this.mineVisited;
    }
}


interface NeighbourhoodReport {
    neighbours: BoardLoc[],
    visited: BoardLoc[],
    unvisited: BoardLoc[],

    unvisitedAndUnknown: BoardLoc[],

    knownMines: BoardLoc[],
    knownNonMines: BoardLoc[],
}

export default DiagnosticGameProvider;