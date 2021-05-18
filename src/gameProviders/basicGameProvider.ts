import {
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {FactualMineTestResult, FixedBoardMinesweeperConfig, iMinesweeperGameProvider} from "../types";

class BasicGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private minelocs = new Set<number>();
    private movesMade: number = 0;
    private mineVisited: Boolean = false;
    private firstMoveMade = false;

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
        // this.rewriteStaticMineLocations();
        console.assert(this.config.mineCount > 0,
            'The game is boring without any trues.');
        console.assert(this.config.mineCount - this.numLocs > 9,
            'There needs to be space for a first move. Use fewer trues.');
    }

    public get totalMines(): number {
        return this.config.mineCount;
    }

    get success(): boolean {
        return !this.mineVisited && this.config.mineCount + this.movesMade === this.numLocs;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        return this.minelocs.has(loc.toNumber(this.size));
    }

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

    // rewriteStaticMineLocations = () => {
    //     this.minelocs.clear();
    //     while (this.minelocs.size < this.config.mineCount) {
    //         this.minelocs.add(Math.floor(Math.random() * this.numLocs));
    //     }
    //     console.log(`minelocs.size ${this.minelocs.size}`)
    // }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        // while (!this.firstMoveMade && (this.hasMine(loc)) || loc.neighboursOnBoard(this.size).some(this.hasMine)) {
        //     this.rewriteStaticMineLocations();
        // }
        if (!this.firstMoveMade) this.rewriteStaticMineLocationsToExcludeNeighbourhood(loc);
        this.firstMoveMade = true;
        this.movesMade++;

        let neighboursWithMine = 0;
        loc.neighbours.forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

        const isMine = this.hasMine(loc);
        if (isMine) this.mineVisited = true;

        return {
            explodedMine: isMine,
            neighboursWithMine: neighboursWithMine,
        }
    }

    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

}

export default BasicGameProvider;