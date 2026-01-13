import { RANodeBinary, RANode  } from './RANode';
import { Schema } from './Schema';
import { Table } from './Table';

export class RecursiveExecutionNode extends RANodeBinary  {
    private _step: Table;
    private _next: Table;
    private _stepQueryFormulaHtml: string | null;

    constructor(name: string, accNode: RANode, stepNode: RANode, next: Table, step: Table, stepQueryFormulaHtml?: string) {
        super('∪', accNode, stepNode);
        this._step = step
        this._next = next;
        this._stepQueryFormulaHtml = stepQueryFormulaHtml ?? null;
        this.setResultNumRows(next.getNumRows());
    }

    getResult(): Table {
        return this._next;
    }

    getStepResult(): Table {
        return this._step;
    }

    getStepQueryFormulaHtml(): string | null {
        return this._stepQueryFormulaHtml;
    }

    getArgumentHtml(): string {
        return '';
    }

    getSchema(): Schema {
        return this._next.getSchema();
    }

    check(): void {
        this._child.check();
        this._child2.check();
    }

    public setNumRows(numRows: number): void { this.setResultNumRows(numRows); }
}