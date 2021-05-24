import {BoardLoc} from "../boardLoc";
import {VariableAssignments} from "../types";
import WatchedGameProvider from "./watchedGameProvider";
import Watcher from "../logic/watcher";
import {iMinesweeperGameProvider} from "./gameProvider";
import {Constants, FixedBoardMinesweeperConfig} from "../constants";

/**
 * Provide interaction with a minefield that can morph before the user clicks on a mine. In the event that there is
 * no actually safe square for the user to visit, any visit consistent with the revealed knowledge will be safe.
 * This is an effective alternative to "no guess" minesweeper and plays more like the original.
 */
class ForcedGuessesAlwaysSucceedGameProvider extends WatchedGameProvider implements iMinesweeperGameProvider {
    private static maxAttempts = 200;
    private harshMode: boolean;

    constructor(config: FixedBoardMinesweeperConfig, harshMode: boolean = true) {
        // This watcher will always know *some* futures.
        // The watcher's known satisfying minefields are used to approximately infer whether we're in a situation
        // requiring a guess.
        const watcher = new Watcher(config, Constants.defaultGameChangingWatcherConfig);

        super(config, watcher);
        this.harshMode = harshMode;
    }

    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc): Set<number> | undefined {
        const diagnosticInfo = this.diagnosticInfo(loc);
        // Nothing we can do for you if it's already written in stone.
        if (diagnosticInfo.knownMine || diagnosticInfo.knownNonMine) return undefined;

        // Don't bother rewriting anything if you didn't even fuck up.
        if (!this.hasMine(loc)) return undefined;

        // Beef up our known solutions one last time before judgement day.
        this.watcher.findAndStoreContinuations();

        // TODO: Consider only local required guess to enable rewriting. It would be nice to shrink a dead-knowledge
        //  corner just as soon as you can see it's a bust locally, without having to complete the rest of everything
        //  to dead first. This is doable, but we have to separate the variables into constraint-connected components.

        // If there's something else you could have done that even our simple country watcher knows, you're on your own.
        let iter: IterableIterator<number>;
        if (this.harshMode) {
            // This is harsher because it includes all of the places we've just never successfully imagined a mine.
            // It's possible we're wrong and there really wasn't a safe place to go, but very unlikely.
            //
            // We explicitly exclude locations off the frontier, where fluctuations in our guessing make more impact
            // and can poison this whole process.
            iter = this.watcher.neverSeenAsMineLocs().keys();
        } else {
            // We are absolutely certain that nothing here is a mine given our observations.
            iter = this.watcher.knownSafeLocs().keys();
        }

        for (let i = iter.next(); !i.done; i = iter.next()) {
            const loc = i.value;
            if (!this.visitResults.has(loc)) {
                // Shoulda gone there instead, dumbass.
                console.log(`You could have tried ${BoardLoc.fromNumber(loc, this.size)}`);
                return undefined;
            }
        }

        const locn = loc.toNumber(this.size);

        // Try to find a minefield consistent with our current knowledge but also with an empty where you just
        // clicked.
        const va = new VariableAssignments();
        va.setFalse(locn);
        const assignment = this.watcher.searchKnownGameExtensions(va, ForcedGuessesAlwaysSucceedGameProvider.maxAttempts);
        if (assignment) {
            console.log(`ForcedGuessesAlwaysSucceedGameProvider changed the future.`);
            return assignment.trues;
        }
    }

}


export default ForcedGuessesAlwaysSucceedGameProvider;