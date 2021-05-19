import {BoardLoc} from "../boardLoc";
import {VariableAssignments} from "../types";
import WatchedDiagnosticGameProvider from "./watchedDiagnosticGameProvider";
import Watcher from "../logic/watcher";
import {iMinesweeperGameProvider} from "./gameProvider";
import {FixedBoardMinesweeperConfig} from "../constants";

class RuthlessPersecutionGameProvider extends WatchedDiagnosticGameProvider implements iMinesweeperGameProvider {
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

        if (!this.hasMine(loc)) {
            const nloc = loc.toNumber(this.config.size);
            const mines = new Set<number>([nloc]);

            // Try to find a minefield consistent with our current knowledge but also with a mine where you just
            // clicked.
            const va = new VariableAssignments();
            va.setTrue(nloc);
            for (let i = 0; i < RuthlessPersecutionGameProvider.maxAttempts; i++) {
                const assignment = this.watcher.findGameExtension(va);
                if (assignment) {
                    console.log(`RuthlessPersecutionGameProvider changing the future. It took me ${i+1} attempts.`);
                    return assignment.trues;
                }
            }
        }
    }

}


export default RuthlessPersecutionGameProvider;