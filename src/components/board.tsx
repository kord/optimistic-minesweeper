import React, {Component} from 'react';
import {GameSquare} from "./gameSquare";
import '../css/board.css';
import {BoardLoc} from "../boardLoc";
import {BoardOptions} from "../constants";
import {iMinesweeperGameProvider} from "../gameProviders/gameProvider";


interface BoardProps {
    gameProvider: iMinesweeperGameProvider,
    visitFn: (loc: BoardLoc) => void,
    toggleFlagFn: (loc: BoardLoc) => void,
    flaggedLocs: Set<string>,
    boardOptions: BoardOptions,
}

interface Boardstate {
}

class Board extends Component<BoardProps, Boardstate> {

    constructor(props: BoardProps) {
        super(props);
        this.state = {}
    }

    private toggleFlagFn = (loc: BoardLoc) => {
        const game = this.props.gameProvider;
        this.props.toggleFlagFn(loc);

        const visits = this.doAppropriateAutomaticVisitsRecursively();
        if (visits > 0) this.forceUpdate();
        return visits;
    }


    // Ignore the click if the user has clicked on a flagged square.
    public visitFn = (loc: BoardLoc) => {
        const game = this.props.gameProvider;
        if (game.gameOver) {
            console.error(`Game is over, dummy.`);
            return;
        }

        // Don't visit a flagged spot, even if we have the information to know full well it's safe.
        if (this.isFlagged(loc)) return;
        if (game.alreadyVisited(loc)) return;
        if (!game.size.onBoard(loc)) return;

        this.props.visitFn(loc);

        if (this.props.boardOptions.autoVisitNeighboursOfFlagSatisfiedNumbers) {
            const visits = this.doAppropriateAutomaticVisitsRecursively();
            if (visits) this.forceUpdate();
        }
    }

    private doAppropriateAutomaticVisitsRecursively(maxRounds: number = 100): number {
        const game = this.props.gameProvider;
        let totalVisits = 0;
        let visitsMade = 1;
        let roundsMade = 0;
        while (visitsMade > 0 && roundsMade < maxRounds) {
            roundsMade++;
            visitsMade = 0;

            const locs = this.appropriateAutomaticVisits();
            const iter = locs.keys();
            for (let i = iter.next(); !i.done; i = iter.next()) {
                if (game.gameOver) break;
                const loc = BoardLoc.fromNumber(i.value, game.size);
                // Ignore if visited or flagged.
                if (!game.alreadyVisited(loc) && !this.isFlagged(loc)) {
                    this.props.visitFn(loc);
                    visitsMade++;
                }
            }
            // visitsMade = this.props.visitFn(Array.from(locs).map(loc => BoardLoc.fromNumber(loc, game.size)));
            totalVisits += visitsMade;
            console.log(`doAppropriateAutomaticVisitsRecursively round ${roundsMade}, visitsMade ${visitsMade}`);
        }
        return totalVisits;

        // const size = this.props.gameProvider.size;
        // const locs = this.appropriateAutomaticVisits();
        // const visitsMade = this.props.visitFn(Array.from(locs).map(loc => BoardLoc.fromNumber(loc, size)));
        // if (visitsMade === 0) return 0;
        //
        // // If we have to do a recursive call, do it in this weird way so the board can refresh in the meantime.
        // const p = new Promise<number>((resolve, reject) => {
        //     setImmediate(() => {
        //         resolve(this.doAppropriateAutomaticVisitsRecursively());
        //     });
        // });
        //
        // return visitsMade + await p;
    }

    private appropriateAutomaticVisits(): Set<number> {
        const game = this.props.gameProvider;

        const needsOpening = new Set<number>();
        // if (this.props.boardOptions.autoVisitNeighboursOfZeros) {
        //     const zeroes = game.locations.filter(loc => game.lastVisitResult(loc).neighboursWithMine === 0);
        //     zeroes.forEach(loc => loc.neighboursOnBoard(game.size)
        //         .forEach(nloc => needsOpening.add(nloc.toNumber(game.size)))
        //     );
        // }

        if (this.props.boardOptions.autoVisitNeighboursOfFlagSatisfiedNumbers) {
            const flagMatches = game.locations.filter(loc => {
                const flags = this.flaggedNeighbours(loc);
                return game.lastVisitResult(loc).neighboursWithMine === flags;
            });
            flagMatches.forEach(loc => loc.neighboursOnBoard(game.size)
                .forEach(nloc => needsOpening.add(nloc.toNumber(game.size)))
            );
        }

        // if (this.props.boardOptions.autoVisitWatcherKnownNonMines) {
        //     const knownNonMines = game.locations.filter(loc =>
        //         game.lastVisitResult(loc).diagnostics?.knownNonMine);
        //     knownNonMines.forEach(nloc => needsOpening.add(nloc.toNumber(game.size)));
        // }

        // Prohibit opening of flagged locations.
        game.locations.forEach(loc => {
            if (this.isFlagged(loc))
                needsOpening.delete(loc.toNumber(game.size));
        });

        return needsOpening;
    }


    boardClasses() {
        const ret = [
            'board',
        ];
        if (this.props.gameProvider.gameOver) ret.push('board--game-over')
        return ret.join(' ');
    }

    render() {
        const game = this.props.gameProvider;

        const boardState = game.locations.map(game.lastVisitResult);


        return (
            <div className={this.boardClasses()}>
                <div className={'board__grid'}>
                    {boardState.map(testResultRecord =>
                        <GameSquare key={testResultRecord.locationName}
                                    flagged={this.props.flaggedLocs.has(testResultRecord.locationName)}
                                    flaggedNeighbours={this.flaggedNeighbours(testResultRecord.location)}
                                    inferredMineNeighbours={this.inferredMineNeighbours(testResultRecord.location)}
                                    flaggedOrInferredMineNeighbours={this.flaggedOrInferredMineNeighbours(testResultRecord.location)}
                                    lastResult={testResultRecord}
                                    flagFn={this.toggleFlagFn}
                                    visitFn={loc => this.visitFn(loc)}
                                    boardOptions={this.props.boardOptions}
                        />)}
                </div>
            </div>
        );

    }

    private isFlagged = (loc: BoardLoc) => this.props.flaggedLocs.has(loc.toString());

    private flaggedNeighbours = (loc: BoardLoc) => {
        const game = this.props.gameProvider;
        return loc.neighboursOnBoard(game.size)
            .filter(this.isFlagged)
            .length;
    };

    private inferredMineNeighbours = (loc: BoardLoc) =>
        loc.neighboursOnBoard(this.props.gameProvider.size)
            .filter(loc => this.props.gameProvider.lastVisitResult(loc).diagnostics?.knownMine)
            .length;

    private flaggedOrInferredMineNeighbours = (loc: BoardLoc) =>
        loc.neighboursOnBoard(this.props.gameProvider.size)
            .filter(loc => this.props.gameProvider.lastVisitResult(loc).diagnostics?.knownMine || this.isFlagged(loc))
            .length;

}

export default Board;