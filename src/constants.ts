import {BoardSize} from "./boardSize";
import {FixedBoardMinesweeperConfig} from "./types";

export interface BoardOptions {
    displayNumberZeroWhenNoMinesAdjacent: boolean,
    autoVisitNeighboursOfZeros: boolean,
    autoVisitNeighboursOfFlagSatisfiedNumbers: boolean,
    showBasicInferenceTips: boolean,
    showMineProbabilities: boolean,
    autoVisitDiagnosticKnownNonMines: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentInferredMines: boolean,
}

export class Constants {
    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        size: new BoardSize(16, 20),
        mineCount: 66,
    };

    static defaultBoardOptions: BoardOptions = {
        autoVisitNeighboursOfZeros: true,
        displayNumberZeroWhenNoMinesAdjacent: false,
        autoVisitNeighboursOfFlagSatisfiedNumbers: false,
        showBasicInferenceTips: false,
        showMineProbabilities: true,
        autoVisitDiagnosticKnownNonMines: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentInferredMines: false,
    };


}
