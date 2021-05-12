import {BoardLoc, BoardSize, iMineSweeperGameProvider, MineTestResult} from "./gameProvider";


export class FixedBoardMinesweeper implements iMineSweeperGameProvider {
    constructor(public readonly size: BoardSize) {
        console.assert(Number.isInteger(size.height) && size.height > 0);
        console.assert(Number.isInteger(size.width) && size.width > 0);

        // TODO: Generate a board.
    }

    public visit(loc: BoardLoc) : MineTestResult {

    }
}