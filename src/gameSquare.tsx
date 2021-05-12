import {MineTestResult} from "./gameProvider";
import React, {PureComponent} from "react";
import {BoardLoc} from "./boardLoc";

interface GameSquareProps {
    lastResult: MineTestResult,
    flagged: boolean,
    visitFn: (loc: BoardLoc) => void,
    flagFn: (loc: BoardLoc) => void,
}

interface GameSquarestate {
}

export class GameSquare extends PureComponent<GameSquareProps, GameSquarestate> {

    onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();

        if (e.type === 'click') {
            console.log('Left click');
            this.props.visitFn(this.props.lastResult.location);
        } else if (e.type === 'contextmenu') {
            console.log('Right click');
            this.props.flagFn(this.props.lastResult.location);
        }
        console.log('click handled');
    }

    classes() {
        const {everVisited, containsMine, neighboursWithMine} = this.props.lastResult;
        let flagged = this.props.flagged;
        const modifiers = [
            '',  // This renders as 'game-square'
        ];
        if (!everVisited && !flagged) modifiers.push('--pristine');
        if (everVisited && containsMine) modifiers.push('--killer-mine');
        if (neighboursWithMine !== undefined) modifiers.push('--neighbours-known');
        if (flagged) modifiers.push('--flagged');

        return modifiers.map(mod => `game-square${mod}`).join(' ');
    }


    render() {
        let displayNumber = <></>;
        let neighboursWithMine = this.props.lastResult.neighboursWithMine;
        // Don't show number on exploded ordinance.
        if (neighboursWithMine !== undefined && neighboursWithMine > 0 && !this.props.lastResult.containsMine)
            displayNumber = <>{neighboursWithMine}</>;

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