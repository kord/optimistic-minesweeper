import {BoardSize} from "./gameProviders/gameProvider";

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

    public static locToString = (loc: BoardLoc) => `${loc.row}-${loc.col}`;

    public toString(): string {
        return `${this.row}-${this.col}`;
    }

    static fromNumber(locnum: number, size: BoardSize) : BoardLoc {
        return new BoardLoc(Math.floor(locnum / size.width), locnum % size.width);
    }
}