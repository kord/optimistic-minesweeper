import {BoardSize} from "./boardSize";

export interface BoardOptions {
    autoPlay: boolean,
    autoPlayDelayMs: number,
    showKnowledgeOverlay: boolean,
    showProbabilityOverlay: boolean,
    autoVisitNeighboursOfZeros: boolean,
    autoVisitNeighboursOfFlagSatisfiedNumbers: boolean,
    autoVisitKnownNonMines: boolean,
    displayNumberZeroWhenNoMinesAdjacent: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentKnownMines: boolean,
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

    static defaultGameSizeOption : string = 'Expert';

    static defaultGameConfig: FixedBoardMinesweeperConfig = {
        firstMoveNeverMined: true,
        firstMoveAlwaysZero: true,
        dimensions: Constants.boardSizeOptions.get(Constants.defaultGameSizeOption)!(),
    };

    static defaultBoardOptions: BoardOptions = {
        autoPlay: false,
        autoPlayDelayMs: 200,
        showKnowledgeOverlay: false,
        showProbabilityOverlay: false,
        autoVisitNeighboursOfZeros: true,
        autoVisitKnownNonMines: false,
        autoVisitNeighboursOfFlagSatisfiedNumbers: false,
        displayNumberZeroWhenNoMinesAdjacent: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentKnownMines: false,
    };

    static squareSizePx: number = 40;

    static autoplayNiceBoardOptions: BoardOptions = {
        autoPlay: true,
        autoPlayDelayMs: 500,
        showKnowledgeOverlay: true,
        showProbabilityOverlay: false,
        autoVisitNeighboursOfZeros: true,
        autoVisitKnownNonMines: true,
        autoVisitNeighboursOfFlagSatisfiedNumbers: false,
        displayNumberZeroWhenNoMinesAdjacent: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentKnownMines: false,
    };
    static autoplayShowProbabilityBoardOptions: BoardOptions = {
        autoPlay: true,
        autoPlayDelayMs: 500,
        showKnowledgeOverlay: true,
        showProbabilityOverlay: true,
        autoVisitNeighboursOfZeros: true,
        autoVisitKnownNonMines: false,
        autoVisitNeighboursOfFlagSatisfiedNumbers: false,
        displayNumberZeroWhenNoMinesAdjacent: false,
        decrementVisibleNumberByAdjacentFlags: false,
        decrementVisibleNumberByAdjacentKnownMines: true,
    };


}
