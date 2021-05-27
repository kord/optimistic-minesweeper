import {iMinesweeperGameProvider, MinimalProvider} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import Watcher, {DiagnosticInfo, iWatcher, WatcherConfig} from "../logic/watcher";
import {FactualMineTestResult, Observation} from "../types";
import {Constants, FixedBoardMinesweeperConfig} from "../constants";

class WatchedGameProvider extends MinimalProvider implements iMinesweeperGameProvider {

    private mineField = new Set<number>();
    private movesMade: number = 0;
    protected watcher: iWatcher;

    constructor(
        public readonly config: FixedBoardMinesweeperConfig,
        watcher: Watcher = new Watcher(config, Constants.defaultWatcherConfig)) {
        super(config.dimensions.size);
        this.watcher = watcher;
    }

    /**
     * Required by superclass.
     */
    public get totalMines(): number {
        return this.config.dimensions.mineCount;
    }

    /**
     * Required by superclass.
     */
    public get success(): boolean {
        return this.totalMines + this.movesMade === this.numLocs && !this.failure;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        const locNumber = loc.toNumber(this.size);
        return this.mineField.has(locNumber);
    }

    rewriteStaticMineLocationsAsNeededByConfig = (loc: BoardLoc) => {
        this.mineField.clear();

        if (this.totalMines < 0 || this.totalMines > this.numLocs) {
            console.error(`Bad minecount. You tried to put ${this.totalMines} mines in a playing area of size ${this.numLocs}`);
            return;
        }
        if (this.config.firstMoveAlwaysZero) {
            if (this.numLocs - this.totalMines < 9) {
                console.error('There needs to be space for a first move and neighbours. Use fewer mines.');
                return;
            }
        }
        if (this.config.firstMoveNeverMined) {
            if (this.totalMines >= this.numLocs) {
                console.error('There needs to be space for a first move. Use fewer mines.');
                return;
            }
        }

        let prohibitedLocs: BoardLoc[] = [];
        if (this.config.firstMoveAlwaysZero) {
            prohibitedLocs.push(...loc.neighboursOnBoard(this.size));
        }
        if (this.config.firstMoveNeverMined) {
            prohibitedLocs.push(loc);
        }

        let iterationCount = 0;
        while (this.mineField.size < this.totalMines) {
            while (this.mineField.size < this.totalMines) {
                this.mineField.add(Math.floor(Math.random() * this.numLocs));
            }
            prohibitedLocs.forEach(loc => this.mineField.delete(loc.toNumber(this.size)));
            iterationCount++;
        }
        // console.log(`Took ${iterationCount} rounds to find a good board setup.`)
        // console.log(`minelocs.size ${this.mineField.size}`)
    }

    private addLocAndZeroNeighbours = (loc: BoardLoc, neededVisits: Set<number>) => {
        const locn = loc.toNumber(this.size);
        if (neededVisits.has(locn)) return;
        neededVisits.add(locn);

        const neighbours = loc.neighboursOnBoard(this.size);
        if (neighbours.filter(this.hasMine).length === 0) {
            neighbours.forEach(loc => this.addLocAndZeroNeighbours(loc, neededVisits));
        }
    }

    /**
     * Required by superclass.
     */
    public performVisit(loc: BoardLoc,
                        autoVisitNeighboursOfZeros: boolean = false,
                        autoVisitKnownNonMines: boolean = false) {
        // Rewrite the board so the first move is nice.
        if (this.movesMade === 0) {
            this.rewriteStaticMineLocationsAsNeededByConfig(loc);
        }

        // Give subclasses an opportunity to rewrite the mines in response to the user move.
        if (this.movesMade !== 0) {
            const newMines = this.changedMinefieldInResponseToNextVisit(loc);
            if (newMines) this.mineField = newMines;
        }

        const locn = loc.toNumber(this.size);

        let additionalVisits = new Set<number>();
        const include = autoVisitNeighboursOfZeros ?
            ((loc: BoardLoc) => this.addLocAndZeroNeighbours(loc, additionalVisits)) :
            ((loc: BoardLoc) => additionalVisits.add(loc.toNumber(this.size)));

        if (autoVisitNeighboursOfZeros) {
            include(loc);
        }

        if (autoVisitKnownNonMines) {
            const iter = this.watcher.knownSafeLocations.keys();
            for (let i = iter.next(); !i.done; i = iter.next()) {
                const locn = i.value;
                const loc = BoardLoc.fromNumber(locn, this.size);
                if (!this.visitResults.has(locn))
                    include(loc);
            }
        }

        this.visitAndObserveAll(Array.from(additionalVisits));

        if (this.gameOver) {
            this.watcher.logWatcherInfo();
        }
    }

    /**
     * Required by superclass.
     */
    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

    /**
     * Override of superclass.
     */
    public moveSuggestion(guessCornerFirst: boolean): BoardLoc | undefined {
        const logStuffHere = true;
        if (this.gameOver) return undefined;

        // First move right in the middle baby.
        if (this.movesMade === 0) {
            if (guessCornerFirst) return new BoardLoc(0,0);
            return new BoardLoc(Math.floor(this.size.height / 2), Math.floor(this.size.width / 2));
        }

        // Take one of the known safe moves.
        let visitables = this.watcher.knownSafeLocations;
        let iter = visitables.keys();
        for (let next = iter.next(); !next.done; next = iter.next()) {
            const loc = next.value;
            if (!this.visitResults.has(loc)) {
                return BoardLoc.fromNumber(loc, this.size);
            }
        }

        // We no longer have certain knowledge we can work with, so we try spots in order of their heuristic safety
        // according to the number of times they appear as mines in the continuations we know.

        // Before we have to guess, roll out a few more minefields to help us get the stats right.
        this.watcher.findAndStoreContinuations();
        const safenessOrder = this.watcher.locationsBySafenessOrder();
        for (let i = 0; i < safenessOrder.length; i++) {
            const loc = safenessOrder[i];
            if (!this.visitResults.has(loc)) {
                const mineProbability = (this.watcher.diagnosticInfo(BoardLoc.fromNumber(loc, this.size)).mineProbability!).toFixed(2);
                if (logStuffHere) console.log(`WatchedGameProvider is issuing a possibly unsafe moveSuggestion: ${mineProbability}`);
                return BoardLoc.fromNumber(loc, this.size);
            }
        }

        // Hmm. Nothing in there either. Just return something random.
        if (logStuffHere) console.log('WatchedGameProvider is issuing a braindead moveSuggestion.');
        return super.moveSuggestion(guessCornerFirst);
    }

    /**
     * This can be rewritten by subclasses to change the overall behaviour.
     * @param loc Place we're about to visit at the request of the user.
     */
    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc): Set<number> | undefined {
        return undefined;
    }

    /**
     * Override of superclass.
     */
    protected diagnosticInfo(loc: BoardLoc): DiagnosticInfo {
        if (this.visitResults.has(loc.toNumber(this.size))) return {};
        return this.watcher.diagnosticInfo(loc);
    }

    /**
     * We do eh, some error checking here, just observe everything at once.
     * @param locs
     */
    private visitAndObserveAll(locs: number[]) {
        const observations: Observation[] = [];

        for (let i = 0; i < locs.length; i++) {
            if (this.gameOver) break;
            const locn = locs[i];
            const loc = BoardLoc.fromNumber(locn, this.size);

            // A couple reasons why we might not want to register this loc.
            if (this.visitResults.has(locn)) continue;

            const isMine = this.mineField.has(locn);
            let neighboursWithMine = 0;
            loc.neighboursOnBoard(this.size)
                .forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

            if (isMine) {
                this._failure = true;
            }

            const result = {
                explodedMine: isMine,
                neighboursWithMine: neighboursWithMine,
            }
            this.visitResults.set(locn, result);
            this.movesMade++;

            observations.push({loc: loc, result: result});
        }
        this.watcher.observe(observations);
    }
}


export default WatchedGameProvider;