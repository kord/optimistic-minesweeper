import {
    iMinesweeperGameProvider,
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {BoardSize} from "../boardSize";
import {FactualMineTestResult} from "../types";
import {FixedBoardMinesweeperConfig} from "../constants";


/**
 * Provide interaction with a minefield that can morph before the user clicks on a mine, so that the user always clicks
 * on a mine.
 */
class FirstClickIsAlwaysMineGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private readonly minelocs = new Set<number>();
    private get mineCount() : number {
        return this.config.dimensions.mineCount;
    }

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.dimensions.size);

        const numLocs = this.size.width * this.size.height;
        console.assert(this.mineCount && this.mineCount > 0 && this.mineCount <= numLocs);

    }

    public get totalMines(): number {
        return this.mineCount;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        const locNumber = this.size.width * loc.row + loc.col;
        return this.minelocs.has(locNumber);
    }

    public performVisit(loc: BoardLoc) {
        const numLocs = this.size.height * this.size.width;
        this.minelocs.add(loc.row * this.size.width + loc.col);
        while (this.minelocs.size < this.mineCount) {
            this.minelocs.add(
                Math.floor(Math.random() * numLocs));
        }

        const ret = {
            explodedMine: true,
        };
        this.visitResults.set(loc.toNumber(this.size), ret);
    }

    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

    get success(): boolean {
        return false;
    }

}

export default FirstClickIsAlwaysMineGameProvider;