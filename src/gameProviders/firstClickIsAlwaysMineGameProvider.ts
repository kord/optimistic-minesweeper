import {
    BoardSize,
    iMinesweeperGameProvider,
    FactualMineTestResult,
    MinimalProvider,
    FixedBoardMinesweeperConfig
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";


class FirstClickIsAlwaysMineGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private readonly minelocs = new Set<number>();

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);

        const numLocs = this.size.width * this.size.height;
        console.assert(this.config.mineCount && this.config.mineCount > 0 && this.config.mineCount <= numLocs);

    }

    public get totalMines(): number {
        return this.config.mineCount;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        const locNumber = this.size.width * loc.row + loc.col;
        return this.minelocs.has(locNumber);
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        const numLocs = this.size.height * this.size.width;
        this.minelocs.add(loc.row * this.size.width + loc.col);
        while (this.minelocs.size < this.config.mineCount) {
            this.minelocs.add(
                Math.floor(Math.random() * numLocs));
        }

        return {
            explodedMine: true,
        }
    }

    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

    get success(): boolean {
        return false;
    }

}

export default FirstClickIsAlwaysMineGameProvider;