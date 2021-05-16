import {BoardLoc} from "../boardLoc";
import {BoardSize} from "../boardSize";

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

    // Diagnostics
    knownNonMine?: boolean,
    knownMine?: boolean,
    onFrontierAndUnknown?: boolean,

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

export abstract class MinimalProvider extends EventTarget {
    public readonly numLocs: number;

    /**
     *  These provide information that, once provided, is irrevoccable. We have to maintain consistency with the data
     *  in these to show a coherent world to the player.
     */
    protected visitResults: Map<number, FactualMineTestResult> = new Map<number, FactualMineTestResult>();
    private successfulVisitCount: number = 0;

    constructor(public readonly size: BoardSize) {
        super();
        console.assert(Number.isInteger(size.height) && size.height > 0);
        console.assert(Number.isInteger(size.width) && size.width > 0);

        this.numLocs = size.width * size.height;
        this._failure = false;
    }

    private _failure: boolean;

    get failure(): boolean {
        return this._failure;
    }

    get gameOver(): boolean {
        return this.failure || this.success;
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

    /**
     * The subclass has to tell us when the game is over.
     */
    public abstract get success(): boolean;

    private _gameFinishedMineLocations: Set<number> | undefined;

    /**
     *  This is for convenience, processing out the final mine locations so we can use them in calls to lastVisitResult after game end.
     */
    private get gameFinishedMineLocations(): Set<number> | undefined {
        if (!this.gameOver) return undefined;
        if (!this._gameFinishedMineLocations) {
            this._gameFinishedMineLocations = new Set<number>(
                this.mineLocations().map(loc => loc.toNumber(this.size))
            );
        }
        return this._gameFinishedMineLocations;
    }

    /**
     * This needs to be implemented by any subclass. Test if a mine is present at some location.
     * @param loc Where the user is committing to visit.
     */
    public abstract performVisit(loc: BoardLoc): FactualMineTestResult;

    /**
     * Return a board state consistent with the results of performVisit calls made before this was requested.
     * performVisit can be ignored after any call of this, since we are now committed to the entire board state.
     * This needs to be implemented by any subclass.
     */
    public abstract mineLocations(): BoardLoc[];

    /**
     * At any time, you can ask the game what the last result for theching this loc was. No visit is ever madeunder
     * this call.
     * @param loc The board location to check our state of knowledge about.
     */
    public lastVisitResult = (loc: BoardLoc) => {
        const locnum = loc.toNumber(this.size);

        const lastFactualVisit = this.visitResults.get(locnum);
        const visitedNeighbours = loc.neighbours.filter(nloc => this.visitResults.has(nloc.toNumber(this.size)));

        const finalInfo = this.gameOver ?
            {
                gameOver: true,
                containedMine: this.gameFinishedMineLocations!.has(locnum),
            } :
            undefined;

        const diagnostics = this.diagnosticInfo(loc);

        return {
            location: loc,
            locationNum: locnum,
            locationName: loc.toString(),
            onBoard: this.onBoard(loc),
            gameOver: this.gameOver,
            everVisited: !!lastFactualVisit,
            visitedNeighbourCount: visitedNeighbours.length,
            ...lastFactualVisit,
            ...diagnostics,
            ...finalInfo,
        } as MineTestResult;
    }

    public visit(loc: BoardLoc): MineTestResult {
        if (this._failure) {
            throw new Error(`Game is over. You can't visit anywhere anymore.`);
        }

        // Check if this has been visited before, in which case we can just return the result of that visit.
        const lastVisit = this.lastVisitResult(loc);
        if (lastVisit?.everVisited) return lastVisit;

        // Actually do the visit in the gameProvider that extends this class.
        const result = this.performVisit(loc);

        // Permanantly mark the game as done when we've visited a mine, refusing all future visits.
        if (result.explodedMine) {
            console.log('BOOM');
            this._failure = true;
        }


        // // Release an event for the visit occurring.
        // this.dispatchEvent(
        //     new CustomEvent('visit', {
        //         detail: {
        //             visitedLocation: loc,
        //         }
        //     })
        // );

        this.visitResults.set(lastVisit.locationNum, result);

        // Potentially do some work updating a subclass's view of stuff.
        this.runAfterVisit();

        return this.lastVisitResult(loc);
    }

    // Is a given location even on the board.
    public onBoard = (loc: BoardLoc) => this.size.onBoard(loc);


    /**
     * Some info to attach to our responses to lastVisitResult.
     * This can be overridden in subclasses to automatically get some data attached and sent to the view layer.
     * @param loc
     */
    protected diagnosticInfo(loc: BoardLoc): object {
        return {};
    }

    /**
     * This can be overridden by subclasses and is run AFTER every authentic visit is performed before any additional
     * work in the UI.
     */
    protected runAfterVisit(): void {
    }

    // protected numberLocRep = (loc: BoardLoc) => this.size.width * loc.row + loc.col;

}
