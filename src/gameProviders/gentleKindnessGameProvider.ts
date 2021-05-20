import {BoardLoc} from "../boardLoc";
import {VariableAssignments} from "../types";
import WatchedGameProvider from "./watchedGameProvider";
import Watcher from "../logic/watcher";
import {iMinesweeperGameProvider} from "./gameProvider";
import {FixedBoardMinesweeperConfig} from "../constants";

class GentleKindnessGameProvider extends WatchedGameProvider implements iMinesweeperGameProvider {
    private static maxAttempts = 100;

    constructor(config: FixedBoardMinesweeperConfig) {
        // This watcher will always know *some* future. This makes autoplay always succeed.
        const watcherConfig = {
            maintainedFutures: 1,
            futureReadsPerMove: 0,
            alwaysKnowSomeConsistentMinefield: true
        };
        const watcher = new Watcher(config, watcherConfig);

        super(config, watcher);
        // Don't bother doing any complex inference with the incoming clicks.

    }

    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc): Set<number> | undefined {
        const diagnosticInfo = this.diagnosticInfo(loc);
        // Nothing we can do for you if it's already written in stone.
        if (diagnosticInfo.knownMine || diagnosticInfo.knownNonMine) return undefined;

        if (this.hasMine(loc)) {
            console.log(`Trying to fix your mistake...`);
            const nloc = loc.toNumber(this.size);
            const mines = new Set<number>([nloc]);

            // Try to find a minefield consistent with our current knowledge but also with an empty where you just
            // clicked.
            const va = new VariableAssignments();
            va.setFalse(nloc);
            for (let i = 0; i < GentleKindnessGameProvider.maxAttempts; i++) {
                const assignment = this.watcher.findGameExtension(va);
                if (assignment) {
                    console.log(`GentleKindnessGameProvider changing the future. It took me ${i + 1} attempts.`);
                    return assignment.trues;
                }
            }
        }
    }

}


export default GentleKindnessGameProvider;