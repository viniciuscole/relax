declare namespace trcAst {
	type Operator = '=' | '!=' | '<' | '>' | '<=' | '>='
	type Quantifier = 'exists' | 'forAll'
	type LogicalOperator = 'or' | 'and' | 'implies'

	interface CodeInfo {
		location: {
			start: { offset: number, line: number, column: number },
			end: { offset: number, line: number, column: number },
		},
		text: string
	}

	interface TRC_Expr {
		type: 'TRC_Expr',
		variables: string[],
		projections: relalgAst.projection,
		formula: LogicalExpression,
		codeInfo: CodeInfo
	}

	interface LogicalExpression {
		type: 'LogicalExpression',
		left: AttributeReference | LogicalExpression,
		operator: LogicalOperator,
		right: LogicalExpression | QuantifiedExpression | Predicate,
		codeInfo: CodeInfo
	}

	interface RelationPredicate {
		type: 'RelationPredicate',
		relation: string,
		variable: string,
		codeInfo: CodeInfo
	}

	interface Predicate {
		type: 'Predicate',
		condition: relalgAst.valueExpr
		codeInfo: CodeInfo,
	}

	interface AttributeReference {
		type: 'AttributeReference',
		variable: string,
		attribute: string,
		codeInfo: CodeInfo,
	}

	interface QuantifiedExpression {
		type: 'QuantifiedExpression',
		quantifier: Quantifier,
		variable: string,
		formula: LogicalExpression,
		codeInfo: CodeInfo,
	}

	interface Negation {
		type: 'Negation',
		formula: LogicalExpression,
		codeInfo: CodeInfo,
	}
}