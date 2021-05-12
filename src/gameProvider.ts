import {BoardLoc} from "./boardLoc";

export interface BoardSize {
    height: number,
    width: number,
}

export interface FixedBoardMinesweeperConfig {
    size: BoardSize,
    mineCount: number,
}

export interface MineTestResult {
    locationName: string,
    location: BoardLoc,
    onBoard: boolean,
    everVisited: boolean,
    onFrontLandscape: boolean,
    visitedNeighbourCount: number,

    // These are only provided if a test has been conducted on the tested location.
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
    onBoard: (loc: BoardLoc) => boolean,
    // Game Over
    gameOver: boolean,
}

export abstract class MinimalProvider extends EventTarget {
    // These provide information that, once provided, is irrevoccable. We have to maintain consistency with the data
    // in these to show a coherent world to the player.
    private visitResults: Map<string, FactualMineTestResult> = new Map<string, FactualMineTestResult>();
    private frontLandscape: Set<string> = new Set<string>();

    constructor(public readonly size: BoardSize) {
        super();
        console.assert(Number.isInteger(size.height) && size.height > 0);
        console.assert(Number.isInteger(size.width) && size.width > 0);

        this._gameOver = false;
    }

    private _gameOver: boolean;

    get gameOver(): boolean {
        return this._gameOver;
    }

    public get locations(): BoardLoc[] {
        const ret: BoardLoc[] = [];
        for (let row = 0; row < this.size.height; row++) {
            for (let col = 0; col < this.size.width; col++) {
                ret.push(new BoardLoc(row, col));
            }
        }
        return ret;
    }

    // This needs to be implemented by any subclass.
    public abstract performVisit(loc: BoardLoc): FactualMineTestResult;

    public lastVisitResult(loc: BoardLoc): MineTestResult {
        const locString = loc.toString();
        const lastVisit = this.visitResults.get(locString);
        const visitedNeighbours = loc.neighbours.filter(nloc => this.visitResults.has(nloc.toString()));

        let ret = {
            location: loc,
            locationName: locString,
            onBoard: this.onBoard(loc),
            onFrontLandscape: this.frontLandscape.has(locString),
            everVisited: !!lastVisit,
            visitedNeighbourCount: visitedNeighbours.length,
            ...lastVisit,
        };

        return ret;
    }

    public visit(loc: BoardLoc): MineTestResult {
        // Check if this has been visited before, in which case we can just return the result of that visit.
        const lastVisit = this.lastVisitResult(loc);
        if (lastVisit?.everVisited) return lastVisit;

        // Actually do the visit in the provider that extends this class.
        const result = this.performVisit(loc);

        // Update the front landscape to exclude the visited location and include the unvisited neighbours of that
        // location.
        this.frontLandscape.delete(loc.toString());
        loc.neighbours.forEach(nloc => {
            const nlocstr = nloc.toString();
            if (this.onBoard(nloc) && !this.visitResults.has(nlocstr)) {
                this.frontLandscape.add(nlocstr);
            }
        });
        console.log(`frontLandscape has size ${this.frontLandscape.size}`)

        // Release an event for the visit occurring.
        this.dispatchEvent(
            new CustomEvent('visit', {
                detail: {
                    visitedLocation: loc,
                }
            })
        )


        this.visitResults.set(lastVisit.locationName, result);
        return this.lastVisitResult(loc);
    }

    // Is a given location even on the board.
    public onBoard(loc: BoardLoc): boolean {
        return loc.row >= 0 && loc.col >= 0 && loc.row < this.size.height && loc.col < this.size.width;
    }
}