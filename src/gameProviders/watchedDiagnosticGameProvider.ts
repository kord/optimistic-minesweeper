import {
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import Watcher from "../logic/watcher";
import {DiagnosticInfo, FactualMineTestResult, FixedBoardMinesweeperConfig, iMinesweeperGameProvider} from "../types";

class WatchedDiagnosticGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private mineField = new Set<number>();
    protected watcher: Watcher;
    private firstMoveMade = false;
    private movesMade: number = 0;
    private mineVisited: boolean = false;

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
        // this.rewriteStaticMineLocations();
        // console.assert(this.config.mineCount && this.config.mineCount > 0 && this.config.mineCount < this.numLocs);

        console.assert(this.config.mineCount > 0,
            'The game is boring without any trues.');
        console.assert(this.numLocs - this.config.mineCount > 9,
            'There needs to be space for a first move. Use fewer trues.');

        this.watcher = new Watcher(config, 500, 100);
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
        return this.mineField.has(locNumber);
    }

    rewriteStaticMineLocationsToExcludeNeighbourhood = (loc: BoardLoc) => {
        this.mineField.clear();
        let iterationcount = 0;
        while (this.mineField.size < this.config.mineCount) {
            this.mineField.add(Math.floor(Math.random() * this.numLocs));
            loc.neighbourhoodIncludingSelf(this.size).forEach(loc => this.mineField.delete(loc.toNumber(this.size)));
            iterationcount++;
        }
        console.log(`Took ${iterationcount} rounds to find a good board setup.`);
    }


    /**
     * This can be rewritten by subclasses to change the overall behaviour.
     * @param loc Place we're about to visit at the request of the user.
     */
    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc) : Set<number> | undefined {
        return undefined;
    }

    /**
     * Required by superclass.
     */
    public performVisit(loc: BoardLoc): FactualMineTestResult {

        // Give subclasses an opportunity to rewrite the trues in response to the user move.
        if (this.firstMoveMade) {
            const newMines = this.changedMinefieldInResponseToNextVisit(loc);
            if (newMines) this.mineField = newMines;
        }

        // This demonstrates how we can change the board setup just in time after the user tries to visit somewhere.
        if (!this.firstMoveMade) {
            this.rewriteStaticMineLocationsToExcludeNeighbourhood(loc);
            this.firstMoveMade = true;
        }


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
    protected diagnosticInfo(loc: BoardLoc): DiagnosticInfo {
        if (this.visitResults.has(loc.toNumber(this.size))) return {};
        return this.watcher.diagnosticInfo(loc);
    }
}


export default WatchedDiagnosticGameProvider;