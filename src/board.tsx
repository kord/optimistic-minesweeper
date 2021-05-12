import React, {Component} from 'react';
import {iMinesweeperGameProvider, MineTestResult} from "./gameProvider";

import 'board.css';


interface BoardProps {
    gameProvider: iMinesweeperGameProvider,

}

interface Boardstate {
}

class Board extends Component<BoardProps, Boardstate> {


    render() {
        const game = this.props.gameProvider;
        const style  = {
            '--rows': this.props.gameProvider.size.height,
            '--cols': this.props.gameProvider.size.width,
        } as React.CSSProperties;

        const boardState = game.locations.map(loc => game.lastVisitResult(loc));

        return (
            <div className={'board'}>
                <div className={'board__grid'} style={style}>
                    {boardState.map(tr =><GameSquare key={tr.locationName} />)}
                </div>
            </div>
        );
    }
}

interface GameSquareProps {
    lastResult: MineTestResult,
    flagged: boolean,
}

interface GameSquarestate {
}

class GameSquare extends Component<GameSquareProps, GameSquarestate> {

    classes() {
        const {everVisited, containsMine, neighboursWithMine} = this.props.lastResult;
        const modifiers = [
            '',  // This renders as 'game-square'
        ];
        if (!everVisited) modifiers.push('--pristine');
        if (everVisited && containsMine) modifiers.push('--killer-mine');
        if (neighboursWithMine!== undefined) modifiers.push('--neighbours-known');
        if (this.props.flagged) modifiers.push('--flagged');

        return modifiers.map(mod => `game-square${mod}`).join(' ');
    }

    render() {
        return (
            <div className={this.classes()}>

            </div>
        );
    }
}

export default Board;