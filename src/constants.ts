import {BoardSize} from "./boardSize";

export interface BoardOptions {
    autoPlay: boolean,
    showWatcherKnowledge: boolean,
    showWatcherMineProbabilities: boolean,
    autoVisitNeighboursOfZeros: boolean,
    autoVisitNeighboursOfFlagSatisfiedNumbers: boolean,
    autoVisitWatcherKnownNonMines: boolean,
    displayNumberZeroWhenNoMinesAdjacent: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentInferredMines: boolean,
}

export interface ExplicitMinefieldDimensions {
    size: BoardSize,
    mineCount: number,
}

export interface FixedBoardMinesweeperConfig {
    dimensions: ExplicitMinefieldDimensions,
    firstMoveNeverMined: boolean,
    firstMoveAlwaysZero: boolean,

    // This is a hack place to store the callback but I don't care right now.
    // onLearning?: VoidFunction,
}

export class Constants {
    static boardSizeOptions: Map<string, () => ExplicitMinefieldDimensions> =
        new Map<string, () => ExplicitMinefieldDimensions>(
            [
                ['Beginner', () => ({
                    size: new BoardSize(9, 9),
                    mineCount: 10,
                })],
                ['Intermediate', () => ({
                    size: new BoardSize(16, 16),
                    mineCount: 40,
                })],
                ['Expert', () => ({
                    size: new BoardSize(16, 30),
                    mineCount: 99,
                })],
                ['Fullscreen', () => {
                    const height = Math.floor(window.innerHeight * .9 / Constants.squareSizePx);
                    const width = Math.floor(window.innerWidth * .95 / Constants.squareSizePx);
                    return {
                        size: new BoardSize(height, width),
                        mineCount: Math.floor(height * width * .2),
                    };
                }],
            ]
        );

    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        firstMoveNeverMined: true,
        firstMoveAlwaysZero: true,
        // Same as intermediate
        dimensions: {
            size: new BoardSize(16, 16),
            mineCount: 40,
        },
    };

    static defaultBoardOptions: BoardOptions = {
        autoPlay: false,
        showWatcherKnowledge: false,
        showWatcherMineProbabilities: false,
        autoVisitNeighboursOfZeros: true,
        autoVisitWatcherKnownNonMines: false,
        autoVisitNeighboursOfFlagSatisfiedNumbers: false,
        displayNumberZeroWhenNoMinesAdjacent: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentInferredMines: false,
    };

    static squareSizePx: number = 40;


}
