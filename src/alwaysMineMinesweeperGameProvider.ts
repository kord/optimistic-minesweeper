import {
    BoardSize,
    iMinesweeperGameProvider,
    FactualMineTestResult,
    MinimalProvider,
    FixedBoardMinesweeperConfig
} from "./gameProvider";
import {BoardLoc} from "./boardLoc";


class AlwaysMineMinesweeperGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        return {
            containsMine: true,
        }
    }
}

export default AlwaysMineMinesweeperGameProvider;