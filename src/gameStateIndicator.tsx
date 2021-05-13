import {iMinesweeperGameProvider} from "./gameProviders/gameProvider";
import React, {PureComponent} from "react";
import 'css/gameStateIndicator.css';

interface GameStateIndicatorProps {
    gameProvider: iMinesweeperGameProvider,
    flaggedLocs: Set<string>,
    restartFn: VoidFunction,
}

interface GameStateIndicatorstate {
}

export class GameStateIndicator extends PureComponent<GameStateIndicatorProps, GameStateIndicatorstate> {

    onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        this.props.restartFn();

        // // If the game's over, we can't do anything anymore.
        // if (this.props.lastResult.gameOver) return;
        //
        // if (e.type === 'click') {
        //     // console.log('Left click');
        //     this.props.visitFn(this.props.lastResult.location);
        // } else if (e.type === 'contextmenu') {
        //     // console.log('Right click');
        //     this.props.flagFn(this.props.lastResult.location);
        // }
        console.log('Click handled');
    }

    classes() {
        const {success, failure, gameOver} = this.props.gameProvider;
        const modifiers = [
            '',  // This renders as 'game-over-indicator'
        ];
        if (success) modifiers.push('success');
        if (failure) modifiers.push('failure');
        if (gameOver) modifiers.push('game-over');


        return modifiers.map(mod => `game-over-indicator${mod}`).join(' ');
    }


    render() {
        const minesLeft = this.props.gameProvider.totalMines - this.props.flaggedLocs.size;
        return (
            <div className={'game-state-indicator'}>
                <button className={this.classes()}
                     onClick={this.onClick}
                />
                <p className={'mines-remaining-count'}>
                    There are {minesLeft} unflagged mines remaining.
                </p>
            </div>
        );
    }
}