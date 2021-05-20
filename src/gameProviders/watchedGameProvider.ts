import {iMinesweeperGameProvider, MinimalProvider} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import Watcher, {WatcherConfig} from "../logic/watcher";
import {DiagnosticInfo, FactualMineTestResult, Observation} from "../types";
import {FixedBoardMinesweeperConfig} from "../constants";

class WatchedGameProvider extends MinimalProvider implements iMinesweeperGameProvider {

    private mineField = new Set<number>();
    private movesMade: number = 0;
    private mineVisited: boolean = false;

    constructor(
        public readonly config: FixedBoardMinesweeperConfig,
        protected watcher: Watcher = new Watcher(config)) {
        super(config.dimensions.size);
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
        return this.totalMines + this.movesMade === this.numLocs && !this.mineVisited;
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
        console.log(`Took ${iterationCount} rounds to find a good board setup.`)
        console.log(`minelocs.size ${this.mineField.size}`)
    }

    /**
     * Required by superclass.
     */
    public performVisit(loc: BoardLoc): FactualMineTestResult {
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
        this.visitAndObserveAll(locn);

        return this.visitResults.get(locn)!;
    }

    /**
     * This should be overridden in subclasses that want to be cooler about how they handle batched visits.
     * @param locs
     */
    public batchVisit = (locs: BoardLoc[]) => {
        if (locs.length === 1) {
            this.visit(locs[0]);
            return 1;
        }
        if (this.movesMade === 0) {
            throw new Error(`You should make some moves normally before doing a batch visit.`);
        }
        const movesBefore = this.movesMade;

        let asYetUnvisited = locs.map(loc => loc.toNumber(this.size))
            .filter(loc => !this.visitResults.has(loc));

        console.log(`BATCH visiting ${asYetUnvisited.length} squares.`);

        this.visitAndObserveAll(...asYetUnvisited);
        return this.movesMade - movesBefore;
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
    public moveSuggestion(): BoardLoc | undefined {
        if (this.gameOver) return undefined;

        // First move right in the middle baby.
        if (this.movesMade === 0) {
            return new BoardLoc(Math.floor(this.size.height / 2), Math.floor(this.size.width / 2));
        }

        let visitables = this.watcher.knownSafeLocs();
        let iter = visitables.keys();
        for (let next = iter.next(); !next.done; next = iter.next()) {
            const loc = next.value;
            if (!this.visitResults.has(loc)) {
                return BoardLoc.fromNumber(loc, this.size);
            }
        }

        // We no longer have certain knowledge we can work with, so we try spots in order of their heuristic safety
        // according to the number of times they appear as mines in the continuations we know.
        const safenessOrder = this.watcher.locationsBySafenessOrder();
        for (let i = 0; i < safenessOrder.length; i++) {
            const loc = safenessOrder[i];
            if (!this.visitResults.has(loc)) {
                console.log('WatchedGameProvider is issuing a possibly unsafe moveSuggestion.');
                return BoardLoc.fromNumber(loc, this.size);
            }
        }

        // Hmm. Nothing in there either. Just return something random.
        console.log('WatchedGameProvider is issuing a braindead moveSuggestion.');
        return super.moveSuggestion();
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
    private visitAndObserveAll(...locs: number[]) {
        const observations: Observation[] = [];

        for (let i = 0; i < locs.length; i++) {
            const locn = locs[i];
            const loc = BoardLoc.fromNumber(locn, this.size);

            // A couple reasons why we might not want to register this loc.
            if (this.mineVisited) break;
            if (this.visitResults.has(locn)) continue;

            const isMine = this.mineField.has(locn);
            let neighboursWithMine = 0;
            loc.neighboursOnBoard(this.size)
                .forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

            // Don't even report the mine to the watcher.
            if (isMine) {
                this.mineVisited = true;
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