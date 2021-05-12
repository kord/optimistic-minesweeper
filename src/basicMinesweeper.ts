import {BoardLoc, BoardSize, iMinesweeperGameProvider, FactualMineTestResult, MinimalProvider} from "./gameProvider";


export interface FixedBoardMinesweeperConfig {
    size: BoardSize,
    mineCount?: number,
}

export class AlwaysMineMinesweeperGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        return {
            containsMine: true,
        }
    }
}