import React, {Component} from 'react';
import {iMinesweeperGameProvider, MineTestResult} from "./gameProviders/gameProvider";
import {GameSquare} from "./gameSquare";
import './css/board.css';
import {BoardLoc} from "./boardLoc";
import {BoardOptions} from "./minesweeperGame";


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

        if (this.props.boardOptions.expandWhenEnoughFlagsLaid) {
            this.visitNeighboursOfSatisfiedLocs(loc);
        }
    }

    // Ignore the click if the user has clicked on a flagged square.
    private visitFn = (loc: BoardLoc) => {
        const game = this.props.gameProvider;
        if (game.gameOver) {
            console.error(`Game is over, dummy.`);
            return;
        }
        // Don't visit a flagged spot, even if we have the information to know full well it's safe.
        if (this.props.flaggedLocs.has(loc.toString())) return;

        let lastVisitResult = game.lastVisitResult(loc);
        // No need to revisit, ever.
        if (!lastVisitResult.onBoard || lastVisitResult.everVisited) return;

        console.log(`visiting ${loc.toString()}`);
        const result = this.props.visitFn(loc);

        if (this.props.boardOptions.expandNeighboursOfZero) {
            if (!result.explodedMine && result.neighboursWithMine === 0) {
                loc.neighbours.forEach(this.visitFn);
            }
        }

        if (this.props.boardOptions.expandWhenEnoughFlagsLaid) {
            this.visitNeighboursOfSatisfiedLocs();
        }

        console.log(result)
        return result;
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
        const style = {
            '--rows': this.props.gameProvider.size.height,
            '--cols': this.props.gameProvider.size.width,
        } as React.CSSProperties;

        const boardState = game.locations.map(game.lastVisitResult);

        return (
            <div className={this.boardClasses()}>
                <div className={'board__grid'} style={style}>
                    {boardState.map(testResultRecord =>
                        <GameSquare key={testResultRecord.locationName}
                                    flagged={this.props.flaggedLocs.has(testResultRecord.locationName)}
                                    lastResult={testResultRecord}
                                    flagFn={this.toggleFlagFn}
                                    visitFn={this.visitFn}
                                    boardOptions={this.props.boardOptions}
                        />)}
                </div>
            </div>
        );

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
        const flagsNeeded = game.lastVisitResult(loc).neighboursWithMine;
        // Ignore if loc has not already been visited.
        if (flagsNeeded === undefined) return 0;

        if (this.flaggedNeighbours(loc) === flagsNeeded) {
            const unvisitedNeighbours = loc.neighboursOnBoard(game.size)
                .filter(nloc => !game.lastVisitResult(nloc).everVisited && !this.props.flaggedLocs.has(nloc.toString()));
            if (unvisitedNeighbours.length === 0) return 0;
            // unvisitedNeighbours.forEach(loc => console.log(`unvisitedNeighbours has ${loc.toString()}`))
            unvisitedNeighbours.forEach(loc => {
                if (!game.gameOver) this.props.visitFn(loc);
            });
            return unvisitedNeighbours.length;
        }
        return 0;
    }

    private flaggedNeighbours = (loc: BoardLoc) =>
        loc.neighboursOnBoard(this.props.gameProvider.size)
            .map(loc => loc.toString())
            .filter(strloc => this.props.flaggedLocs.has(strloc))
            .length;

}

export default Board;