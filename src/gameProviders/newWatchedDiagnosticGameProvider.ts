import {
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {OldWatcher} from "./oldWatcher";
import NewWatcher from "./newWatcher";
import {FactualMineTestResult, FixedBoardMinesweeperConfig, iMinesweeperGameProvider} from "../types";

class NewWatchedDiagnosticGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private minelocs = new Set<number>();
    private watcher: NewWatcher;
    private firstMoveMade = false;
    private movesMade: number = 0;
    private mineVisited: boolean = false;

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
        // this.rewriteStaticMineLocations();
        // console.assert(this.config.mineCount && this.config.mineCount > 0 && this.config.mineCount < this.numLocs);

        console.assert(this.config.mineCount > 0,
            'The game is boring without any mines.');
        console.assert(this.numLocs - this.config.mineCount > 9,
            'There needs to be space for a first move. Use fewer mines.');

        this.watcher = new NewWatcher(config);
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

    // rewriteStaticMineLocations = () => {
    //     this.minelocs.clear();
    //     while (this.minelocs.size < this.config.mineCount) {
    //         this.minelocs.add(Math.floor(Math.random() * this.numLocs));
    //     }
    // }

    rewriteStaticMineLocationsToExcludeNeighbourhood = (loc: BoardLoc) => {
        this.minelocs.clear();
        let iterationcount = 0;
        while (this.minelocs.size < this.config.mineCount) {
            this.minelocs.add(Math.floor(Math.random() * this.numLocs));
            loc.neighbourhoodIncludingSelf(this.size).forEach(loc => this.minelocs.delete(loc.toNumber(this.size)));
            iterationcount++;
        }
        console.log(`Took ${iterationcount} rounds to find a good board setup.`)
        console.log(`minelocs.size ${this.minelocs.size}`)
    }


    /**
     * Required by superclass.
     */
    public performVisit(loc: BoardLoc): FactualMineTestResult {
        // This demonstrates how we can change the board setup just in time after the user tries to visit somewhere.
        // while (!this.firstMoveMade && this.hasMine(loc)) {
        //     this.rewriteStaticMineLocations();
        // }
        if (!this.firstMoveMade) this.rewriteStaticMineLocationsToExcludeNeighbourhood(loc);
        this.firstMoveMade = true;

        this.movesMade++;

        let neighboursWithMine = 0;
        loc.neighbours.forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

        const isMine = this.hasMine(loc);

        if (isMine) this.mineVisited = true;

        const ret = {
            explodedMine: isMine,
            neighboursWithMine: neighboursWithMine,
        }

        this.watcher.observe(loc, ret);

        return ret;
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
        return this.watcher.diagnosticInfo(loc);
    }


}


export default NewWatchedDiagnosticGameProvider;