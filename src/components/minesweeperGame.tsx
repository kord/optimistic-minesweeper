import React, {Component, createRef} from 'react';
import BasicGameProvider from "../gameProviders/basicGameProvider";
import Board from "./board";
import {BoardLoc} from "../boardLoc";
import AlwaysMineGameProvider from "../gameProviders/alwaysMineGameProvider";
import SimpleInferenceDiagnosticGameProvider from "../gameProviders/simpleInferenceDiagnosticGameProvider";
import FirstClickIsAlwaysMineGameProvider from "../gameProviders/firstClickIsAlwaysMineGameProvider";
import {GameStateIndicator} from "./gameStateIndicator";
import {BoardOptions, Constants, FixedBoardMinesweeperConfig} from "../constants";
import {BoardSize} from "../boardSize";
import WatchedDiagnosticGameProvider from "../gameProviders/watchedDiagnosticGameProvider";
import RuthlessPersecutionGameProvider from "../gameProviders/ruthlessPersecutionGameProvider";
import GentleKindnessGameProvider from "../gameProviders/gentleKindnessGameProvider";
import {iMinesweeperGameProvider} from "../gameProviders/gameProvider";
import "../css/minesweeperGame.css";

interface MinesweeperGameProps {
}

interface MinesweeperGameState {
    gameProvider: iMinesweeperGameProvider,
    flaggedLocs: Set<string>,

    /* User input values, options. */
    firstMoveAlwaysZero: boolean,
    firstMoveNeverMined: boolean,
    userHeight: string,
    userWidth: string,
    userMineCount: string,
    userGameType: string,

    // The BoardOptions, unpacked
    displayZeroNumber: boolean,
    autoPlay: boolean,
    autoVisitNeighboursOfZeros: boolean,
    autoVisitNeighboursOfFlagSatisfiedNumbers: boolean,
    showBasicInferenceTips: boolean,
    showMineProbabilities: boolean,
    autoVisitDiagnosticKnownNonMines: boolean,
    decrementVisibleNumberByAdjacentFlags: boolean,
    decrementVisibleNumberByAdjacentInferredMines: boolean,
}


let gameTypes: Map<string, (config: FixedBoardMinesweeperConfig) => iMinesweeperGameProvider> = new Map([
    ['BasicGameProvider',
        (config) => new BasicGameProvider(config)],
    ['FirstClickIsAlwaysMineGameProvider',
        (config) => new FirstClickIsAlwaysMineGameProvider(config)],
    ['AlwaysMineGameProvider',
        (config) => new AlwaysMineGameProvider(config)],
    ['SimpleInferenceDiagnosticGameProvider',
        (config) => new SimpleInferenceDiagnosticGameProvider(config)],
    ['WatchedDiagnosticGameProvider',
        (config) => new WatchedDiagnosticGameProvider(config)],
    ['RuthlessPersecutionGameProvider',
        (config) => new RuthlessPersecutionGameProvider(config)],
    ['GentleKindnessGameProvider',
        (config) => new GentleKindnessGameProvider(config)],
]);

class MinesweeperGame extends Component<MinesweeperGameProps, MinesweeperGameState> {
    private boardRef = createRef<Board>();

    public get boardOptions(): BoardOptions {
        return {
            autoVisitNeighboursOfZeros: this.state.autoVisitNeighboursOfZeros,
            autoVisitDiagnosticKnownNonMines: this.state.autoVisitDiagnosticKnownNonMines,
            autoVisitNeighboursOfFlagSatisfiedNumbers: this.state.autoVisitNeighboursOfFlagSatisfiedNumbers,
            autoPlay: this.state.autoPlay,
            showBasicInferenceTips: this.state.showBasicInferenceTips,
            displayNumberZeroWhenNoMinesAdjacent: this.state.displayZeroNumber,
            showMineProbabilities: this.state.showMineProbabilities,
            decrementVisibleNumberByAdjacentFlags: this.state.decrementVisibleNumberByAdjacentFlags,
            decrementVisibleNumberByAdjacentInferredMines: this.state.decrementVisibleNumberByAdjacentInferredMines,
        } as BoardOptions;
    };

    constructor(props: MinesweeperGameProps) {
        super(props);

        this.state = {
            gameProvider: new WatchedDiagnosticGameProvider({
                ...Constants.defaultGameConfig,
                // onLearning: () => this.boardRef.current?.forceUpdate()
            }),
            userGameType: 'WatchedDiagnosticGameProvider',
            firstMoveAlwaysZero: Constants.defaultGameConfig.firstMoveAlwaysZero,
            firstMoveNeverMined: Constants.defaultGameConfig.firstMoveNeverMined,
            userHeight: Constants.defaultGameConfig.size.height.toString(),
            userWidth: Constants.defaultGameConfig.size.width.toString(),
            userMineCount: Constants.defaultGameConfig.mineCount.toString(),
            displayZeroNumber: Constants.defaultBoardOptions.displayNumberZeroWhenNoMinesAdjacent,
            autoPlay: Constants.defaultBoardOptions.autoPlay,
            autoVisitNeighboursOfZeros: Constants.defaultBoardOptions.autoVisitNeighboursOfZeros,
            autoVisitNeighboursOfFlagSatisfiedNumbers: Constants.defaultBoardOptions.autoVisitNeighboursOfFlagSatisfiedNumbers,
            showBasicInferenceTips: Constants.defaultBoardOptions.showBasicInferenceTips,
            showMineProbabilities: Constants.defaultBoardOptions.showMineProbabilities,
            autoVisitDiagnosticKnownNonMines: Constants.defaultBoardOptions.autoVisitDiagnosticKnownNonMines,
            decrementVisibleNumberByAdjacentFlags: Constants.defaultBoardOptions.decrementVisibleNumberByAdjacentFlags,
            decrementVisibleNumberByAdjacentInferredMines: Constants.defaultBoardOptions.decrementVisibleNumberByAdjacentInferredMines,
            flaggedLocs: new Set<string>(),
        }
    }

    // This works when the underlying input has name="<name of state variable tracking the content>"
    private handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        // @ts-ignore
        this.setState({
            [name]: value
        });
    }

    visit = (loc: BoardLoc) => {
        const result = this.state.gameProvider.visit(loc);
        this.forceUpdate();
        return result;
    }

    toggleFlag = (loc: BoardLoc) => {
        // Can't flag a visited spot. You already know what it is.
        if (this.state.gameProvider.lastVisitResult(loc).everVisited) return;

        const locString = loc.toString();
        if (this.state.flaggedLocs.has(locString)) {
            this.state.flaggedLocs.delete(locString);
        } else {
            this.state.flaggedLocs.add(locString)
        }
        // Force update because we're changing flaggedLocs in our state without properly setting state.
        this.forceUpdate();
    }

    private restart = () => {
        if (!this.state.userGameType) {
            console.error(`userGameType invalidly set to ${this.state.userGameType}`);
            return;
        }

        const boardSize = new BoardSize(+this.state.userHeight, +this.state.userWidth);
        const config = {
            size: boardSize,
            mineCount: +this.state.userMineCount,
            firstMoveNeverMined: this.state.firstMoveNeverMined,
            firstMoveAlwaysZero: this.state.firstMoveAlwaysZero,
            // onLearning: () => this.boardRef.current?.forceUpdate(),
        } as FixedBoardMinesweeperConfig;

        const providerFn = gameTypes.get(this.state.userGameType);
        if (!providerFn) {
            console.error(`userGameType invalidly set to ${this.state.userGameType}`);
            return;
        }

        console.log(`Setting gameProvider with ${this.state.userGameType}`);
        console.log(config);

        if (this.nextAutoplay) {
            clearTimeout(this.nextAutoplay);
        }
        this.setState({
            gameProvider: providerFn(config),
            flaggedLocs: new Set<string>(),
        });

        if (this.boardOptions.autoPlay) {
            this.nextAutoplay = setTimeout(this.doAutomaticVisit, 500);
        }
    }

    componentWillUnmount(): void {
        if (this.nextAutoplay) {
            clearTimeout(this.nextAutoplay);
        }
    }

    private nextAutoplay?: NodeJS.Timeout;

    private doAutomaticVisit = () => {
        console.log(`Running doAutomaticVisit`);
        const game = this.state.gameProvider;
        if (game.gameOver) {
            this.nextAutoplay = setTimeout(this.restart, 3000);
        }
        if (!this.boardOptions.autoPlay) return;
        const loc = game.moveSuggestion();
        if (loc === undefined) return;

        this.boardRef.current?.visitFn(loc, true);

        if (this.boardOptions.autoPlay) {
            this.nextAutoplay = setTimeout(this.doAutomaticVisit, 350);
        }
    }

    render() {
        const style = {
            '--rows': this.state.gameProvider.size.height,
            '--cols': this.state.gameProvider.size.width,
        } as React.CSSProperties;

        return (
            <div className={'minesweeper-game'} style={style}>

                <div className={'gameplay-elements'}>
                <GameStateIndicator totalMines={this.state.gameProvider.totalMines}
                                    failure={this.state.gameProvider.failure}
                                    success={this.state.gameProvider.success}
                                    gameOver={this.state.gameProvider.gameOver}
                                    flaggedCount={this.state.flaggedLocs.size}
                                    restartFn={this.restart}/>

                <Board ref={this.boardRef}
                       gameProvider={this.state.gameProvider}
                       flaggedLocs={this.state.flaggedLocs}
                       visitFn={this.visit}
                       toggleFlagFn={this.toggleFlag}
                       boardOptions={this.boardOptions}
                />
                </div>
                <div className={'options-groups'}>
                    <div className={'options-group'}>
                        <select name={"gameType"}
                                className={"gametype-dropdown"}
                                value={this.state.userGameType}
                            // size={this.props.solutionsHeight}
                                onChange={(e) => {
                                    this.setState({userGameType: e.target.value});
                                }}>
                            {Array.from(gameTypes.keys()).map((gameTypeName) =>
                                <option className={'level-list__level'}
                                        key={gameTypeName}
                                        value={gameTypeName}>
                                    {gameTypeName}
                                </option>
                            )}
                        </select>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'firstMoveAlwaysZero'}
                                   checked={this.state.firstMoveAlwaysZero}
                                   name={'firstMoveAlwaysZero'}
                                   onChange={this.handleInputChange}/>
                            firstMoveAlwaysZero
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'firstMoveNeverMined'}
                                   checked={this.state.firstMoveNeverMined}
                                   name={'firstMoveNeverMined'}
                                   onChange={this.handleInputChange}/>
                            firstMoveNeverMined
                        </label>
                        <br/>
                        <label>
                            Height:&nbsp;
                            <input type={'text'}
                                   name={'userHeight'}
                                   className={'textbox textbox--small'}
                                   value={this.state.userHeight}
                                   onChange={this.handleInputChange}/>
                        </label>
                        <br/>
                        <label>
                            Width:&nbsp;
                            <input type={'text'}
                                   name={'userWidth'}
                                   className={'textbox textbox--small'}
                                   value={this.state.userWidth}
                                   onChange={this.handleInputChange}/>
                        </label>
                        <br/>
                        <label>
                            Mines:&nbsp;
                            <input type={'text'}
                                   name={'userMineCount'}
                                   className={'textbox textbox--small'}
                                   value={this.state.userMineCount}
                                   onChange={this.handleInputChange}/>
                        </label>
                        <br/>
                        <input type="submit"
                               className={'game-button restart-button'}
                               value="Restart"
                               onClick={this.restart}/>
                    </div>

                    <div className={'options-group'}>
                        <label>
                            <input type="checkbox"
                                   key={'displayZeroNumber'}
                                   checked={this.state.displayZeroNumber}
                                   name={'displayZeroNumber'}
                                   onChange={this.handleInputChange}/>
                            displayZeroNumber
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'showBasicInferenceTips'}
                                   checked={this.state.showBasicInferenceTips}
                                   name={'showBasicInferenceTips'}
                                   onChange={this.handleInputChange}/>
                            showBasicInferenceTips
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'showMineProbabilities'}
                                   checked={this.state.showMineProbabilities}
                                   name={'showMineProbabilities'}
                                   onChange={this.handleInputChange}/>
                            showMineProbabilities
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoPlay'}
                                   checked={this.state.autoPlay}
                                   name={'autoPlay'}
                                   onChange={this.handleInputChange}/>
                            autoPlay
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoVisitNeighboursOfZeros'}
                                   checked={this.state.autoVisitNeighboursOfZeros}
                                   name={'autoVisitNeighboursOfZeros'}
                                   onChange={this.handleInputChange}/>
                            autoVisitNeighboursOfZeros
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoVisitNeighboursOfFlagSatisfiedNumbers'}
                                   checked={this.state.autoVisitNeighboursOfFlagSatisfiedNumbers}
                                   name={'autoVisitNeighboursOfFlagSatisfiedNumbers'}
                                   onChange={this.handleInputChange}/>
                            autoVisitNeighboursOfFlagSatisfiedNumbers
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoVisitDiagnosticKnownNonMines'}
                                   checked={this.state.autoVisitDiagnosticKnownNonMines}
                                   name={'autoVisitDiagnosticKnownNonMines'}
                                   onChange={this.handleInputChange}/>
                            autoVisitDiagnosticKnownNonMines
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'decrementVisibleNumberByAdjacentFlags'}
                                   checked={this.state.decrementVisibleNumberByAdjacentFlags}
                                   name={'decrementVisibleNumberByAdjacentFlags'}
                                   onChange={this.handleInputChange}/>
                            decrementVisibleNumberByAdjacentFlags
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'decrementVisibleNumberByAdjacentInferredMines'}
                                   checked={this.state.decrementVisibleNumberByAdjacentInferredMines}
                                   name={'decrementVisibleNumberByAdjacentInferredMines'}
                                   onChange={this.handleInputChange}/>
                            decrementVisibleNumberByAdjacentInferredMines
                        </label>

                    </div>
                </div>
            </div>
        );
    }
}

export default MinesweeperGame;
