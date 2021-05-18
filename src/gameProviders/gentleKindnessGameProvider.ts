import {BoardLoc} from "../boardLoc";
import {FixedBoardMinesweeperConfig, iMinesweeperGameProvider, VariableAssignments} from "../types";
import WatchedDiagnosticGameProvider from "./watchedDiagnosticGameProvider";
import Watcher from "../logic/watcher";

class GentleKindnessGameProvider extends WatchedDiagnosticGameProvider implements iMinesweeperGameProvider {
    private static maxAttempts = 100;
    constructor(config: FixedBoardMinesweeperConfig) {
        super(config);
        // Don't bother doing any complex inference with the incoming clicks.
        this.watcher = new Watcher(config, 0, 0);
    }

    protected changedMinefieldInResponseToNextVisit(loc: BoardLoc): Set<number> | undefined {
        const diagnosticInfo = this.diagnosticInfo(loc);
        // Nothing we can do for you if it's already written in stone.
        if (diagnosticInfo.knownMine || diagnosticInfo.knownNonMine) return undefined;

        if (this.hasMine(loc)) {
            console.log(`Trying to fix your mistake...`);
            const nloc = loc.toNumber(this.config.size);
            const mines = new Set<number>([nloc]);

            // Try to find a minefield consistent with our current knowledge but also with an empty where you just
            // clicked.
            const va = new VariableAssignments();
            va.setFalse(nloc);
            for (let i = 0; i < GentleKindnessGameProvider.maxAttempts; i++) {
                const assignment = this.watcher.findGameExtension(va);
                if (assignment) {
                    console.log(`GentleKindnessGameProvider changing the future. It took me ${i+1} attempts.`);
                    return assignment.trues;
                }
            }
        }
    }

}


export default GentleKindnessGameProvider;