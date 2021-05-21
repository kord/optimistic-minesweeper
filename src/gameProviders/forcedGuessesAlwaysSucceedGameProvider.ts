import {BoardLoc} from "../boardLoc";
import {VariableAssignments} from "../types";
import WatchedGameProvider from "./watchedGameProvider";
import Watcher from "../logic/watcher";
import {iMinesweeperGameProvider} from "./gameProvider";
import {FixedBoardMinesweeperConfig} from "../constants";

class ForcedGuessesAlwaysSucceedGameProvider extends WatchedGameProvider implements iMinesweeperGameProvider {
    private static maxAttempts = 100;
    private harshMode: boolean;

    constructor(config: FixedBoardMinesweeperConfig, harshMode : boolean = true) {
        // This watcher will always know *some* futures.
        // The watcher's known satisfying minefields are used to approximately infer whether we're in a situation
        // requiring a guess.
        const watcherConfig = {
            maintainedFutures: 100,
            futureReadsPerMove: 50,
            alwaysKnowSomeConsistentMinefield: true
        };
        const watcher = new Watcher(config, watcherConfig);

        super(config, watcher);
        this.harshMode = harshMode;
    }

    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc): Set<number> | undefined {
        const diagnosticInfo = this.diagnosticInfo(loc);
        // Nothing we can do for you if it's already written in stone.
        if (diagnosticInfo.knownMine || diagnosticInfo.knownNonMine) return undefined;

        // Don't bother rewriting anything if you didn't even fuck up.
        if (!this.hasMine(loc)) return undefined;

        // If there's something else you could have done that even our simple country watcher knows, you're on your own.
        let iter: IterableIterator<number>;
        if (this.harshMode) {
            // This is harsher because it includes all of the places we've just never successfully imagined a mine.
            // It's possible we're wrong and there really wasn't a safe place to go, but very unlikely.
            iter = this.watcher.neverSeenAsMineLocs().keys();
        } else {
            // We are absolutely certain that nothing here is a mine given our observations.
            iter = this.watcher.knownSafeLocs().keys();
        }
        for (let i = iter.next(); !i.done; i = iter.next()) {
            const loc = i.value;
            if (!this.visitResults.has(loc)) {
                // Shoulda gone there instead, dumbass.
                return undefined;
            }
        }

        const locn = loc.toNumber(this.size);

        // Try to find a minefield consistent with our current knowledge but also with an empty where you just
        // clicked.
        const va = new VariableAssignments();
        va.setFalse(locn);
        for (let i = 0; i < ForcedGuessesAlwaysSucceedGameProvider.maxAttempts; i++) {
            const assignment = this.watcher.findGameExtension(va);
            if (assignment) {
                console.log(`ForcedGuessesAlwaysSucceedGameProvider changed the future. It took me ${i + 1} attempts.`);
                return assignment.trues;
            }
        }
    }

}


export default ForcedGuessesAlwaysSucceedGameProvider;