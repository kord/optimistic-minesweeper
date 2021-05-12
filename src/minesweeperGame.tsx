import React, {Component} from 'react';
import {iMinesweeperGameProvider} from "./gameProvider";
import {BasicMinesweeperGameProvider, FixedBoardMinesweeperConfig} from "./basicMinesweeperGameProvider";
import Board from "./board";
import {BoardLoc} from "./boardLoc";


interface MinesweeperGameProps {
}

interface MinesweeperGameState {
    gameProvider: iMinesweeperGameProvider,
}

class MinesweeperGame extends Component<MinesweeperGameProps, MinesweeperGameState> {
    constructor(props: MinesweeperGameProps) {
        super(props);

        const config: FixedBoardMinesweeperConfig = {
            size: {height: 10, width: 10},
            mineCount: 20,
        }

        this.state = {
            gameProvider: new BasicMinesweeperGameProvider(config),
        }
    }

    visit = (loc: BoardLoc) => {
        const result = this.state.gameProvider.visit(loc);
        this.forceUpdate();
        return result;
    }

    render() {
        return (
            <div className={'minesweeper-game'}>
                <Board gameProvider={this.state.gameProvider}
                       visitFn={this.visit} />
            </div>
        );
    }
}

export default MinesweeperGame;