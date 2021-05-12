import React, {Component} from 'react';
import {iMineSweeperGameProvider} from "./gameProvider";



interface BoardProps {
    gameProvider: iMineSweeperGameProvider,

}

interface Boardstate {
}

class Board extends Component<BoardProps, Boardstate> {

    render() {
        const style  = {
            '--rows': this.props.gameProvider.size.height,
            '--cols': this.props.gameProvider.size.width,
        } as React.CSSProperties;

        return (
            <div className={'board'}>

            </div>
        );
    }
}

export default Board;