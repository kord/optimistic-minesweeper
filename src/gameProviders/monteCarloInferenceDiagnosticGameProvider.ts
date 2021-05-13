import {
    FactualMineTestResult,
    FixedBoardMinesweeperConfig,
    iMinesweeperGameProvider,
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {FrontierKnowledge} from "./frontierKnowledge";


class MonteCarloInferenceDiagnosticGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private minelocs = new Set<number>();
    private frontierKnowledge: FrontierKnowledge;
    private firstMoveMade = false;
    private movesMade: number = 0;
    private mineVisited: boolean = false;

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
        this.frontierKnowledge = new FrontierKnowledge(this.size);
        this.rewriteStaticMineLocations();
        console.assert(this.config.mineCount && this.config.mineCount > 0 && this.config.mineCount < this.numLocs);
    }

    /**
     * Required by superclass.
     */
    public get totalMines(): number {
        return this.config.mineCount;
    }

    /**
     * Required by superclass.
     */
    get success(): boolean {
        return this.config.mineCount + this.movesMade === this.numLocs && !this.mineVisited;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        const locNumber = loc.toNumber(this.size);
        return this.minelocs.has(locNumber);
    }

    rewriteStaticMineLocations = () => {
        this.minelocs.clear();
        while (this.minelocs.size < this.config.mineCount) {
            this.minelocs.add(Math.floor(Math.random() * this.numLocs));
        }
    }

    /**
     * Required by superclass.
     */
    public performVisit(loc: BoardLoc): FactualMineTestResult {
        // Svelte representation used in here.
        const locNum = loc.toNumber(this.size);

        // This demonstrates how we can change the board setup just in time after the user tries to visit somewhere.
        while (!this.firstMoveMade && this.hasMine(loc)) {
            this.rewriteStaticMineLocations();
        }
        this.firstMoveMade = true;

        this.movesMade++;

        let neighboursWithMine = 0;
        loc.neighbours.forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

        //
        // this.frontier.delete(locNum);
        // loc.neighbours.forEach(nloc => {
        //     const nlocNum = loc.toNumber(this.size);
        //     if (this.onBoard(nloc) && !this.visitResults.has(nlocNum)) {
        //         this.frontier.add(nlocNum);
        //     }
        // });

        const isMine = this.hasMine(loc);
        if (this.frontierKnowledge.isRequiredMine(loc)) {
            console.log(`It's about to blow, and we know it!`);
            console.assert(isMine);
        }
        if (this.frontierKnowledge.isRequiredEmpty(loc)) {
            console.log(`Good pick. You could have known ${loc.toString()} is not a mine.`)
        }

        // Update the front landscape to exclude the visited location and include the unvisited neighbours of that
        // location.
        this.frontierKnowledge.remove(loc);
        loc.neighbours.forEach(this.frontierKnowledge.introduce);

        if (isMine) this.mineVisited = true;

        return {
            explodedMine: isMine,
            neighboursWithMine: neighboursWithMine,
        }
    }

    /**
     * Required by superclass.
     */
    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

    /**
     * Override of superclass.
     */
    protected diagnosticInfo(loc: BoardLoc): object {
        return {
            knownMine: this.frontierKnowledge.isRequiredMine(loc),
            knownNonMine: this.frontierKnowledge.isRequiredEmpty(loc),
            onFrontierAndUnknown: this.frontierKnowledge.onFrontierAndUnknown(loc),
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

        const knownMines = neighbours.filter(loc => this.frontierKnowledge.isRequiredMine(loc));
        const knownNonMines = neighbours.filter(loc => this.frontierKnowledge.isRequiredEmpty(loc));
        const unvisitedAndUnknown = unvisited.filter(loc => this.frontierKnowledge.onFrontierAndUnknown(loc));

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
                if (nr.unvisitedAndUnknown.length > 0) {
                    nr.unvisitedAndUnknown.forEach(this.frontierKnowledge.setEmpty);
                    progressMade = true;
                }
                return;
            }
            if (neededMines > 0 && neededMines === nr.unvisitedAndUnknown.length) {
                // All unvisited unknowns must be mines.
                if (nr.unvisitedAndUnknown.length > 0) {
                    nr.unvisitedAndUnknown.forEach(this.frontierKnowledge.setMine);
                    progressMade = true;
                }
                return;
            }
        });
        return progressMade;
    }

    private propagateKnowledge = () => {
        // We can learn some facts about the world we have inherited here.
        while (this.propagateKnowledgeStep()) {
        }
        // And now we make some guesses on how we could proceed, not generating new knowledge, exactly, but discovering
        // some of the possibilities for expansion of this setup.

        // lastVisitResult(loc).neighboursWithMine is fixed for all time
        // frontierKnowledge has some mines and

        // Lets do some random rollouts
        this.randomRollouts()

    }

    private randomRollouts() {

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

export default MonteCarloInferenceDiagnosticGameProvider;