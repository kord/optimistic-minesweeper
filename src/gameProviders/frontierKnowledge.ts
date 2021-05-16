import {BoardLoc} from "../boardLoc";
import {BoardSize} from "../boardSize";

/**
 * Tracking the state of our knowledge about the minefield's frontier.
 */
export class FrontierKnowledge {
    private frontier = new Set<number>();
    private nonRequired = new Set<number>();
    private requiredMines = new Set<number>();
    private requiredEmpty = new Set<number>();
    private expired = new Set<number>();

    public get unknowns() {
        return this.nonRequired;
    }

    public get size() : number {
        return this.frontier.size;
    }

    public get unknownSize() : number {
        return this.nonRequired.size;
    }

    constructor(readonly boardSize: BoardSize) {
    }

    introduce = (loc: BoardLoc) => {
        if (!this.boardSize.onBoard(loc)) return;
        const locn = loc.toNumber(this.boardSize);
        if (this.frontier.has(locn) || this.expired.has(locn)) return;
        this.frontier.add(locn);
        this.nonRequired.add(locn);
    }

    setMine = (loc: BoardLoc) => this.fixSetLocation(loc, this.requiredMines, this.requiredEmpty);


    setEmpty = (loc: BoardLoc) => this.fixSetLocation(loc, this.requiredEmpty, this.requiredMines);


    remove = (loc: BoardLoc) => {
        const locnum = loc.toNumber(this.boardSize);
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
        return this.requiredMines.has(loc.toNumber(this.boardSize));
    }

    isRequiredEmpty = (loc: BoardLoc) => {
        return this.requiredEmpty.has(loc.toNumber(this.boardSize));
    }

    onFrontierAndUnknown = (loc: BoardLoc) => {
        return this.nonRequired.has(loc.toNumber(this.boardSize));
    }

    public setAllEmpty(locs: BoardLoc[]): number {
        let tot = 0;
        locs.forEach(loc => tot += this.setEmpty(loc));
        return tot;
    }

    public setAllMine(locs: BoardLoc[]): number {
        let tot = 0;
        locs.forEach(loc => tot += this.setMine(loc));
        return tot;
    }

    private fixSetLocation(loc: BoardLoc, insertionSet: Set<number>, absenceSet: Set<number>): number {
        const locn = loc.toNumber(this.boardSize);
        if (insertionSet.has(locn)) return 0;
        console.assert(this.frontier.has(locn), `${loc} has not been properly introduced yet.`);
        console.assert(!absenceSet.has(locn), `${loc} is in the wrong set already.`);
        this.nonRequired.delete(locn);
        insertionSet.add(locn);
        return 1;
    }
}