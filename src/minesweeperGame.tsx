import React, {Component} from 'react';
import {FixedBoardMinesweeperConfig, iMinesweeperGameProvider} from "./gameProvider";
import BasicMinesweeperGameProvider from "./basicMinesweeperGameProvider";
import MinesweeperBoard from "./minesweeperBoard";
import {BoardLoc} from "./boardLoc";
import AlwaysMineMinesweeperGameProvider from "./alwaysMineMinesweeperGameProvider";
import DiagnosticMinesweeperGameProvider from "./diagnosticMinesweeperGameProvider";


interface MinesweeperGameProps {
}

interface MinesweeperGameState {
    gameProvider: iMinesweeperGameProvider,
    userHeight: string,
    userWidth: string,
    userMineCount: string,
    userGameType: string,
}

let gameTypes: Map<string, (config: FixedBoardMinesweeperConfig) => iMinesweeperGameProvider> = new Map([
    ['BasicMinesweeperGameProvider',
        (config) => new BasicMinesweeperGameProvider(config)],
    ['AlwaysMineMinesweeperGameProvider',
        (config) => new AlwaysMineMinesweeperGameProvider(config)],
    ['DiagnosticMinesweeperGameProvider',
        (config) => new DiagnosticMinesweeperGameProvider(config)],
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
            gameProvider: new BasicMinesweeperGameProvider(config),
            userGameType: 'BasicMinesweeperGameProvider',
            userHeight: '10',
            userWidth: '10',
            userMineCount: '20',
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


                <MinesweeperBoard gameProvider={this.state.gameProvider}
                                  visitFn={this.visit}/>
            </div>
        );
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
        });
    }
}

export default MinesweeperGame;