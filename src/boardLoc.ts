import {BoardSize} from "./boardSize";

export class BoardLoc {
    private static boardLocMatcher = new RegExp(`^([0-9]+)-([0-9]+)$`);

    constructor(public readonly  row: number, public readonly    col: number) {
    }

    public get neighbours(): BoardLoc[] {
        return [
            new BoardLoc(this.row, this.col - 1),
            new BoardLoc(this.row, this.col + 1),
            new BoardLoc(this.row + 1, this.col),
            new BoardLoc(this.row - 1, this.col),
            new BoardLoc(this.row + 1, this.col + 1),
            new BoardLoc(this.row + 1, this.col - 1),
            new BoardLoc(this.row - 1, this.col + 1),
            new BoardLoc(this.row - 1, this.col - 1),
        ];
    }

    public static fromString(str: string): BoardLoc | undefined {
        let test = this.boardLocMatcher.exec(str);
        if (test) {
            return new BoardLoc(+test[1], +test[2]);
        }
    }

    // public static locToString = (loc: BoardLoc) => `${loc.row}-${loc.col}`;

    static fromNumber(locnum: number, size: BoardSize): BoardLoc {
        return new BoardLoc(Math.floor(locnum / size.width), locnum % size.width);
    }

    public toString(): string {
        return `${this.row}-${this.col}`;
    }

    public toNumber = (size: BoardSize) => size.width * this.row + this.col;

    public neighboursOnBoard = (boardSize: BoardSize) => this.neighbours.filter(boardSize.onBoard);

    public neighbourhoodIncludingSelf = (boardSize: BoardSize) => [...this.neighbours, this].filter(boardSize.onBoard);

    /**
     * Is this near enough to another location that they share a neighbour or more?
     * @param other
     */
    public near(other: BoardLoc) : boolean {
        return Math.abs(this.col - other.col) <= 2 && Math.abs(this.row - other.row) <= 2;
    }
}