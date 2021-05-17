import {BoardSize} from "./boardSize";
import {FixedBoardMinesweeperConfig} from "./types";

export interface BoardOptions {
    displayNumberZeroWhenNoMinesAdjacent: boolean,
    expandNeighboursOfZero: boolean,
    expandWhenEnoughFlagsLaid: boolean,
    showBasicInferenceTips: boolean,
    showMineProbabilities: boolean,
    useAllBasicInferenceTips: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentInferredMines: boolean,
}

export class Constants {
    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        size: new BoardSize(16, 20),
        mineCount: 66,
    };

    static defaultBoardOptions: BoardOptions = {
        expandNeighboursOfZero: true,
        displayNumberZeroWhenNoMinesAdjacent: false,
        expandWhenEnoughFlagsLaid: true,
        showBasicInferenceTips: false,
        showMineProbabilities: false,
        useAllBasicInferenceTips: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentInferredMines: false,
    };


}
