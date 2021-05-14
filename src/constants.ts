import {BoardSize, FixedBoardMinesweeperConfig} from "./gameProviders/gameProvider";
import {BoardOptions} from "./minesweeperGame";

export class Constants {
    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        size: new BoardSize(16, 30),
        mineCount: 99,
    };

    static defaultBoardOptions: BoardOptions = {
        expandNeighboursOfZero: true,
        displayZeroNumber: false,
        expandWhenEnoughFlagsLaid: true,
        showBasicInferenceTips: false,
    };


}

