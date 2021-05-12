export interface BoardSize {
    height: number,
    width: number,
}

export interface BoardLoc {
    row: number,
    col: number,
}

export interface MineTestResult {
    containsMine: boolean,
    neighboursWithMine?: number,

}

export interface iMineSweeperGameProvider {
    size: BoardSize,
    visit: (loc: BoardLoc) => MineTestResult,
}