export interface BoardSize {
    height: number,
    width: number,
}

export interface BoardLoc {
    row: number,
    col: number,
}

export interface MineTestResult {
    onBoard: boolean,
    everVisited: boolean,
    locationName: string,
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
}

export abstract class MinimalProvider {
    private static boardLocMatcher = new RegExp(`^([0-9]+)-([0-9]+)$`);
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
                ret.push({row: row, col: col});
            }
        }
        return ret;
    }

    public static stringToLoc(str: string): BoardLoc | undefined {
        let test = this.boardLocMatcher.exec(str);
        if (test) {
            return {
                row: +test[1],
                col: +test[2],
            }
        }
    }

    private static locToString = (loc: BoardLoc) => `${loc.row}-${loc.col}`;

    // This needs to be implemented by any subclass.
    public abstract performVisit(loc: BoardLoc): FactualMineTestResult;

    public lastVisitResult(loc: BoardLoc): MineTestResult {
        const locString = MinimalProvider.locToString(loc);
        if (!this.onBoard(loc)) return {
            onBoard: false,  // !!
            everVisited: false,
            locationName: locString,
        };

        const lastVisit = this.visitResults.get(locString);
        if (lastVisit) return {
            onBoard: true,
            everVisited: true,
            locationName: locString,
            ...lastVisit,
        };

        return {
            everVisited: false,  // !!
            locationName: locString,
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

    private onBoard(loc: BoardLoc): boolean {
        return loc.row >= 0 && loc.col >= 0 && loc.row < this.size.height && loc.col < this.size.width;
    }
}