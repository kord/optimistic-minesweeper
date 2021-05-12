import React, {Component} from 'react';
import {iMinesweeperGameProvider, MineTestResult, MinimalProvider} from "./gameProvider";
import {GameSquare} from "./gameSquare";
import './css/board.css';
import {BoardLoc} from "./boardLoc";


interface BoardProps {
    gameProvider: iMinesweeperGameProvider,
    visitFn: (loc: BoardLoc) => MineTestResult,
}

interface Boardstate {
    flaggedLocs: Set<string>,
}

class Board extends Component<BoardProps, Boardstate> {
    constructor(props: BoardProps) {
        super(props);
        this.state = {
            flaggedLocs: new Set<string>(),
        }
    }

    toggleFlag = (loc: BoardLoc) => {
        // Can't flag a visited spot. You already know what it is.
        if (this.props.gameProvider.lastVisitResult(loc).everVisited) return;

        const locString = loc.toString();
        if (this.state.flaggedLocs.has(locString)) {
            this.state.flaggedLocs.delete(locString);
        } else {
            this.state.flaggedLocs.add(locString)
        }
        // Force update because we're changing the thing in our state without properly setting state.
        this.forceUpdate();
    }

    // Ignore the click if the user has clicked on a flagged square.
    visitFn = (loc: BoardLoc) => {
        // No need to revisit, ever.
        if (this.props.gameProvider.lastVisitResult(loc).everVisited) return;
        // Don't visit a flagged spot, even if we know full well it's safe.
        if (this.state.flaggedLocs.has(loc.toString())) return;


        if (this.state.flaggedLocs.has(loc.toString())) return;
        const result = this.props.visitFn(loc);
        if (!result.containsMine && result.neighboursWithMine === 0) {
            loc.neighbours.forEach(this.visitFn);
        }
        return result;
    }


    render() {
        const game = this.props.gameProvider;
        const style = {
            '--rows': this.props.gameProvider.size.height,
            '--cols': this.props.gameProvider.size.width,
        } as React.CSSProperties;

        const boardState = game.locations.map(loc => game.lastVisitResult(loc));

        return (
            <div className={'board'}>
                <div className={'board__grid'} style={style}>
                    {boardState.map(tr =>
                        <GameSquare key={tr.locationName}
                                    flagged={this.state.flaggedLocs.has(tr.locationName)}
                                    lastResult={tr}
                                    flagFn={this.toggleFlag}
                                    visitFn={this.visitFn}
                        />)}
                </div>
            </div>
        );
    }
}

export default Board;