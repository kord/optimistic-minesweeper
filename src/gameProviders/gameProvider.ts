import {BoardLoc} from "../boardLoc";

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
    explodedMine?: boolean,
    neighboursWithMine?: number,

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
    // Reveal mines, ending the game in the process, if it's not over already.
    mineLocations: () => BoardLoc[],
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

    private _gameOverMineLocations: Set<string> | undefined;

    // This is for convenience, processing out the final mine locations so we can use them in calls to lastVisitResult
    // after game end.
    private get gameOverMineLocations(): Set<string> | undefined {
        if (!this.gameOver) return undefined;
        if (!this._gameOverMineLocations) {
            this._gameOverMineLocations = new Set<string>(
                this.mineLocations().map(loc => loc.toString())
            );
        }
        return this._gameOverMineLocations;
    }

    // This needs to be implemented by any subclass. Test if a mine is present at some location.
    public abstract performVisit(loc: BoardLoc): FactualMineTestResult;

    // This needs to be implemented by any subclass. Return a board state consistent with the results of
    // performVisit calls made before this was requested. performVisit can be ignored after any call of this,
    // since we are now committed to the entire board state.
    public abstract mineLocations(): BoardLoc[];

    public lastVisitResult(loc: BoardLoc): MineTestResult {
        const locString = loc.toString();
        const lastFactualVisit = this.visitResults.get(locString);
        const visitedNeighbours = loc.neighbours.filter(nloc => this.visitResults.has(nloc.toString()));

        const finalInfo = this.gameOver ?
            {
                gameOver: true,
                containedMine: this.gameOverMineLocations!.has(locString),
            } :
            undefined;

        let ret = {
            location: loc,
            locationName: locString,
            onBoard: this.onBoard(loc),
            gameOver: this._gameOver,
            onFrontLandscape: this.frontLandscape.has(locString),
            everVisited: !!lastFactualVisit,
            visitedNeighbourCount: visitedNeighbours.length,
            ...lastFactualVisit,
            ...finalInfo,
        };

        return ret;
    }

    public visit(loc: BoardLoc): MineTestResult {
        if (this._gameOver) {
            throw new Error(`Game is over. You can't visit anywhere anymore.`);
        }

        // Check if this has been visited before, in which case we can just return the result of that visit.
        const lastVisit = this.lastVisitResult(loc);
        if (lastVisit?.everVisited) return lastVisit;

        // Actually do the visit in the provider that extends this class.
        const result = this.performVisit(loc);

        // Permanantly mark the game as done when we've visited a mine, refusing all future visits.
        if (result.explodedMine) {
            console.log('BOOM');
            this._gameOver = true;
        }

        // Update the front landscape to exclude the visited location and include the unvisited neighbours of that
        // location.
        this.frontLandscape.delete(loc.toString());
        loc.neighbours.forEach(nloc => {
            const nlocstr = nloc.toString();
            if (this.onBoard(nloc) && !this.visitResults.has(nlocstr)) {
                this.frontLandscape.add(nlocstr);
            }
        });


        // // Release an event for the visit occurring.
        // this.dispatchEvent(
        //     new CustomEvent('visit', {
        //         detail: {
        //             visitedLocation: loc,
        //         }
        //     })
        // );

        this.visitResults.set(lastVisit.locationName, result);
        return this.lastVisitResult(loc);
    }

    // Is a given location even on the board.
    public onBoard(loc: BoardLoc): boolean {
        return loc.row >= 0 && loc.col >= 0 && loc.row < this.size.height && loc.col < this.size.width;
    }
}