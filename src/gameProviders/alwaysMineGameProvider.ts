import {iMinesweeperGameProvider, MinimalProvider} from "./gameProvider";
import {BoardLoc} from "../boardLoc";
import {FactualMineTestResult} from "../types";
import {FixedBoardMinesweeperConfig} from "../constants";


class AlwaysMineGameProvider extends MinimalProvider implements iMinesweeperGameProvider {
    constructor(public readonly config: FixedBoardMinesweeperConfig) {
        super(config.dimensions.size);
    }

    get success(): boolean {
        return false;
    }

    public get totalMines(): number {
        return this.numLocs;
    }

    public performVisit(loc: BoardLoc,
                        autoVisitNeighboursOfZeros: boolean = false,
                        autoVisitKnownNonMines: boolean = false) {
        const ret = {
            explodedMine: true,
        };
        this.visitResults.set(loc.toNumber(this.size), ret);
    }

    mineLocations(): BoardLoc[] {
        return this.locations;
    }
}

export default AlwaysMineGameProvider;