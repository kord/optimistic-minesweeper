export class VariableAssignments {
    public trues = new Set<number>();
    public falses = new Set<number>();

    public get count(): number {
        return this.trues.size + this.falses.size;
    };

    public known = (variable: number) => this.trues.has(variable) || this.falses.has(variable);

    public setTrue = (variable: number) => {
        if (this.falses.has(variable)) {
            throw new Error('Trying to set known false variable to true.')
        }
        this.trues.add(variable);
    }

    public setFalse = (variable: number) => {
        if (this.trues.has(variable)) {
            throw new Error('Trying to set known true variable to false.')
        }
        this.falses.add(variable);
    }

    public copy(): VariableAssignments {
        const ret = new VariableAssignments();
        this.trues.forEach(v => ret.trues.add(v));
        this.falses.forEach(v => ret.falses.add(v));
        return ret;
    }

    /**
     * Push all of the variables from other into this. Return true if everything is cool, false if a conflict was
     * found preventing the merger.
     * @param other
     */
    public mergeFrom(other: VariableAssignments): boolean {
        if (!this.consistentWith(other)) return false;

        let iter = other.falses.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            this.falses.add(i.value);
        }
        iter = other.trues.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            this.trues.add(i.value);
        }

        return true;
    }

    public consistentWith(requirements: VariableAssignments) {
        let iter = requirements.falses.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            if (this.trues.has(i.value)) {
                return false;
            }
        }
        iter = requirements.trues.keys();
        for (let i = iter.next(); !i.done; i = iter.next()) {
            if (this.falses.has(i.value)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Invert all of the assignments in place and return itself, after flipping everything.
     */
    public invertAssignments() {
        const swapper = this.trues;
        this.trues = this.falses;
        this.falses = swapper;
        return this;
    }
}