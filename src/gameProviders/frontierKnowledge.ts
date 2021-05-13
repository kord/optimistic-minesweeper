import {BoardSize} from "./gameProvider";
import {BoardLoc} from "../boardLoc";

/**
 * Tracking the state of our knowledge about the minefield's frontier.
 */
export class FrontierKnowledge {
    private frontier = new Set<number>();
    private nonRequired = new Set<number>();
    private requiredMines = new Set<number>();
    private requiredEmpty = new Set<number>();
    private expired = new Set<number>();

    constructor(private readonly size: BoardSize) {
    }

    introduce = (loc: BoardLoc) => {
        if (!this.size.onBoard(loc)) return;
        const locn = loc.toNumber(this.size);
        if (this.frontier.has(locn) || this.expired.has(locn)) return;
        this.frontier.add(locn);
        this.nonRequired.add(locn);
    }

    setMine = (loc: BoardLoc) => {
        this.fixSetLocation(loc, this.requiredMines, this.requiredEmpty);
    }

    setEmpty = (loc: BoardLoc) => {
        this.fixSetLocation(loc, this.requiredEmpty, this.requiredMines);
    }

    remove = (loc: BoardLoc) => {
        const locnum = loc.toNumber(this.size);
        const wasPresent = this.frontier.delete(locnum);
        if (wasPresent) {
            this.requiredEmpty.delete(locnum);
            this.requiredMines.delete(locnum);
            this.nonRequired.delete(locnum);
        } else {
            console.error(`Location ${loc} was not in the frontier.`);
        }
        this.expired.add(locnum);
        return wasPresent;
    }

    isRequiredMine = (loc: BoardLoc) => {
        return this.requiredMines.has(loc.toNumber(this.size));
    }

    isRequiredEmpty = (loc: BoardLoc) => {
        return this.requiredEmpty.has(loc.toNumber(this.size));
    }

    onFrontierAndUnknown = (loc: BoardLoc) => {
        return this.nonRequired.has(loc.toNumber(this.size));
    }

    private fixSetLocation(loc: BoardLoc, insertionSet: Set<number>, absenceSet: Set<number>) {
        const locn = loc.toNumber(this.size);
        console.assert(this.frontier.has(locn), `${loc} has not been properly introduced yet.`);
        console.assert(!absenceSet.has(locn), `${loc} is in the wrong set already.`);
        this.nonRequired.delete(locn);
        insertionSet.add(locn);

    }
}