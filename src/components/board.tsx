import React, {Component} from 'react';
import {GameSquare} from "./gameSquare";
import '../css/board.css';
import {BoardLoc} from "../boardLoc";
import {BoardOptions} from "../constants";
import {MineTestResult} from "../types";
import {iMinesweeperGameProvider} from "../gameProviders/gameProvider";


interface BoardProps {
    gameProvider: iMinesweeperGameProvider,
    visitFn: (loc: BoardLoc) => MineTestResult,
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
    public visitFn = (loc: BoardLoc, allowAutomaticVisits = true) => {
        let openedSquares = 0;
        const game = this.props.gameProvider;
        if (game.gameOver) {
            console.error(`Game is over, dummy.`);
            return 0;
        }
        // Don't visit a flagged spot, even if we have the information to know full well it's safe.
        if (this.isFlagged(loc)) return 0;

        let lastVisitResult = game.lastVisitResult(loc);
        // No need to revisit, ever.
        if (!lastVisitResult.onBoard || lastVisitResult.everVisited) return 0;

        // console.log(`visiting ${loc.toString()}`);
        const result = this.props.visitFn(loc);
        if (result.everVisited) openedSquares += 1;

        if (allowAutomaticVisits) {
            const visits = this.doAppropriateAutomaticVisitsRecursively();
            if (visits) this.forceUpdate();
            openedSquares += visits;
        }

        // console.log(result)
        return openedSquares;
    }

    private visitNeighboursOfSatisfiedLocs(seed?: BoardLoc): number {
        const game = this.props.gameProvider;
        // Drop out early if there's nothing we can possibly do in here.
        if (game.gameOver) return 0;

        // If we're given a seed to start with, we can drop out if there's no progress made by trying its neighbours.
        // Otherwise, who knows, we might have to visit everything on the board!
        const placesToTry = (seed === undefined) ? game.locations : seed.neighboursOnBoard(game.size);

        let visitCount = 0;
        placesToTry.forEach(loc => {
            visitCount += this.visitNeighboursIfSatisfiedByFlags(loc);
        });

        console.log(`visitAllSatisfiedLocs round caused ${visitCount} visits...`);

        // Do this recursively until nothing changes.
        if (visitCount > 0) {
            visitCount += this.visitNeighboursOfSatisfiedLocs();
        }

        return visitCount;
    }

    private visitNeighboursIfSatisfiedByFlags(loc: BoardLoc): number {
        const game = this.props.gameProvider;
        let openedSquares = 0;
        const flagsNeeded = game.lastVisitResult(loc).neighboursWithMine;
        // Ignore if loc has not already been visited.
        if (flagsNeeded === undefined) return 0;

        if (this.flaggedNeighbours(loc) === flagsNeeded) {
            const unvisitedNeighbours = loc.neighboursOnBoard(game.size)
                .filter(nloc => !game.lastVisitResult(nloc).everVisited && !this.isFlagged(nloc));
            if (unvisitedNeighbours.length === 0) {
                return openedSquares;
            }
            // unvisitedNeighbours.forEach(loc => console.log(`unvisitedNeighbours has ${loc.toString()}`))
            unvisitedNeighbours.forEach(loc => {
                if (!game.gameOver) {
                    openedSquares += this.visitFn(loc);
                }
            });

        }
        return openedSquares;
    }

    private doAppropriateAutomaticVisitsRecursively(): number {
        const game = this.props.gameProvider;
        let totalVisits = 0;
        let visitsMade = 1;
        while (visitsMade > 0) {
            const locs = this.appropriateAutomaticVisits();
            visitsMade = game.batchVisit(Array.from(locs).map(loc => BoardLoc.fromNumber(loc, game.size)));
            // const iter = locs.keys();
            // for (let val = iter.next(); !val.done; val = iter.next()) {
            //     const loc = BoardLoc.fromNumber(val.value, game.size);
            //     visitsMade += this.visitFn(loc, false);
            // }
            totalVisits += visitsMade;
        }
        return totalVisits;
    }

    private appropriateAutomaticVisits(): Set<number> {
        const game = this.props.gameProvider;

        const needsOpening = new Set<number>();
        if (this.props.boardOptions.autoVisitNeighboursOfZeros) {
            const zeroes = game.locations.filter(loc => game.lastVisitResult(loc).neighboursWithMine === 0);
            zeroes.forEach(loc => loc.neighboursOnBoard(game.size)
                .forEach(nloc => needsOpening.add(nloc.toNumber(game.size)))
            );
        }

        if (this.props.boardOptions.autoVisitNeighboursOfFlagSatisfiedNumbers) {
            const flagMatches = game.locations.filter(loc =>
                game.lastVisitResult(loc).neighboursWithMine === this.flaggedNeighbours(loc));
            flagMatches.forEach(loc => loc.neighboursOnBoard(game.size)
                .forEach(nloc => needsOpening.add(nloc.toNumber(game.size)))
            );
        }

        if (this.props.boardOptions.autoVisitDiagnosticKnownNonMines) {
            const knownNonMines = game.locations.filter(loc =>
                game.lastVisitResult(loc).diagnostics?.knownNonMine);
            knownNonMines.forEach(nloc => needsOpening.add(nloc.toNumber(game.size)));
        }

        // Prohibit opening of flagged locations, maybe?

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
                                    visitFn={loc => this.visitFn(loc, true)}
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