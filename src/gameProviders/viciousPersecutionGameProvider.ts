import {BoardLoc} from "../boardLoc";
import WatchedGameProvider from "./watchedGameProvider";
import Watcher from "../logic/watcher";
import {iMinesweeperGameProvider} from "./gameProvider";
import {Constants, FixedBoardMinesweeperConfig} from "../constants";
import {VariableAssignments} from "../logic/variableAssignments";

class ViciousPersecutionGameProvider extends WatchedGameProvider implements iMinesweeperGameProvider {
    private static maxAttempts = 100;

    constructor(config: FixedBoardMinesweeperConfig) {
        // This watcher will always know *some* future.
        // Don't bother doing any complex inference with the incoming clicks.
        const watcher = new Watcher(config, Constants.defaultGameChangingWatcherConfig);

        super(config, watcher);
    }

    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc): Set<number> | undefined {
        const diagnosticInfo = this.diagnosticInfo(loc);
        // Nothing we can do for you if it's already written in stone.
        if (diagnosticInfo.knownMine || diagnosticInfo.knownNonMine) return undefined;
        // Don't bother rewriting anything if you already fucked up.
        if (this.hasMine(loc)) return undefined;

        const locn = loc.toNumber(this.size);

        // Try to find a minefield consistent with our current knowledge but also with a mine where you just
        // clicked.
        const va = new VariableAssignments();
        va.setTrue(locn);

        const assignment = this.watcher.tryFindGameExtension(va, ViciousPersecutionGameProvider.maxAttempts);
        if (assignment) {
            console.log(`ViciousPersecutionGameProvider changed the future.`);
            return assignment.trues;
        }
    }

}


export default ViciousPersecutionGameProvider;