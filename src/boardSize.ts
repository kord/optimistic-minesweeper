import {BoardLoc} from "./boardLoc";

export class BoardSize {
    constructor(public readonly height: number,
                public readonly width: number) {
    }

    /**
     * Is a given location even on the board.
     * @param loc Location to check for sanity.
     */
    public onBoard = (loc: BoardLoc) => loc.row >= 0 && loc.col >= 0 && loc.row < this.height && loc.col < this.width;


}