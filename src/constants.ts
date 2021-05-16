import {FixedBoardMinesweeperConfig} from "./gameProviders/gameProvider";
import {BoardSize} from "./boardSize";

export interface BoardOptions {
    displayNumberZeroWhenNoMinesAdjacent: boolean,
    expandNeighboursOfZero: boolean,
    expandWhenEnoughFlagsLaid: boolean,
    showBasicInferenceTips: boolean,
    useAllBasicInferenceTips: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentInferredMines: boolean,
}

export class Constants {
    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        size: new BoardSize(16, 30),
        mineCount: 99,
    };

    static defaultBoardOptions: BoardOptions = {
        expandNeighboursOfZero: true,
        displayNumberZeroWhenNoMinesAdjacent: false,
        expandWhenEnoughFlagsLaid: true,
        showBasicInferenceTips: false,
        useAllBasicInferenceTips: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentInferredMines: false,
    };


}

