import React, {PureComponent} from "react";
import '../css/gameStateIndicator.css';
import {WinLossRecord} from "../types";

interface GameStateIndicatorProps {
    success: boolean,
    failure: boolean,
    gameOver: boolean,
    totalMines: number,
    flaggedCount: number,
    winLossRecord: WinLossRecord,
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

    private buttonClasses() {
        const {success, failure, gameOver} = this.props;
        const modifiers = [
            '',  // This renders as 'game-over-indicator'
        ];
        if (success) modifiers.push('--success');
        if (failure) modifiers.push('--failure');
        if (gameOver) modifiers.push('--game-over');
        if (!gameOver) modifiers.push('--game-in-progress');

        return modifiers.map(mod => `game-over-indicator${mod}`).join(' ');
    }


    render() {
        const minesLeft = this.props.totalMines - this.props.flaggedCount;
        let statusText: string = '';
        if (this.props.success) statusText = 'Congratulations. You win!';
        else if (this.props.failure) statusText = 'Congratulations. You lose!';
        else statusText = `${minesLeft} Unflagged Mines Remain.`

        const recordString = `Record: ` +
            `${this.props.winLossRecord.incomplete} Incomplete, ` +
            `${this.props.winLossRecord.wins} Wins, ` +
            `${this.props.winLossRecord.losses} Losses`;

        return (
            <div className={'game-state-indicator'}>
                <p className={'game-status-text'}>
                    {statusText}
                </p>
                <button className={this.buttonClasses()}
                        onClick={this.onClick}
                />
                <p className={'game-status-text'}>
                    {recordString}
                </p>
            </div>
        );
    }
}