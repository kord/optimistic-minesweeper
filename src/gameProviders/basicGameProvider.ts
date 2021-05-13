import {
    FactualMineTestResult,
    FixedBoardMinesweeperConfig,
    iMinesweeperGameProvider,
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";

class BasicGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private minelocs = new Set<number>();
    private movesMade: number = 0;
    private mineVisited: Boolean = false;

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
        return this.minelocs.has(loc.toNumber(this.size));
    }

    private firstMoveMade = false;

    rewriteStaticMineLocations = () => {
        this.minelocs.clear();
        while (this.minelocs.size < this.config.mineCount) {
            this.minelocs.add(Math.floor(Math.random() * this.numLocs));
        }
        console.log(`minelocs.size ${this.minelocs.size}`)
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        while (!this.firstMoveMade && this.hasMine(loc)) {
            this.rewriteStaticMineLocations();
        }
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

    get success(): boolean {
        return this.config.mineCount + this.movesMade === this.numLocs && !this.mineVisited;
    }

}

export default BasicGameProvider;