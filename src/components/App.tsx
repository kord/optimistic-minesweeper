import React from 'react';
import MinesweeperGame from "./minesweeperGame";
import '../css/App.css';
import {Constants} from "../constants";

function App() {
  return (
    <div className="App">

      <MinesweeperGame defaultBoardOptions={Constants.defaultBoardOptions}/>

    </div>
  );
}

export default App;
