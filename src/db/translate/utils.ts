type astNode = (
	relalgAst.relalgOperation
	| relalgAst.rootRelalg
	| sqlAst.rootSql
	| sqlAst.statement
	| sqlAst.sqlOperation
);

export function mapPostOrder<T extends astNode>(
	node: astNode,
	func: (n: astNode) => astNode,
): astNode {
	// let child: astNode | undefined = node.child;
	// let child2: astNode | undefined = node.child2;
	// let assignments: any[] | undefined = node.assignments;
	// let from: sqlAst.statement['from'] | undefined = node['from'];
	// let statement: sqlAst.relationFromSubstatement['statement'] | undefined = undefined;
	// 
	// let changed = false;

	// descent
	if (node.child !== undefined) {
		const child = mapPostOrder(node.child, func);

		if (child !== node.child) {
			node = Object.assign({}, node, { child });
		}
	}

	if (node.child2 !== undefined) {
		const child2 = mapPostOrder(node.child2, func);

		if (child2 !== node.child2) {
			node = Object.assign({}, node, { child2 });
		}
	}


	if (node.type === 'statement') {
		const from = mapPostOrder(node.from, func);

		if (from !== node.from) {
			node = Object.assign({}, node, { from });
		}
	}
	else if (node.type === 'relationFromSubstatement') {
		const statement = mapPostOrder(node.statement, func);

		if (statement !== node.statement) {
			node = Object.assign({}, node, { statement });
		}
	}
	else if (node.type === 'relalgRoot') {
		let changed = false;
		const assignments = node.assignments.map(a => {
			const x = mapPostOrder(a.child, func);

			if (x !== a.child) {
				changed = true;
				return {
					...a,
					child: x,
				};
			}
			else {
				return a;
			}
		});

		if (changed) {
			node = Object.assign({}, node, { assignments });
		}
	}
	else if (node.type === 'sqlRoot') {
		let changed = false;
		const assignments = node.assignments.map(a => {
			const x = mapPostOrder(a.child, func);

			if (x !== a.child) {
				changed = true;
				return {
					...a,
					child: x,
				};
			}
			else {
				return a;
			}
		});

		if (changed) {
			node = Object.assign({}, node, { assignments });
		}
	}

	const mapped = func(node);
	return mapped;
}

export function forEachPreOrder(
	node: relalgAst.astNode | sqlAst.astNode | relalgAst.GroupRoot,
	func: (node: relalgAst.astNode | sqlAst.astNode | relalgAst.Group | relalgAst.GroupRoot) => void,
	descentIntoAssignments: boolean = true,
): void {
	func(node);

	if (node.type === 'statement') {
		forEachPreOrder(node.from, func, descentIntoAssignments);
	}
	else if (node.type === 'relationFromSubstatement') {
		forEachPreOrder(node.statement, func, descentIntoAssignments);
	}

	if ('child' in node && typeof node.child !== 'undefined') {
		forEachPreOrder(node.child, func, descentIntoAssignments);
	}
	if ('child2' in node && typeof node.child2 !== 'undefined') {
		forEachPreOrder(node.child2, func, descentIntoAssignments);
	}
	if ('assignments' in node && typeof node.assignments !== 'undefined' && descentIntoAssignments === true) {
		for (const a of node.assignments) {
			forEachPreOrder(a, func, descentIntoAssignments);
		}
	}
}

/**
 * Utility function to perform deep equality check
 */
export function deepEqual(obj1: any, obj2: any): boolean {
	if (obj1 === obj2) {
		return true;
	}

	if (obj1 == null || obj2 == null) {
		return obj1 === obj2;
	}

	if (typeof obj1 !== typeof obj2) {
		return false;
	}

	if (typeof obj1 !== 'object') {
		return obj1 === obj2;
	}

	// Handle arrays
	if (Array.isArray(obj1) !== Array.isArray(obj2)) {
		return false;
	}

	if (Array.isArray(obj1)) {
		if (obj1.length !== obj2.length) {
			return false;
		}
		for (let i = 0; i < obj1.length; i++) {
			if (!deepEqual(obj1[i], obj2[i])) {
				return false;
			}
		}
		return true;
	}

	// Handle objects with _rows property (Table-like objects)
	if (obj1._rows && obj2._rows) {
		if (!Array.isArray(obj1._rows) || !Array.isArray(obj2._rows)) {
			return false;
		}
		if (obj1._rows.length !== obj2._rows.length) {
			return false;
		}
		for (let i = 0; i < obj1._rows.length; i++) {
			if (!deepEqual(obj1._rows[i], obj2._rows[i])) {
				return false;
			}
		}
		return true;
	}

	// Handle regular objects
	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (const key of keys1) {
		if (!keys2.includes(key)) {
			return false;
		}
		if (!deepEqual(obj1[key], obj2[key])) {
			return false;
		}
	}

	return true;
}
