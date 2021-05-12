import {BoardSize, iMinesweeperGameProvider, FactualMineTestResult, MinimalProvider} from "./gameProvider";
import {BoardLoc} from "./boardLoc";


export interface AlwaysMineMinesweeperGameProviderConfig {
    size: BoardSize,
}

export class AlwaysMineMinesweeperGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    constructor(public readonly config: AlwaysMineMinesweeperGameProviderConfig) {
        super(config.size);
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        return {
            containsMine: true,
        }
    }
}