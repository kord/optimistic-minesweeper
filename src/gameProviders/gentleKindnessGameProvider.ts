import {BoardLoc} from "../boardLoc";
import WatchedGameProvider from "./watchedGameProvider";
import Watcher from "../logic/watcher";
import {iMinesweeperGameProvider} from "./gameProvider";
import {Constants, FixedBoardMinesweeperConfig} from "../constants";
import {VariableAssignments} from "../logic/variableAssignments";

/**
 * Provide interaction with a minefield that can morph before the user clicks on a mine. If the user clicks on a
 * mine, this will search desperately for a minefield consistent with the currently revealed knowledge that can
 * be swapped in so you made a safe move.
 */
class GentleKindnessGameProvider extends WatchedGameProvider implements iMinesweeperGameProvider {
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
        // Don't bother rewriting anything if you didn't even fuck up.
        if (!this.hasMine(loc)) return undefined;

        console.log(`Trying to fix your mistake...`);
        const locn = loc.toNumber(this.size);

        // Try to find a minefield consistent with our current knowledge but also with an empty where you just
        // clicked.
        const va = new VariableAssignments();
        va.setFalse(locn);
        const assignment = this.watcher.tryFindGameExtension(va, GentleKindnessGameProvider.maxAttempts);
        if (assignment) {
            console.log(`GentleKindnessGameProvider changed the future.`);
            return assignment.trues;
        }
    }

}


export default GentleKindnessGameProvider;