import React, {Component} from 'react';
import {BoardSize, FixedBoardMinesweeperConfig, iMinesweeperGameProvider} from "./gameProviders/gameProvider";
import BasicGameProvider from "./gameProviders/basicGameProvider";
import Board from "./board";
import {BoardLoc} from "./boardLoc";
import AlwaysMineGameProvider from "./gameProviders/alwaysMineGameProvider";
import SimpleInferenceDiagnosticGameProvider from "./gameProviders/simpleInferenceDiagnosticGameProvider";
import FirstClickIsAlwaysMineGameProvider from "./gameProviders/firstClickIsAlwaysMineGameProvider";
import {GameStateIndicator} from "./gameStateIndicator";
import {Constants} from "./constants";

export interface BoardOptions {
    displayZeroNumber: boolean,
    expandNeighboursOfZero: boolean,
    expandWhenEnoughFlagsLaid: boolean,
    showBasicInferenceTips: boolean,
}

interface MinesweeperGameProps {
}

interface MinesweeperGameState {
    gameProvider: iMinesweeperGameProvider,
    flaggedLocs: Set<string>,

    /* User input values, options. */
    userHeight: string,
    userWidth: string,
    userMineCount: string,
    userGameType: string,
    displayZeroNumber: boolean,
    expandNeighboursOfZero: boolean,
    expandWhenEnoughFlagsLaid: boolean,
    showBasicInferenceTips: boolean,
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
]);

class MinesweeperGame extends Component<MinesweeperGameProps, MinesweeperGameState> {
    public get boardOptions(): BoardOptions {
        const boardOptions: BoardOptions =
            {
                displayZeroNumber: this.state.displayZeroNumber,
                expandNeighboursOfZero: this.state.expandNeighboursOfZero,
                expandWhenEnoughFlagsLaid: this.state.expandWhenEnoughFlagsLaid,
                showBasicInferenceTips: this.state.showBasicInferenceTips,
            };
        return boardOptions;
    };

    constructor(props: MinesweeperGameProps) {
        super(props);

        this.state = {
            gameProvider: new SimpleInferenceDiagnosticGameProvider(Constants.defaultGameConfig),
            userGameType: 'SimpleInferenceDiagnosticGameProvider',
            userHeight: Constants.defaultGameConfig.size.height.toString(),
            userWidth: Constants.defaultGameConfig.size.width.toString(),
            userMineCount: Constants.defaultGameConfig.mineCount.toString(),
            displayZeroNumber: Constants.defaultBoardOptions.displayZeroNumber,
            expandNeighboursOfZero: Constants.defaultBoardOptions.expandNeighboursOfZero,
            expandWhenEnoughFlagsLaid: Constants.defaultBoardOptions.expandWhenEnoughFlagsLaid,
            showBasicInferenceTips: Constants.defaultBoardOptions.showBasicInferenceTips,
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
        } as FixedBoardMinesweeperConfig;

        const providerFn = gameTypes.get(this.state.userGameType);
        if (!providerFn) {
            console.error(`userGameType invalidly set to ${this.state.userGameType}`);
            return;
        }

        console.log(`Setting gameProvider with ${this.state.userGameType}`);
        console.log(config);
        this.setState({
            gameProvider: providerFn(config),
            flaggedLocs: new Set<string>(),
        });
    }

    render() {
        return (
            <div className={'minesweeper-game'}>
                <div className={'game-controls'}>
                    {/*<label>*/}
                    {/*    Gamne Type*/}
                    {/*    <input type={'select'} onChange={this.handleChange}>*/}

                    {/*    </input>*/}
                    {/*</label>*/}
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
                        Height:
                        <input type={'text'}
                               name={'userHeight'}
                               className={'textbox textbox--small'}
                               value={this.state.userHeight}
                               onChange={this.handleInputChange}/>
                    </label>
                    <br/>
                    <label>
                        Width:
                        <input type={'text'}
                               name={'userWidth'}
                               className={'textbox textbox--small'}
                               value={this.state.userWidth}
                               onChange={this.handleInputChange}/>
                    </label>
                    <br/>
                    <label>
                        Mines:
                        <input type={'text'}
                               name={'userMineCount'}
                               className={'textbox textbox--small'}
                               value={this.state.userMineCount}
                               onChange={this.handleInputChange}/>
                    </label>
                    <input type="submit"
                           className={'game-button restart-button'}
                           value="Restart"
                           onClick={this.restart}/>

                    <br/>
                    <label>
                        expandNeighboursOfZero:
                        <input type="checkbox"
                               key={'expandNeighboursOfZero'}
                               checked={this.state.expandNeighboursOfZero}
                               name={'expandNeighboursOfZero'}
                               onChange={this.handleInputChange}/>
                    </label>
                    <br/>
                    <label>
                        displayZeroNumber:
                        <input type="checkbox"
                               key={'displayZeroNumber'}
                               checked={this.state.displayZeroNumber}
                               name={'displayZeroNumber'}
                               onChange={this.handleInputChange}/>
                    </label>
                    <br/>
                    <label>
                        expandWhenEnoughFlagsLaid:
                        <input type="checkbox"
                               key={'expandWhenEnoughFlagsLaid'}
                               checked={this.state.expandWhenEnoughFlagsLaid}
                               name={'expandWhenEnoughFlagsLaid'}
                               onChange={this.handleInputChange}/>
                    </label>
                    <br/>
                    <label>
                        showBasicInferenceTips:
                        <input type="checkbox"
                               key={'showBasicInferenceTips'}
                               checked={this.state.showBasicInferenceTips}
                               name={'showBasicInferenceTips'}
                               onChange={this.handleInputChange}/>
                    </label>

                </div>


                <GameStateIndicator totalMines={this.state.gameProvider.totalMines}
                                    failure={this.state.gameProvider.failure}
                                    success={this.state.gameProvider.success}
                                    gameOver={this.state.gameProvider.gameOver}
                                    flaggedCount={this.state.flaggedLocs.size}
                                    restartFn={this.restart}/>

                <Board gameProvider={this.state.gameProvider}
                       flaggedLocs={this.state.flaggedLocs}
                       visitFn={this.visit}
                       toggleFlagFn={this.toggleFlag}
                       boardOptions={this.boardOptions}
                />
            </div>
        );
    }
}

export default MinesweeperGame;
