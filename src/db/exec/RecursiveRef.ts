import { RANode, Session } from './RANode';
import { Table } from './Table';
import { Schema } from './Schema';
import { i18n } from 'calc2/i18n';

export class RecursiveRef extends RANode {
    private _name: string;
    private _cachedSchema?: Schema;

    constructor(name: string) {
        super('recursiveRef');
        this._name = name;
    }

    public setCachedSchema(schema: Schema) {
        this._cachedSchema = schema;
    }

    getSchema(): Schema {
		if (this._cachedSchema) return this._cachedSchema;
		this.throwExecutionError(i18n.t('db.messages.exec.recursive-ref-schema-not-available', {
			name: this._name,
		}));
    }

    check(): void {
    }

    getResult(_dedup: boolean = true, session?: Session): Table {
        session = this._returnOrCreateSession(session);
        const t = session._recursiveVars?.[this._name];

        if (!t) {
			this.throwExecutionError(i18n.t('db.messages.exec.recursive-ref-used-before-init', {
				name: this._name,
			}));
        }
        this.setResultNumRows(t.getNumRows());
        return t;
    }

    getWarnings(): any[] { return []; }

    getArgumentHtml(): string { return this._name; }

    getFormulaHtml(): string {
        return `<span class="math">ref(${this._name})</span>`;
    }
}