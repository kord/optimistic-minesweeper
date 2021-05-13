import React, {Component} from 'react';
import {iMinesweeperGameProvider, MineTestResult} from "./gameProviders/gameProvider";
import {GameSquare} from "./gameSquare";
import './css/board.css';
import {BoardLoc} from "./boardLoc";


interface BoardProps {
    gameProvider: iMinesweeperGameProvider,
    visitFn: (loc: BoardLoc) => MineTestResult,
    toggleFlagFn: (loc: BoardLoc) => void,
    flaggedLocs: Set<string>,
}

interface Boardstate {
}

class Board extends Component<BoardProps, Boardstate> {
    constructor(props: BoardProps) {
        super(props);
        this.state = {}
    }

    // Ignore the click if the user has clicked on a flagged square.
    visitFn = (loc: BoardLoc) => {
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

        if (!result.explodedMine && result.neighboursWithMine === 0) {
            loc.neighbours.forEach(this.visitFn);
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

        const boardState = game.locations.map(loc => game.lastVisitResult(loc));

        return (
            <div className={this.boardClasses()}>
                <div className={'board__grid'} style={style}>
                    {boardState.map(testResultRecord =>
                        <GameSquare key={testResultRecord.locationName}
                                    flagged={this.props.flaggedLocs.has(testResultRecord.locationName)}
                                    lastResult={testResultRecord}
                                    flagFn={this.props.toggleFlagFn}
                                    visitFn={this.visitFn}
                        />)}
                </div>
            </div>
        );

    }
}

export default Board;