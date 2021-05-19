import {BoardSize} from "./boardSize";

export interface BoardOptions {
    autoVisitNeighboursOfZeros: boolean,
    autoVisitDiagnosticKnownNonMines: boolean,
    autoVisitNeighboursOfFlagSatisfiedNumbers: boolean,
    autoPlay: boolean,
    displayNumberZeroWhenNoMinesAdjacent: boolean,
    showBasicInferenceTips: boolean,
    showMineProbabilities: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentInferredMines: boolean,
}

export interface FixedBoardMinesweeperConfig {
    size: BoardSize,
    mineCount: number,
    firstMoveNeverMined: boolean,
    firstMoveAlwaysZero: boolean,

    // This is a hack place to store the callback but I don't care right now.
    // onLearning?: VoidFunction,
}

export class Constants {
    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        firstMoveNeverMined: true,
        firstMoveAlwaysZero: true,
        size: new BoardSize(16, 20),
        mineCount: 66,
    };

    static defaultBoardOptions: BoardOptions = {
        autoVisitNeighboursOfZeros: true,
        autoVisitDiagnosticKnownNonMines: false,
        autoVisitNeighboursOfFlagSatisfiedNumbers: false,
        autoPlay: false,
        displayNumberZeroWhenNoMinesAdjacent: false,
        showBasicInferenceTips: false,
        showMineProbabilities: true,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentInferredMines: false,
    };


}
