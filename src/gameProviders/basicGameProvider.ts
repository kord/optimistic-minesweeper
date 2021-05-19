import {iMinesweeperGameProvider, MinimalProvider} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {FactualMineTestResult} from "../types";
import {FixedBoardMinesweeperConfig} from "../constants";

class BasicGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private mineField = new Set<number>();
    private movesMade: number = 0;
    private mineVisited: Boolean = false;
    private firstMoveMade = false;

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);

        console.assert(this.config.mineCount > 0,
            'The game is boring without any mines.');
        if (config.firstMoveAlwaysZero) {
            console.assert(this.numLocs - this.config.mineCount > 9,
                'There needs to be space for a first move and neighbours. Use fewer mines.');
        }
        if (config.firstMoveNeverMined) {
            console.assert(this.numLocs > this.config.mineCount,
                'There needs to be space for a first move. Use fewer mines.');
        }
    }

    public get totalMines(): number {
        return this.config.mineCount;
    }

    get success(): boolean {
        return !this.mineVisited && this.config.mineCount + this.movesMade === this.numLocs;
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        return this.mineField.has(loc.toNumber(this.size));
    }

    rewriteStaticMineLocationsAsNeededByConfig = (loc: BoardLoc) => {
        this.mineField.clear();

        if (this.config.mineCount < 0 || this.config.mineCount > this.numLocs) {
            console.error(`Bad minecount. You tried to put ${this.config.mineCount} mines in a playing area of size ${this.numLocs}`);
            return;
        }
        if (this.config.firstMoveAlwaysZero) {
            if (this.numLocs - this.config.mineCount < 9) {
                console.error('There needs to be space for a first move and neighbours. Use fewer mines.');
                return;
            }
        }
        if (this.config.firstMoveNeverMined) {
            if (this.config.mineCount >= this.numLocs) {
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
        while (this.mineField.size < this.config.mineCount) {
            while (this.mineField.size < this.config.mineCount) {
                this.mineField.add(Math.floor(Math.random() * this.numLocs));
            }
            prohibitedLocs.forEach(loc => this.mineField.delete(loc.toNumber(this.size)));
            iterationCount++;
        }
        console.log(`Took ${iterationCount} rounds to find a good board setup.`)
        console.log(`minelocs.size ${this.mineField.size}`)
    }

    // rewriteStaticMineLocations = () => {
    //     this.mineField.clear();
    //     while (this.mineField.size < this.config.mineCount) {
    //         this.mineField.add(Math.floor(Math.random() * this.numLocs));
    //     }
    //     console.log(`mineField.size ${this.mineField.size}`)
    // }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        // while (!this.firstMoveMade && (this.hasMine(loc)) || loc.neighboursOnBoard(this.size).some(this.hasMine)) {
        //     this.rewriteStaticMineLocations();
        // }
        if (!this.firstMoveMade) this.rewriteStaticMineLocationsAsNeededByConfig(loc);
        this.firstMoveMade = true;
        this.movesMade++;

        let neighboursWithMine = 0;
        loc.neighbours.forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

        const isMine = this.hasMine(loc);
        if (isMine) this.mineVisited = true;

        return {
            explodedMine: isMine,
            neighboursWithMine: neighboursWithMine,
        }
    }

    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

}

export default BasicGameProvider;