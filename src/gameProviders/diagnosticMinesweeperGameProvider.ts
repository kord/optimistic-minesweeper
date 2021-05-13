import {
    FactualMineTestResult,
    FixedBoardMinesweeperConfig,
    iMinesweeperGameProvider,
    MinimalProvider
} from "./gameProvider";
import {BoardLoc} from "../boardLoc";

class DiagnosticMinesweeperGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    private readonly minelocs = new Set<number>();

    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.size);

        const numLocs = this.size.width * this.size.height;
        console.assert(this.config.mineCount && this.config.mineCount > 0 && this.config.mineCount <= numLocs);


        while (this.minelocs.size < config.mineCount) {
            this.minelocs.add(
                Math.floor(Math.random() * numLocs));
        }
    }

    hasMine = (loc: BoardLoc) => {
        if (!this.onBoard(loc)) return false;
        const locNumber = this.size.width * loc.row + loc.col;
        return this.minelocs.has(locNumber);
    }

    public performVisit(loc: BoardLoc): FactualMineTestResult {
        let neighboursWithMine = 0;
        loc.neighbours.forEach(nloc => neighboursWithMine += this.hasMine(nloc) ? 1 : 0);

        return {
            explodedMine: this.hasMine(loc),
            neighboursWithMine: neighboursWithMine,
        }
    }

    mineLocations(): BoardLoc[] {
        return this.locations.filter(this.hasMine);
    }

}

export default DiagnosticMinesweeperGameProvider;