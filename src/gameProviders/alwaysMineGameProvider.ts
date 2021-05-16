import {
    iMinesweeperGameProvider,
    FactualMineTestResult,
    MinimalProvider,
    FixedBoardMinesweeperConfig
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {BoardSize} from "../boardSize";


class AlwaysMineGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        return {
            explodedMine: true,
        }
    }

    mineLocations(): BoardLoc[] {
        return this.locations;
    }

    get success(): boolean {
        return false;
    }

    public get totalMines(): number {
        return this.numLocs;
    }
}

export default AlwaysMineGameProvider;