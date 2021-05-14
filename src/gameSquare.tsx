import {MineTestResult} from "./gameProviders/gameProvider";
import React, {PureComponent} from "react";
import {BoardLoc} from "./boardLoc";
import {BoardOptions} from "./minesweeperGame";

interface GameSquareProps {
    lastResult: MineTestResult,
    flagged: boolean,
    visitFn: (loc: BoardLoc) => void,
    flagFn: (loc: BoardLoc) => void,
    boardOptions: BoardOptions,
}

interface GameSquarestate {
}

export class GameSquare extends PureComponent<GameSquareProps, GameSquarestate> {

    onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        // If the game's over, we can't do anything anymore.
        if (this.props.lastResult.gameOver) return;

        if (e.type === 'click') {
            // console.log('Left click');
            this.props.visitFn(this.props.lastResult.location);
        } else if (e.type === 'contextmenu') {
            // console.log('Right click');
            this.props.flagFn(this.props.lastResult.location);
        }
        console.log('Click handled');
    }

    classes() {
        const {everVisited, explodedMine, neighboursWithMine, containedMine, onFrontierAndUnknown, knownMine, knownNonMine} = this.props.lastResult;
        let flagged = this.props.flagged;
        const modifiers = [
            '',  // This renders as 'game-square'
        ];
        if (!everVisited && !flagged) modifiers.push('--pristine');
        if (neighboursWithMine !== undefined) modifiers.push('--neighbours-known');
        if (flagged) modifiers.push('--flagged');

        // Only after gameover
        if (containedMine) modifiers.push('--mined');
        if (explodedMine) modifiers.push('--killer-mine');

        if (this.props.boardOptions.showBasicInferenceTips) {
            // Diagnostics
            if (onFrontierAndUnknown) modifiers.push('--on-frontier-and-unknown');
            if (knownMine) modifiers.push('--known-mine');
            if (knownNonMine) modifiers.push('--known-non-mine');
        }

        return modifiers.map(mod => `game-square${mod}`).join(' ');
    }


    render() {
        let neighboursWithMine = this.props.lastResult.neighboursWithMine;
        let displayNumber = <></>;
        // Don't show number on exploded ordinance.
        if (neighboursWithMine !== undefined && !this.props.lastResult.explodedMine) {
            if (this.props.boardOptions.displayZeroNumber || neighboursWithMine > 0)
                displayNumber = <>{neighboursWithMine}</>;
        }


        return (
            <div className={this.classes()}
                 onClick={this.onClick}
                 onContextMenu={this.onClick}
            >
                {displayNumber}
            </div>
        );
    }
}