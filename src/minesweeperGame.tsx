import React, {Component} from 'react';
import {FixedBoardMinesweeperConfig, iMinesweeperGameProvider} from "./gameProviders/gameProvider";
import BasicGameProvider from "./gameProviders/basicGameProvider";
import Board from "./board";
import {BoardLoc} from "./boardLoc";
import AlwaysMineGameProvider from "./gameProviders/alwaysMineGameProvider";
import DiagnosticGameProvider from "./gameProviders/diagnosticGameProvider";
import FirstClickIsAlwaysMineGameProvider from "./gameProviders/firstClickIsAlwaysMineGameProvider";
import {GameStateIndicator} from "./gameStateIndicator";


interface MinesweeperGameProps {
}

interface MinesweeperGameState {
    gameProvider: iMinesweeperGameProvider,
    userHeight: string,
    userWidth: string,
    userMineCount: string,
    userGameType: string,
    flaggedLocs: Set<string>,
}

let gameTypes: Map<string, (config: FixedBoardMinesweeperConfig) => iMinesweeperGameProvider> = new Map([
    ['DiagnosticGameProvider',
        (config) => new DiagnosticGameProvider(config)],
    ['BasicGameProvider',
        (config) => new BasicGameProvider(config)],
    ['FirstClickIsAlwaysMineGameProvider',
        (config) => new FirstClickIsAlwaysMineGameProvider(config)],
    ['AlwaysMineGameProvider',
        (config) => new AlwaysMineGameProvider(config)],
]);


class MinesweeperGame extends Component<MinesweeperGameProps, MinesweeperGameState> {
    constructor(props: MinesweeperGameProps) {
        super(props);

        // Just a basic default config to start the page with.
        const config: FixedBoardMinesweeperConfig = {
            size: {height: 10, width: 10},
            mineCount: 20,
        }

        this.state = {
            gameProvider: new DiagnosticGameProvider(config),
            userGameType: 'DiagnosticGameProvider',
            userHeight: '10',
            userWidth: '10',
            userMineCount: '20',
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

        const config = {
            size: {
                height: +this.state.userHeight,
                width: +this.state.userWidth,
            },
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
                </div>


                <GameStateIndicator gameProvider={this.state.gameProvider}
                                    flaggedLocs={this.state.flaggedLocs}
                                    restartFn={this.restart}/>

                <Board gameProvider={this.state.gameProvider}
                       flaggedLocs={this.state.flaggedLocs}
                       visitFn={this.visit}
                       toggleFlagFn={this.toggleFlag}
                />
            </div>
        );
    }
}

export default MinesweeperGame;