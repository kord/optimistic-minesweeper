import React, {Component, createRef} from 'react';
import BasicGameProvider from "../gameProviders/basicGameProvider";
import Board from "./board";
import {BoardLoc} from "../boardLoc";
import AlwaysMineGameProvider from "../gameProviders/alwaysMineGameProvider";
import FirstClickIsAlwaysMineGameProvider from "../gameProviders/firstClickIsAlwaysMineGameProvider";
import {GameStateIndicator} from "./gameStateIndicator";
import {BoardOptions, Constants, FixedBoardMinesweeperConfig} from "../constants";
import WatchedGameProvider from "../gameProviders/watchedGameProvider";
import ViciousPersecutionGameProvider from "../gameProviders/viciousPersecutionGameProvider";
import GentleKindnessGameProvider from "../gameProviders/gentleKindnessGameProvider";
import {iMinesweeperGameProvider} from "../gameProviders/gameProvider";
import "../css/minesweeperGame.css";
import {WinLossRecord} from "../types";
import ForcedGuessesAlwaysSucceedGameProvider from "../gameProviders/forcedGuessesAlwaysSucceedGameProvider";
import {analyticsReportRestart} from "../analytics/analytics";

interface MinesweeperGameProps {
    defaultBoardOptions: BoardOptions,
}

interface MinesweeperGameState {
    gameProvider: iMinesweeperGameProvider,
    flaggedLocs: Set<string>,

    /* User input values, options. */
    firstMoveAlwaysZero: boolean,
    firstMoveNeverMined: boolean,
    // userHeight: string,
    // userWidth: string,
    // userMineCount: string,
    userGameType: string,
    boardSizeOptionName: string,

    // The BoardOptions, unpacked
    boardOptions: BoardOptions,
    winLossRecord: WinLossRecord,
}


let gameTypes: Map<string, (config: FixedBoardMinesweeperConfig) => iMinesweeperGameProvider> = new Map([
    ['BasicGameProvider',
        (config) => new BasicGameProvider(config)],
    ['FirstClickIsAlwaysMineGameProvider',
        (config) => new FirstClickIsAlwaysMineGameProvider(config)],
    ['AlwaysMineGameProvider',
        (config) => new AlwaysMineGameProvider(config)],
    ['WatchedGameProvider',
        (config) => new WatchedGameProvider(config)],
    ['ViciousPersecutionGameProvider',
        (config) => new ViciousPersecutionGameProvider(config)],
    ['GentleKindnessGameProvider',
        (config) => new GentleKindnessGameProvider(config)],
    ['ForcedGuessesAlwaysSucceedGameProvider',
        (config) => new ForcedGuessesAlwaysSucceedGameProvider(config)],
]);

class MinesweeperGame extends Component<MinesweeperGameProps, MinesweeperGameState> {
    private boardRef = createRef<Board>();

    constructor(props: MinesweeperGameProps) {
        super(props);

        this.state = {
            gameProvider: new ForcedGuessesAlwaysSucceedGameProvider(Constants.defaultGameConfig),
            userGameType: 'ForcedGuessesAlwaysSucceedGameProvider',
            boardSizeOptionName: Constants.defaultGameSizeOption,
            firstMoveAlwaysZero: Constants.defaultGameConfig.firstMoveAlwaysZero,
            firstMoveNeverMined: Constants.defaultGameConfig.firstMoveNeverMined,
            // userHeight: Constants.defaultGameConfig.size.height.toString(),
            // userWidth: Constants.defaultGameConfig.size.width.toString(),
            // userMineCount: Constants.defaultGameConfig.mineCount.toString(),
            boardOptions: this.props.defaultBoardOptions,
            flaggedLocs: new Set<string>(),
            winLossRecord: {starts: 1, losses: 0, wins: 0},
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

    // This works when the underlying input has name="<name of state variable tracking the content>"
    private handleBoardOptionsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target;
        let value: string | boolean | number = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
        if (name === 'autoPlayDelayMs') value = +value;
        // @ts-ignore
        this.setState(prev => ({
            boardOptions: {
                ...prev.boardOptions,
                [name]: value,
            }
        }));
    }

    // This works when the underlying input has name="<name of state variable tracking the content>"
    private handleAutoPlayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = event.target.checked;
        console.assert(event.target.name === 'autoPlay');

        if (!value) this.cancelAutoPlay();
        this.setState(prev => ({
            boardOptions: {
                ...prev.boardOptions,
                autoPlay: value,
            }
        }), () => {
            if (value) this.queueAutoPlay();
        });
    }

    public get boardOptions(): BoardOptions {
        return this.state.boardOptions;
    };

    visit = (loc: BoardLoc) => {
        this.state.gameProvider.visit(loc, this.boardOptions.autoVisitNeighboursOfZeros, this.boardOptions.autoVisitKnownNonMines);
        this.forceUpdate();
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

    private cancelAutoPlay = () => {
        if (this.nextAutoplay) {
            clearTimeout(this.nextAutoplay);
        }
    }

    private queueAutoPlay = (delay?: number) => {
        if (this.boardOptions.autoPlay) {
            if (!delay) delay = this.boardOptions.autoPlayDelayMs;
            this.nextAutoplay = setTimeout(this.doAutomaticVisit, delay);
        }
    }

    private restart = () => {
        if (!this.state.userGameType) {
            console.error(`userGameType invalidly set to ${this.state.userGameType}`);
            return;
        }

        // Report analytics for this restart.
        analyticsReportRestart(this.state.gameProvider.success, this.state.gameProvider.failure);

        const dimensionsFn = Constants.boardSizeOptions.get(this.state.boardSizeOptionName)!;
        const config = {
            dimensions: dimensionsFn(),
            firstMoveNeverMined: this.state.firstMoveNeverMined,
            firstMoveAlwaysZero: this.state.firstMoveAlwaysZero,
            // onLearning: () => this.boardRef.current?.forceUpdate(),
        } as FixedBoardMinesweeperConfig;

        const providerFn = gameTypes.get(this.state.userGameType);
        if (!providerFn) {
            console.error(`userGameType invalidly set to ${this.state.userGameType}`);
            return;
        }

        // console.log(`Setting gameProvider with ${this.state.userGameType}`);
        // console.log(config);

        this.cancelAutoPlay();
        this.setState(prev => ({
            gameProvider: providerFn(config),
            flaggedLocs: new Set<string>(),
            winLossRecord: {
                wins: prev.winLossRecord.wins + (prev.gameProvider.success ? 1 : 0),
                losses: prev.winLossRecord.losses + (prev.gameProvider.failure ? 1 : 0),
                starts: prev.winLossRecord.starts + 1,
            }
        }), () => {
            this.queueAutoPlay();
        });


    }

    componentWillUnmount(): void {
        if (this.nextAutoplay) {
            clearTimeout(this.nextAutoplay);
        }
    }

    private nextAutoplay?: NodeJS.Timeout;

    private doAutomaticVisit = () => {
        // console.log(`Running doAutomaticVisit`);

        // Can't hurt if we're the one running. Easier than hunting down my bugs that lets this run multiple times.
        this.cancelAutoPlay();
        const game = this.state.gameProvider;

        if (game.gameOver) {
            this.restart();
        } else {
            const loc = game.moveSuggestion();
            if (loc === undefined) return;
            this.boardRef.current?.visitFn(loc);
        }

        const restartDelayMs = game.gameOver ? 1000 : this.boardOptions.autoPlayDelayMs;
        this.queueAutoPlay(restartDelayMs);

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
                                        size={this.state.gameProvider.size}
                                        flaggedCount={this.state.flaggedLocs.size}
                                        winLossRecord={this.state.winLossRecord}
                                        restartFn={this.restart}
                    />

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
                        <input type="submit"
                               className={'game-button'}
                               value="Expert Autoplay"
                               onClick={() => {
                                   this.setState({
                                       boardOptions: Constants.autoplayNiceBoardOptions,
                                       winLossRecord: {starts: 0, losses: 0, wins: 0},
                                       boardSizeOptionName: 'Expert',
                                       firstMoveNeverMined: true,
                                       firstMoveAlwaysZero: false,
                                       userGameType: 'WatchedGameProvider',
                                   }, this.restart)
                               }}/>
                        <br/>
                        <input type="submit"
                               className={'game-button'}
                               value="Expert Autoplay Show Knowledge"
                               onClick={() => {
                                   this.setState({
                                       boardOptions: Constants.autoplayShowProbabilityBoardOptions,
                                       winLossRecord: {starts: 0, losses: 0, wins: 0},
                                       boardSizeOptionName: 'Expert',
                                       firstMoveNeverMined: true,
                                       firstMoveAlwaysZero: true,
                                       userGameType: 'WatchedGameProvider',
                                   }, this.restart)
                               }}/>
                        <br/>
                        <input type="submit"
                               className={'game-button'}
                               value="User Play Forced Guesses Succeed!"
                               onClick={() => {
                                   this.setState({
                                       boardOptions: Constants.defaultBoardOptions,
                                       firstMoveNeverMined: true,
                                       firstMoveAlwaysZero: true,
                                       userGameType: 'ForcedGuessesAlwaysSucceedGameProvider',
                                   }, this.restart)
                               }}/>
                    </div>
                    <div className={'options-group'}>
                        <select name={"gameType"}
                                className={"options-dropdown"}
                                value={this.state.userGameType}
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
                        <select name={"boardConfig"}
                                className={"gametype-dropdown"}
                                value={this.state.boardSizeOptionName}
                                onChange={(e) => {
                                    this.setState({boardSizeOptionName: e.target.value});
                                }}>
                            {Array.from(Constants.boardSizeOptions.keys()).map((sizeOptionsName) =>
                                <option className={'level-list__level'}
                                        key={sizeOptionsName}
                                        value={sizeOptionsName}>
                                    {sizeOptionsName}
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
                        {/*<br/>*/}
                        {/*<label>*/}
                        {/*    Height:&nbsp;*/}
                        {/*    <input type={'text'}*/}
                        {/*           name={'userHeight'}*/}
                        {/*           className={'textbox textbox--small'}*/}
                        {/*           value={this.state.userHeight}*/}
                        {/*           onChange={this.handleInputChange}/>*/}
                        {/*</label>*/}
                        {/*<br/>*/}
                        {/*<label>*/}
                        {/*    Width:&nbsp;*/}
                        {/*    <input type={'text'}*/}
                        {/*           name={'userWidth'}*/}
                        {/*           className={'textbox textbox--small'}*/}
                        {/*           value={this.state.userWidth}*/}
                        {/*           onChange={this.handleInputChange}/>*/}
                        {/*</label>*/}
                        {/*<br/>*/}
                        {/*<label>*/}
                        {/*    Mines:&nbsp;*/}
                        {/*    <input type={'text'}*/}
                        {/*           name={'userMineCount'}*/}
                        {/*           className={'textbox textbox--small'}*/}
                        {/*           value={this.state.userMineCount}*/}
                        {/*           onChange={this.handleInputChange}/>*/}
                        {/*</label>*/}
                        <br/>
                        <input type="submit"
                               className={'game-button restart-button'}
                               value="Restart"
                               onClick={this.restart}/>
                    </div>

                    <div className={'options-group'}>
                        <label>
                            autoPlayDelayMs:&nbsp;
                            <input type={'text'}
                                   name={'autoPlayDelayMs'}
                                   className={'textbox textbox--small'}
                                   value={this.boardOptions.autoPlayDelayMs.toFixed(0)}
                                   onChange={this.handleBoardOptionsChange}/>
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoPlay'}
                                   checked={this.boardOptions.autoPlay}
                                   name={'autoPlay'}
                                   onChange={this.handleAutoPlayChange}/>
                            autoPlay
                        </label>
                        &nbsp;
                        <input type="submit"
                               className={'game-button step-button'}
                               value="Step"
                               onClick={this.doAutomaticVisit}/>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'showKnowledgeOverlay'}
                                   checked={this.boardOptions.showKnowledgeOverlay}
                                   name={'showKnowledgeOverlay'}
                                   onChange={this.handleBoardOptionsChange}/>
                            showKnowledgeOverlay
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'showProbabilityOverlay'}
                                   checked={this.boardOptions.showProbabilityOverlay}
                                   name={'showProbabilityOverlay'}
                                   onChange={this.handleBoardOptionsChange}/>
                            showProbabilityOverlay
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoVisitNeighboursOfZeros'}
                                   checked={this.boardOptions.autoVisitNeighboursOfZeros}
                                   name={'autoVisitNeighboursOfZeros'}
                                   onChange={this.handleBoardOptionsChange}/>
                            autoVisitNeighboursOfZeros
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoVisitNeighboursOfFlagSatisfiedNumbers'}
                                   checked={this.boardOptions.autoVisitNeighboursOfFlagSatisfiedNumbers}
                                   name={'autoVisitNeighboursOfFlagSatisfiedNumbers'}
                                   onChange={this.handleBoardOptionsChange}/>
                            autoVisitNeighboursOfFlagSatisfiedNumbers
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'autoVisitKnownNonMines'}
                                   checked={this.boardOptions.autoVisitKnownNonMines}
                                   name={'autoVisitKnownNonMines'}
                                   onChange={this.handleBoardOptionsChange}/>
                            autoVisitKnownNonMines
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'displayNumberZeroWhenNoMinesAdjacent'}
                                   checked={this.boardOptions.displayNumberZeroWhenNoMinesAdjacent}
                                   name={'displayNumberZeroWhenNoMinesAdjacent'}
                                   onChange={this.handleBoardOptionsChange}/>
                            displayNumberZeroWhenNoMinesAdjacent
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'decrementVisibleNumberByAdjacentFlags'}
                                   checked={this.boardOptions.decrementVisibleNumberByAdjacentFlags}
                                   name={'decrementVisibleNumberByAdjacentFlags'}
                                   onChange={this.handleBoardOptionsChange}/>
                            decrementVisibleNumberByAdjacentFlags
                        </label>
                        <br/>
                        <label>
                            <input type="checkbox"
                                   key={'decrementVisibleNumberByAdjacentKnownMines'}
                                   checked={this.boardOptions.decrementVisibleNumberByAdjacentKnownMines}
                                   name={'decrementVisibleNumberByAdjacentKnownMines'}
                                   onChange={this.handleBoardOptionsChange}/>
                            decrementVisibleNumberByAdjacentKnownMines
                        </label>

                    </div>


                </div>
                <div className={'made-by-text'}>
                    Made by <a href={'mailto:therestinmotion@gmail.com'}>therestinmotion@gmail.com</a>
                </div>
            </div>
        );
    }

}

export default MinesweeperGame;
