import { RANode, RANodeBinary, Session } from './RANode';
import { Table } from './Table';
import { RecursiveRef } from './RecursiveRef';
import { Schema } from './Schema';
import { RecursiveExecutionNode } from './RecursiveExecutionNode';
import { i18n } from 'calc2/i18n';

export class RecursiveAssignment extends RANodeBinary {
    private _name: string;
    private _initial: RANode;
    private _recursive: RANode;
    private _lastRecursiveStep: RANode;
    private _cachedSchema: any;
    private _iterations: Table[] = [];

    constructor(name: string, initial: RANode, recursive: RANode) {
        super('recursive', initial, recursive);
        this._name = name;
        this._initial = initial;
        this._recursive = recursive;
    }

    private _schemasUnionCompatible(a: Schema, b: Schema): { ok: boolean; reason?: string } {
        if (a.getSize() !== b.getSize()) {
          return {
            ok: false,
            reason: i18n.t('db.messages.exec.recursive.union-col-count-diff', {
                a: a.getSize(),
                b: b.getSize(),
            }),
          };
        }
        for (let i = 0; i < a.getSize(); i++) {
          const ca = a.getColumn(i);
          const cb = b.getColumn(i);
          const ta = a.getType(i);
          const tb = b.getType(i);

          if (ca.getName() !== cb.getName()) {
            return {
                ok: false,
                reason: i18n.t('db.messages.exec.recursive.union-col-name-diff', {
                    index: i + 1,
                    a: String(ca.getName()),
                    b: String(cb.getName()),
                }),
            };
          }
          if (ta !== tb) {
            return {
                ok: false,
                reason: i18n.t('db.messages.exec.recursive.union-col-type-diff', {
                    index: i + 1,
                    a: ta,
                    b: tb,
                }),
            };
          }
        }
        return { ok: true };
      }

    private _propagateSchemaToRefs(schema: any) {
        const clone = (typeof schema.copy === 'function') ? schema.copy() : schema;
        if (clone && Array.isArray((clone as any)._relAliases)) {
            (clone as any)._relAliases = (clone as any)._relAliases.map(() => this._name);
        }

        const visit = (n: RANode) => {
            if (!n) return;
            if (n instanceof RecursiveRef && (n as any)._name === this._name) {
            n.setCachedSchema(clone);
            }
            const anyN: any = n as any;
            if (anyN._child) visit(anyN._child);
            if (anyN._child2) visit(anyN._child2);
        };
        visit(this._recursive);
    }

    getSchema() {
        if (!this._cachedSchema) {
            this._cachedSchema = this._initial.getSchema();
            this._propagateSchemaToRefs(this._cachedSchema);
        }
        return this._cachedSchema;
    }

    check() {
        this._initial.check();
        const initialSchema = this._initial.getSchema();

        this._propagateSchemaToRefs(initialSchema);

        this._recursive.check();
        const recursiveSchema = this._recursive.getSchema();

        const compat = this._schemasUnionCompatible(initialSchema, recursiveSchema);
        if (!compat.ok) {
			this.throwExecutionError(i18n.t('db.messages.exec.recursive.seed-step-not-union-compatible', {
				name: this._name,
				reason: compat.reason ?? '',
			}));
        }
    }

    private unionTables(a: Table, b: Table, dedup: boolean): Table {
        const res = a.copy();
        for (let i = 0; i < b.getNumRows(); i++) {
            res.addRow(b.getRow(i));
        }
        if (dedup) {
            res.eliminateDuplicateRows();
        }
        return res;
    }

    private _computeDelta(step: Table, accKeySet: Set<string>): Table {
        // Returns only rows from `step` that are not already present in `accKeySet`.
        const delta = new Table();
        delta.setSchema(step.getSchema().copy());

        const rows = step.getRows();
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const key = JSON.stringify(row);
            if (accKeySet.has(key)) {
                continue;
            }
            accKeySet.add(key);
            delta.addRow(row);
        }
        return delta;
    }

    getResult(doEliminateDuplicateRows: boolean = true, session?: Session): Table {
        session = this._returnOrCreateSession(session);

        this._iterations = [];

        let acc = this._initial.getResult(doEliminateDuplicateRows, session);
        this._iterations.push(acc);

        let accNode = this._initial;

        if (!session._recursiveVars) session._recursiveVars = {};

        // In set semantics (UNION / dedup), use semi-naive evaluation:
        // each recursive iteration sees only the delta (new rows) from the previous step.
        // This avoids re-deriving old tuples and makes *_step_i contain only new rows.
        if (doEliminateDuplicateRows) {
            const accKeySet = new Set<string>();
            for (const row of acc.getRows()) {
                accKeySet.add(JSON.stringify(row));
            }

            let delta = acc;
            session._recursiveVars[this._name] = delta;

            const MAX_ITERATIONS = 100;
            for (let i = 0; i < MAX_ITERATIONS; i++) {
                const step = this._recursive.getResult(true, session);

                // Safety Guard
                const compat = this._schemasUnionCompatible(acc.getSchema(), step.getSchema());
                if (!compat.ok) {
                    this.throwExecutionError(i18n.t('db.messages.exec.recursive.union-incompatible-at-runtime', {
                        name: this._name,
                        reason: compat.reason ?? '',
                    }));
                }

                const newRows = this._computeDelta(step, accKeySet);
                if (newRows.getNumRows() === 0) {
                    break;
                }

                const next = this.unionTables(acc, newRows, false);

                const stepRel = newRows.createRelation(`${this._name}_step_${i}`);
                stepRel.setNumRows(newRows.getNumRows());
                const stepQueryFormulaHtml = this._recursive.getFormulaHtml(true, false);
                stepRel.setMetaData('stepQueryFormulaHtml', stepQueryFormulaHtml);

                const execNode = new RecursiveExecutionNode(
                    `${this._name}_iter_${i}`,
                    accNode,
                    stepRel,
                    next,
                    newRows,
                    stepQueryFormulaHtml
                );

                this._lastRecursiveStep = execNode;
                accNode = execNode;
                acc = next;
                this._iterations.push(next);

                delta = newRows;
                session._recursiveVars[this._name] = delta;
            }
        }
        else {
            session._recursiveVars[this._name] = acc;

            const MAX_ITERATIONS = 1024;
            for (let i = 0; i < MAX_ITERATIONS; i++) {
                const step = this._recursive.getResult(false, session);

                // Safety Guard
                const compat = this._schemasUnionCompatible(acc.getSchema(), step.getSchema());
                if (!compat.ok) {
                    this.throwExecutionError(i18n.t('db.messages.exec.recursive.union-incompatible-at-runtime', {
                        name: this._name,
                        reason: compat.reason ?? '',
                    }));
                }

                const next = this.unionTables(acc, step, false);

                if (next.equals(acc)) {
                    acc = next;
                    break;
                }

                const stepRel = step.createRelation(`${this._name}_step_${i}`);
                stepRel.setNumRows(step.getNumRows());
                const stepQueryFormulaHtml = this._recursive.getFormulaHtml(true, false);
                stepRel.setMetaData('stepQueryFormulaHtml', stepQueryFormulaHtml);

                const execNode = new RecursiveExecutionNode(
                    `${this._name}_iter_${i}`,
                    accNode,
                    stepRel,
                    next,
                    step,
                    stepQueryFormulaHtml
                );

                this._lastRecursiveStep = execNode;
                accNode = execNode;
                acc = next;
                this._iterations.push(next);

                session._recursiveVars[this._name] = next;
            }
        }

        const finalSchema = acc.getSchema();
        for (let ci = 0; ci < finalSchema.getSize(); ci++) {
           finalSchema.setRelAlias(this._name, ci);
        }

        this.setResultNumRows(acc.getNumRows());
        return acc;
    }

    public getInitial(): RANode {
        return this._initial;
    }

    public getRecursive(): RANode {
        return this._recursive;
    }

    public getRecursiveSteps(): RANode {
        return this._lastRecursiveStep;
    }

    public getIterationTable(index: number): Table {
        return this._iterations[index];
    }

    getArgumentHtml(): string {
        const steps = this._iterations.length;
        return steps > 0
            ? `${this._name} (${steps} steps)`
            : this._name;
    }

    getWarnings(recursive: boolean): any[] {
        if (!recursive) return this._warnings;
        return [
            ...this._warnings,
            ...this._child.getWarnings(true),
            ...this._child2.getWarnings(true)
        ];
    }
}