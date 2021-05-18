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

    // This is a hack place to store the callback but I don't care right now.
    onLearning?: VoidFunction,
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
    // The number of trues in the game.
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
    // Reveal trues, ending the game in the process, if it's not over already.
    mineLocations: () => BoardLoc[],
}

export class VariableAssignments {
    public trues = new Set<number>();
    public falses = new Set<number>();

    public known = (variable: number) => this.trues.has(variable) || this.falses.has(variable);

    public setTrue = (variable: number) => {
        if (this.falses.has(variable)) {
            throw new Error('Trying to set known false variable to true.')
        }
        this.trues.add(variable);
    }

    public setFalse = (variable: number) => {
        if (this.trues.has(variable)) {
            throw new Error('Trying to set known true variable to false.')
        }
        this.falses.add(variable);
    }

    public copy(): VariableAssignments {
        const ret = new VariableAssignments();
        this.trues.forEach(v => ret.trues.add(v));
        this.falses.forEach(v => ret.falses.add(v));
        return ret;
    }

    /**
     * Push all of the variables from other into this. Return true if everything is cool, false if a conflict was
     * found preventing the merger.
     * @param other
     */
    public mergeFrom(other: VariableAssignments): boolean {
        let iter = other.falses.entries();
        let next = iter.next();
        while (!next.done) {
            const variable = next.value[0];
            if (this.trues.has(variable)) {
                return false;
            }
            this.falses.add(variable)
            next = iter.next();
        }

        iter = other.trues.entries();
        next = iter.next();
        while (!next.done) {
            const variable = next.value[0];
            if (this.falses.has(variable)) {
                return false;
            }
            this.trues.add(variable)
            next = iter.next();
        }
        return true;
    }
}

export interface iWatcher {
    observe: (loc: BoardLoc, result: FactualMineTestResult) => void,
    diagnosticInfo: (loc: BoardLoc) => DiagnosticInfo,
}