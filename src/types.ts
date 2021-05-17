import {BoardSize} from "./boardSize";
import {BoardLoc} from "./boardLoc";

export interface DiagnosticInfo {
    knownNonMine?: boolean,
    knownMine?: boolean,
    onFrontierAndUnknown?: boolean,
    mineProbability?: number,
    couldBeAMine?: boolean,
}

export interface NeighbourhoodReport {
    neighbours: BoardLoc[],
    visited: BoardLoc[],
    unvisited: BoardLoc[],

    unvisitedAndUnknown: BoardLoc[],

    knownMines: BoardLoc[],
    knownNonMines: BoardLoc[],
}

export interface FixedBoardMinesweeperConfig {
    size: BoardSize,
    mineCount: number,
}

export interface MineTestResult {
    locationNum: number,
    locationName: string,
    location: BoardLoc,

    onBoard: boolean,

    everVisited: boolean,
    visitedNeighbourCount: number,

    // These are only provided if a test has been conducted on the tested location.
    explodedMine?: boolean,
    neighboursWithMine?: number,

    // Diagnostic info.
    diagnostics?: DiagnosticInfo,

    // Only provided if the game is over.
    gameOver?: boolean,
    containedMine?: boolean,
}

export interface FactualMineTestResult {
    // Did out test blow up the game?
    explodedMine: boolean,

    // Only needs to be provided if the tested location had no mine.
    neighboursWithMine?: number,
}

export interface iMinesweeperGameProvider {
    // The dimensions of the board.
    size: BoardSize,
    // The number of squares on the board, syntactic sugar for member 'size'.
    numLocs: number,
    // The number of mines in the game.
    totalMines: number,
    // Visit a location, possibly blowing up on a mine, making possibly unfixable changes to the provider's state.
    visit: (loc: BoardLoc) => MineTestResult,
    // Check what was the last result of visiting the square. This can be called without changing anything in the
    // provider's state.
    lastVisitResult: (loc: BoardLoc) => MineTestResult,
    // Just to iterate over the places on the board for our view.
    locations: BoardLoc[],
    // Convenient to check if a location is on the board.
    onBoard: (loc: BoardLoc) => boolean,
    // Game Over
    gameOver: boolean,
    // You won
    success: boolean,
    // You lost
    failure: boolean,
    // Reveal mines, ending the game in the process, if it's not over already.
    mineLocations: () => BoardLoc[],
}

export interface SatisfyingAssignment {
    mines: Set<number>,
    empties: Set<number>,
}