import {BoardLoc} from "./boardLoc";

export interface BoardSize {
    height: number,
    width: number,
}

export interface MineTestResult {
    onBoard: boolean,
    everVisited: boolean,
    locationName: string,
    location: BoardLoc,
    containsMine?: boolean,
    neighboursWithMine?: number,
}

export interface FactualMineTestResult {
    containsMine: boolean,
    neighboursWithMine?: number,
}


export interface iMinesweeperGameProvider {
    size: BoardSize,
    // Visit a location, possibly blowing up on a mine, making possibly unfixable changes to the provider's state.
    visit: (loc: BoardLoc) => MineTestResult,
    // Check what was the last result of visiting the square. This can be called without changing anything in the
    // provider's state.
    lastVisitResult: (loc: BoardLoc) => MineTestResult,
    // Just to iterate over the places on the board for our view.
    locations: BoardLoc[],
    // Convenient to check if a location is on the board.
    onBoard : (loc: BoardLoc) => boolean,
}

export abstract class MinimalProvider {
    private visitResults: Map<string, FactualMineTestResult> = new Map<string, FactualMineTestResult>();

    constructor(public readonly size: BoardSize) {
        console.assert(Number.isInteger(size.height) && size.height > 0);
        console.assert(Number.isInteger(size.width) && size.width > 0);
        // TODO: Generate a board.
    }

    public get locations(): BoardLoc[] {
        const ret: BoardLoc[] = [];
        for (let row = 0; row < this.size.height; row++) {
            for (let col = 0; col < this.size.width; col++) {
                ret.push(new BoardLoc(row,col));
            }
        }
        return ret;
    }

    // This needs to be implemented by any subclass.
    public abstract performVisit(loc: BoardLoc): FactualMineTestResult;

    public lastVisitResult(loc: BoardLoc): MineTestResult {
        const locString = loc.toString();
        if (!this.onBoard(loc)) return {
            onBoard: false,  // !!
            everVisited: false,
            locationName: locString,
            location: loc,
        };

        const lastVisit = this.visitResults.get(locString);
        if (lastVisit) return {
            onBoard: true,
            everVisited: true,
            locationName: locString,
            location: loc,
            ...lastVisit,
        };

        return {
            everVisited: false,  // !!
            locationName: locString,
            location: loc,
            onBoard: true,
        }
    }

    public visit(loc: BoardLoc): MineTestResult {
        // Check if this has been visited before, in which case we can just return the result of that visit.
        const lastVisit = this.lastVisitResult(loc);
        if (lastVisit?.everVisited) return lastVisit;

        // Actually do the visit in the provider that extends this class.
        const result = this.performVisit(loc);

        this.visitResults.set(lastVisit.locationName, result);
        return this.lastVisitResult(loc);
    }

    public onBoard(loc: BoardLoc): boolean {
        return loc.row >= 0 && loc.col >= 0 && loc.row < this.size.height && loc.col < this.size.width;
    }
}