import React, {PureComponent} from "react";
import {BoardLoc} from "../boardLoc";
import {BoardOptions} from "../constants";
import {MineTestResult} from "../types";
import ReactTooltip from "react-tooltip";
import '../css/gameSquare.css';

interface GameSquareProps {
    lastResult: MineTestResult,
    flagged: boolean,
    flaggedNeighbours: number,
    inferredMineNeighbours: number,
    flaggedOrInferredMineNeighbours: number,
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
        const {everVisited, explodedMine, neighboursWithMine, containedMine, diagnostics} = this.props.lastResult;
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

        if (this.props.boardOptions.showKnowledgeOverlay) {
            // Diagnostics
            if (diagnostics?.onFrontierAndUnknown) modifiers.push('--on-frontier-and-unknown');
            if (diagnostics?.knownMine) modifiers.push('--known-mine');
            if (diagnostics?.knownNonMine) modifiers.push('--known-non-mine');
        }
        if (this.props.boardOptions.showProbabilityOverlay &&
            // this.props.lastResult.diagnostics?.onFrontierAndUnknown &&
            this.props.lastResult.diagnostics?.mineProbability !== undefined) {
            modifiers.push('--has-known-probability');
        }
        // if (diagnostics?.couldBeAMine) modifiers.push('--has-some-chance-of-being-a-mine');

        return modifiers.map(mod => `game-square${mod}`).join(' ');
    }


    render() {
        let neighboursWithMine = this.props.lastResult.neighboursWithMine;
        // Don't show number on exploded ordinance.
        if (neighboursWithMine !== undefined && !this.props.lastResult.explodedMine) {
            if (this.props.boardOptions.displayNumberZeroWhenNoMinesAdjacent || neighboursWithMine > 0) {
                if (this.props.boardOptions.decrementVisibleNumberByAdjacentKnownMines) {
                    neighboursWithMine -= this.props.inferredMineNeighbours;
                }
                if (this.props.boardOptions.decrementVisibleNumberByAdjacentFlags) {
                    neighboursWithMine -= this.props.flaggedNeighbours;
                }
                if (this.props.boardOptions.decrementVisibleNumberByAdjacentFlags &&
                    this.props.boardOptions.decrementVisibleNumberByAdjacentKnownMines) {
                    neighboursWithMine = this.props.lastResult.neighboursWithMine! - this.props.flaggedOrInferredMineNeighbours;
                }
            }
        }

        const showTooltip = this.props.boardOptions.showProbabilityOverlay &&
            this.props.lastResult.diagnostics?.mineProbability !== undefined;
        return (
            <div data-tip data-for={this.props.lastResult.locationName}
                 className={this.classes()}
                 style={this.style()}
                 onClick={this.onClick}
                 onContextMenu={this.onClick}
            >
                <div className={'game-square__probability-overlay'}>
                    {this.displayNumber(neighboursWithMine)}
                </div>
                {showTooltip ?
                    <ReactTooltip id={this.props.lastResult.locationName}
                                  place="top"
                                  type="info"
                                  effect="solid">
                        {this.tooltipText()}
                    </ReactTooltip>
                    : null}
            </div>
        );
    }

    private style() {
        if (!this.props.boardOptions.showProbabilityOverlay) return undefined;
        if (!this.props.lastResult.diagnostics) return undefined;
        // if (!this.props.lastResult.diagnostics.onFrontierAndUnknown) return undefined;
        if (this.props.lastResult.diagnostics.mineProbability === undefined) return undefined;
        return {
            '--mine-probability': this.probabilityManipulateFn(this.props.lastResult.diagnostics.mineProbability),
        } as React.CSSProperties;
    }

    // This makes it redder.
    private probabilityManipulateFn(mineProbability: number): number {
        return mineProbability;
        // return 1 - (1 - mineProbability) ** 2;
    }

    private displayNumber(neighboursWithMine: number | undefined) {
        if (neighboursWithMine === undefined) return '';
        if (this.props.lastResult.explodedMine) return '';
        if (!this.props.boardOptions.displayNumberZeroWhenNoMinesAdjacent && neighboursWithMine === 0) return '';
        return neighboursWithMine.toString();
    }

    private tooltipText() {
        if (this.props.lastResult.diagnostics?.knownMine) return 'Mine';
        if (this.props.lastResult.diagnostics?.knownNonMine) return 'Empty';
        return `${this.props.lastResult.diagnostics?.mineProbability?.toFixed(2)}`;
    }
}