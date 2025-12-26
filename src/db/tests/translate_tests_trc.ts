/*** Copyright 2016 Johannes Kessler 2016 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// cspell:disable

import { Relation } from 'db/exec/Relation';
import { RANode } from '../exec/RANode';
import * as relalgjs from '../relalg';


const srcTableR: Relation = relalgjs.executeRelalg(`{
	R.a, R.b, R.c

	1,    a,   d
	3,    c,   c
	4,    d,   f
	5,    d,   b
	6,    e,   f
	1000, e,   k
}`, {}) as Relation;
const srcTableS: Relation = relalgjs.executeRelalg(`{
	S.b, S.d

	a,   100
	b,   300
	c,   400
	d,   200
	e,   150
}`, {}) as Relation;
const srcTableT: Relation = relalgjs.executeRelalg(`{
	T.b, T.d

	a,   100
	d,   200
	f,   400
	g,   120
}`, {}) as Relation;

const relations: {
	R: Relation,
	S: Relation,
	T: Relation,
} = {
	R: srcTableR,
	S: srcTableS,
	T: srcTableT,
};


function exec_trc(query: string): RANode {
	const ast = relalgjs.parseTRCSelect(query);
	const root = relalgjs.relalgFromTRCAstRoot(ast, relations);
	root.check();

	return root;
}

function exec_ra(query: string) {
	return relalgjs.executeRelalg(query, relations);
}


QUnit.module('translate trc ast to relational algebra', () => {

	QUnit.test('test formula aliasing', (assert) => {
		const queryTrc = '{ r | R(r) and ∃p (R(p) and p.a > 1) }';

		const resultTrc = exec_trc(queryTrc).getResult();

		assert.deepEqual(resultTrc.getRows(), srcTableR.getResult().getRows());
	});

	QUnit.module('Projection', () => {

		QUnit.module('Helper functions', () => {
			QUnit.test('test concat()', (assert) => {
				const queryTrc1 = '{ concat(t.b, t.c)->bla | R(t) }';
				const queryTrc2 = '{ (t.b || t.c)->bla | R(t) }';
				const queryRa = 'pi concat(b, c)->bla (R)'

				const resultTrc1 = exec_trc(queryTrc1).getResult();
				const resultTrc2 = exec_trc(queryTrc2).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc1.getRows(), resultRa.getRows());
				assert.deepEqual(resultTrc2.getRows(), resultRa.getRows());
			});

			QUnit.test('test lower()', (assert) => {
				const queryTrc = "{ lower(t.b)->y | S(t) and lower(t.b) < 'd' }";
				const queryRa = "sigma y < 'd' (pi lower(b)->y (S))";
				
				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();
				
				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test upper()', (assert) => {
				const queryTrc = "{ upper(t.b)->y | S(t) and upper(t.b) < 'D' }";
				const queryRa = "sigma y < 'D' (pi upper(b)->y (S))";
				
				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();
				
				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test length()', (assert) => {
				const queryTrc = "{ length(t.b)->y | S(t) and length(t.b) < 3 }";
				const queryRa = "sigma y < 3 (pi length(b)->y (S))";

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test repeat()', function (assert) {
				const queryTrc = "{ repeat(t.b, 3)->x | R(t) }";
				const queryRa = " pi repeat(b, 3)->x (R) "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test replace()', (assert) => {
				const queryTrc = "{ replace(concat(t.a, t.b, t.c), 'c', 'C')->bla | R(t) }";
				const queryRa = " pi replace(x, 'c', 'C')->y (pi concat(a, b, c)->x (R)) "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test reverse()', (assert) => {
				const queryTrc = "{ reverse(concat(t.a, t.b, t.c))->x | R(t) }";
				const queryRa = " pi reverse(x)->y (pi concat(a, b, c)->x (R)) "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test sqrt of negative number', function (assert) {
				const queryTrc = "{ t.a, sqrt(-4)->k | R(t) }";
				const queryRa = " pi a, sqrt(-4)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test sqrt of zero', function (assert) {
				const queryTrc = "{ t.a, sqrt(0)->k | R(t) }";
				const queryRa = " pi a, sqrt(0)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test sqrt of one', function (assert) {
				const queryTrc = "{ t.a, sqrt(1)->k | R(t) }";
				const queryRa = " pi a, sqrt(1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test sqrt of one hundred', function (assert) {
				const queryTrc = "{ t.a, sqrt(100)->k | R(t) }";
				const queryRa = " pi a, sqrt(100)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test e raised to the power of 0', function (assert) {
				const queryTrc = "{ t.a, exp(0)->k | R(t) }";
				const queryRa = " pi a, exp(0)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test e raised to the power of 1', function (assert) {
				const queryTrc = "{ t.a, exp(1)->k | R(t) }";
				const queryRa = " pi a, exp(1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test e raised to the power of 2', function (assert) {
				const queryTrc = "{ t.a, exp(2)->k | R(t) }";
				const queryRa = " pi a, exp(2)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test column raised to the power of 0', function (assert) {
				const queryTrc = "{ t.a, power(a, 0)->k | R(t) }";
				const queryRa = " pi a, power(a, 0)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test column raised to the power of 1', function (assert) {
				const queryTrc = "{ t.a, power(a, 1)->k | R(t) }";
				const queryRa = " pi a, power(a, 1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test column raised to the power of 2', function (assert) {
				const queryTrc = "{ t.a, power(a, 2)->k | R(t) }";
				const queryRa = " pi a, power(a, 2)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test natural logarithm of a negative number', function (assert) {
				const queryTrc = "{ t.a, ln(-1)->k | R(t) }";
				const queryRa = " pi a, ln(-1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test natural logarithm of zero', function (assert) {
				const queryTrc = "{ t.a, ln(0)->k | R(t) }";
				const queryRa = " pi a, ln(0)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test natural logarithm of 1', function (assert) {
				const queryTrc = "{ t.a, ln(1)->k | R(t) }";
				const queryRa = " pi a, ln(1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test natural logarithm of 2', function (assert) {
				const queryTrc = "{ t.a, ln(2)->k | R(t) }";
				const queryRa = " pi a, ln(2)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 2, of -1', function (assert) {
				const queryTrc = "{ t.a, log(2, -1)->k | R(t) }";
				const queryRa = " pi a, log(2, -1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 2, of 0', function (assert) {
				const queryTrc = "{ t.a, log(2, 0)->k | R(t) }";
				const queryRa = " pi a, log(2, 0)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 2, of 1', function (assert) {
				const queryTrc = "{ t.a, log(2, 1)->k | R(t) }";
				const queryRa = " pi a, log(2, 1)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base -1, of 16', function (assert) {
				const queryTrc = "{ t.a, log(-1, 16)->k | R(t) }";
				const queryRa = " pi a, log(-1, 16)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 0, of 16', function (assert) {
				const queryTrc = "{ t.a, log(0, 16)->k | R(t) }";
				const queryRa = " pi a, log(0, 16)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 1, of 16', function (assert) {
				const queryTrc = "{ t.a, log(1, 16)->k | R(t) }";
				const queryRa = " pi a, log(1, 16)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 2, of 4', function (assert) {
				const queryTrc = "{ t.a, log(2, 4)->k | R(t) }";
				const queryRa = " pi a, log(2, 4)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test logarithm, base 10, of 1000', function (assert) {
				const queryTrc = "{ t.a, log(10, 1000)->k | R(t) }";
				const queryRa = " pi a, log(10, 1000)->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 2 args comma style', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('Quadratically',5) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('Quadratically',5) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 2 args from style', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('foobarbar' FROM 4) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('foobarbar' FROM 4) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 2 args negative pos', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('Sakila', -3) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('Sakila', -3) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args comma style', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('Quadratically',5,6) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('Quadratically',5,6) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args from/for style', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('Quadratically' FROM 5 for 6) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('Quadratically' FROM 5 for 6) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args negative pos', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('Sakila', -5, 3) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('Sakila', -5, 3) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args pos equals to 0', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('abcdef', 0, 5) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('abcdef', 0, 5) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args pos greater than string length', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('abcdef', 100, 5) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('abcdef', 100, 5) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args negative length', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('abcdef', 5, -3) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('abcdef', 5, -3) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args length equals to 0', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('abcdef', 5, 0) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('abcdef', 5, 0) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test substring 3 args length greater than string length', function (assert) {
				const queryTrc = "{ t.a, SUBSTRING('abcdef', 5, 10) -> str | R(t) }";
				const queryRa = " pi a, SUBSTRING('abcdef', 5, 10) -> str R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test cast function', function (assert) {
				const queryTrc = "{ cast(t.a as string) -> str, cast('100' as number)->n , cast('false' as boolean) -> bool, cast('2025-04-16' as date)->dt | t in R }";
				const queryRa = " pi cast(a as string) -> str, cast('100' as number)->n , cast('false' as boolean) -> bool, cast('2025-04-16' as date)->dt R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test combined functions v1', function (assert) {
				const queryTrc = "{ length(concat(t.a, t.b, t.c))->k | t in R }";
				const queryRa = " pi length(concat(a, b, c))->k R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test combined functions v2', function (assert) {
				const queryTrc = "{ t.a, (concat('tam=', length(concat(t.a,t.b,t.c))))->n | t in R }";
				const queryRa = " pi a, (concat('tam=', length(concat(a,b,c))))->n R "

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		});

		QUnit.module('Whitespace in functions', () => {
			QUnit.test('whitespace(s) between n-ary text function and opening parenthesis', function (assert) {
				const queryTrc = "{ concat  (t.a, t.b, t.c)->k | R(t) }";
				const queryRa = "pi concat  (a, b, c)->k (R)";
				
				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();
				
				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
			
			QUnit.test('whitespace(s) between binary function and opening parenthesis', function (assert) {
				const queryTrc = "{ add    (t.a, 5)->a_plus_5 | R(t) }";
				const queryRa = "pi add    (a, 5)->a_plus_5 (R)";
				
				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();
				
				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
			
			QUnit.test('whitespace(s) between unary function and opening parenthesis', function (assert) {
				const queryTrc = "{ t.a + length  (  t.c )->x, upper (   t.b  )->k | R(t) }";
				const queryRa = "pi a + length  (  c )->x, upper (   b  )->k (R)";
				
				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();
				
				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		});

		QUnit.module('Single tuple variable', () => {
			QUnit.test('test project all columns', (assert) => {
				const query = '{ t | R(t) }';
				const root = exec_trc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project all columns (asterisk)', (assert) => {
				const query = '{ t.* | R(t) }';
				const root = exec_trc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project all columns (in operator)', (assert) => {
				const query = '{ t | t in R }';
				const root = exec_trc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project all columns (∈ operator)', (assert) => {
				const query = '{ t | t ∈ R }';
				const root = exec_trc(query);

				assert.deepEqual(root.getResult().getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('test project some columns', (assert) => {
				const queryTrc = '{ t.a, t.b | R(t) }';
				const queryRa = 'pi t.a, t.b (ρt(R))';

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultRa, resultTrc);
			});

			QUnit.test('test project some columns based on position', (assert) => {
				const queryTrc = '{ t.[1], t.[2] | R(t) }';
				const queryRa = 'pi t.a, t.b (ρt(R))';

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultRa, resultTrc);
			});

			QUnit.test('test tuple variable renaming', (assert) => {
				const queryTrc = '{ r.a->x, r.b->y, r.c->z | R(r) }';
				const queryRa = 'pi x, y, z (ρ x←a, y←b, z←c R)';

				const resultTrc = exec_trc(queryTrc).getResult().getRows();
				const resultRa = exec_ra(queryRa).getResult().getRows();

				assert.deepEqual(resultRa, resultTrc);
			});

			QUnit.test('test project constant', (assert) => {
				const queryTrc = '{ 1->c | R(r) }';
				const queryRa = 'pi 1->c (R)';

				const resultTrc = exec_trc(queryTrc).getResult().getRows();
				const resultRa = exec_ra(queryRa).getResult().getRows();

				assert.deepEqual(resultRa, resultTrc);
			});
		});

		QUnit.module('Multiple tuple variables', () => {
			QUnit.test('test project all columns', (assert) => {
				const queryTrc = '{ t, p | R(t) and S(p) }';
				const queryRa = 'ρ t R ⨯ ρ p S'

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc, resultRa);
			});

			QUnit.test('test project all columns (asterik v1)', (assert) => {
				const queryTrc = '{ t.*, p | R(t) and S(p) }';
				const queryRa = 'ρ t R ⨯ ρ p S'

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc, resultRa);
			});

			QUnit.test('test project all columns (asterik v2)', (assert) => {
				const queryTrc = '{ t, p.* | R(t) and S(p) }';
				const queryRa = 'ρ t R ⨯ ρ p S'

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc, resultRa);
			});

			QUnit.test('test project all columns (asterik v3)', (assert) => {
				const queryTrc = '{ t.*, p.* | R(t) and S(p) }';
				const queryRa = 'ρ t R ⨯ ρ p S'

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc, resultRa);
			});

			QUnit.test('test project some columns', (assert) => {
				const queryTrc = '{ t.a, t.c, p.b, p.d | R(t) and S(p) }';
				const queryRa = 'π t.a, t.c, p.b, p.d ( ρ t R ⨯ ρ p S )';

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultRa, resultTrc);
			});

			QUnit.test('test project some columns based on position', (assert) => {
				const queryTrc = '{ t.[1], t.[3], p.b, p.d | R(t) and S(p) }';
				const queryRa = 'π t.a, t.c, p.b, p.d ( ρ t R ⨯ ρ p S )';

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultRa, resultTrc);
			});
			
			QUnit.test('test tuple variable renaming', (assert) => {
				const queryTrc = '{ r.a->x, r.b->y, p.d->z | R(r) and S(p) }';
				const queryRa = 'π r.x, r.y, p.z ρ x←r.a, y←r.b, z←p.d ( ρ r R ⨯ ρ p S )';

				const resultTrc = exec_trc(queryTrc).getResult().getRows();
				const resultRa = exec_ra(queryRa).getResult().getRows();

				assert.deepEqual(resultRa, resultTrc);
			});

			QUnit.test('test mixed projection approaches', (assert) => {
				const queryTrc = '{ t.a->z, p.b, k | R(t) and S(p) and T(k) }';
				const queryRa = 'π t.a→z, p.b, k.b, k.d ( ( ρ t R ⨯ ρ p S ) ⨯ ρ k T )';

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultRa, resultTrc);
			});
		});
	});

	QUnit.module('Formulae ordering', () => {
		QUnit.test('relation predicate in the first position', (assert) => {
			const queryTrc = "{ r | R(r) and abs(r.a) > 0 }";
			const queryRa = "sigma abs(a)>0 (R)";

			const resultTrc = exec_trc(queryTrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.test('relation predicate in the last position', (assert) => {
			const queryTrc = "{ r | abs(r.a) > 0 and R(r) }";
			const queryRa = "sigma abs(a)>0 (R)";

			const resultTrc = exec_trc(queryTrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});
	});

	QUnit.module('Logical implication', () => {
		QUnit.test('given logical implication, it should return tuples that match the condition', (assert) => {
			const queryTrc = "{ r | R(r) and r.a > 5 ⇒ r.b = 'e' }";
			// NOTE: p → q ≡ ¬p ∨ q
			const queryRa = "sigma (a <= 5 or b = 'e') (R)";

			const resultTrc = exec_trc(queryTrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given logical implication with false rigth arm, it should return tuples that match the condition', (assert) => {
			const queryTrc = "{ r | R(r) and r.a > 0 ⇒ r.b = 'e' }";
			// NOTE: p → q ≡ ¬p ∨ q
			const queryRa = "sigma (a <= 0 or b = 'e') (R)";

			const resultTrc = exec_trc(queryTrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given logical implication, it should not return tuples that match the condition', (assert) => {
				const queryTrc = "{ r | R(r) and not (r.a > 5 ⇒ r.b = 'a') }";
				// NOTE: ¬(A → B) ≡ A ∧ ¬B
				const queryRa = "sigma (a > 5 and b != 'a') (R)";

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('Logical biconditional (equivalence)', () => {
		QUnit.test('given logical biconditional, it should return tuples that match the condition', (assert) => {
			const queryTrc = "{ r | r in R and r.a > 6 ⇔ r.b = 'f' }";
			// NOTE: p ⇔ q = (p ∧ q) ∨ (¬p ∧ ¬q)
			const queryRa = "sigma ((a > 6) ∧ (b = 'f')) ∨ (¬(a > 6) ∧ ¬(b = 'f')) R";

			const resultTrc = exec_trc(queryTrc).getResult()
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given logical biconditional, it should not return tuples that match the condition', (assert) => {
				const queryTrc = "{ r | r in R and not (r.a > 3 ⇔ r.b = 'e') }";
				// NOTE: ¬(p ⇔ q) = (¬p ∨ ¬q) ∧ (p ∨ q)
				const queryRa = "sigma (¬(a > 3) ∨ ¬(b = 'e') ) ∧ ((a > 3) ∨ (b = 'e')) R";

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('Predicates', () => {
		QUnit.module('Conjunction', () => {
			QUnit.test('given predicate with conjunction, when all the conditions meet, should return tuples', (assert) => {
				const queryTrc = '{ t | R(t) and (t.a < 5 and t.a > 3) }';
				const queryRa = 'sigma a < 5 and a > 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.module('Negation', () => {
				QUnit.test('given predicate with conjunction, when all the conditions meet, should not return tuples', (assert) => {
					const queryTrc = '{ t | R(t) and not (t.a < 5 and t.a > 3) }';
					const queryRa = 'sigma a >= 5 or a <= 3 (R)';

					const resultTrc = exec_trc(queryTrc).getResult().getRows().sort()
					const resultRa = exec_ra(queryRa).getResult().getRows().sort()

					assert.deepEqual(resultTrc, resultRa);
				});
			});
		});

		QUnit.module('Disjunction', () => {
			QUnit.test('given predicate with disjunction, when at least one the conditions meet, should return tuples', (assert) => {
				const queryTrc = '{ t | R(t) and (t.a < 3 or t.a < 5) }';
				const queryRa = 'sigma a < 3 or a < 5 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('given predicate with variable reference or false predicate, should return all tuples', (assert) => {
				const queryTrc = '{ t | R(t) ∨ t.a < 0 }';

				const resultTrc = exec_trc(queryTrc).getResult().getRows()

				assert.deepEqual(resultTrc, srcTableR.getResult().getRows());
			});

			QUnit.module('Negation', () => {
				QUnit.test('given predicate with disjunction, when at least one of the conditions meet, should not return tuples', (assert) => {
					const queryTrc = '{ t | R(t) and not (t.a < 3 or t.a < 5) }';
					const queryRa = 'sigma a >= 3 and a >= 5 (R)';

					const resultTrc = exec_trc(queryTrc).getResult()
					const resultRa = exec_ra(queryRa).getResult();

					assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
				});
			});
		});

		QUnit.module('Exclusive disjunction', () => {
			QUnit.test('given predicate with exclusive disjunction, when one and only one of the conditions is true, should return tuples', (assert) => {
				const queryTrc = '{ t | R(t) and (t.a < 3 xor t.a >= 3) }';
				// NOTE: p ⊻ q = (p ∨ q) ∧ (¬p ∨ ¬q)
				const queryRa = 'sigma (a < 3 or a >= 3) and (!(a < 3) or !(a >= 3)) (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.module('Negation', () => {
				QUnit.test('given predicate with exclusive disjunction, when one and only one of the conditions is true, should return tuples', (assert) => {
					const queryTrc = '{ t | R(t) and !(t.a < 3 xor t.a >= 3) }';
					const queryRa = 'sigma (!(a < 3) and !(a >= 3)) or (a < 3 and a >= 3) (R)';

					const resultTrc = exec_trc(queryTrc).getResult().getRows().sort()
					const resultRa = exec_ra(queryRa).getResult().getRows().sort()

					assert.deepEqual(resultTrc, resultRa);
				});
			});
		});

		QUnit.module('Negation', () => {
			QUnit.test('test > predicate', (assert) => {
				const queryTrc = '{ t | R(t) and not(t.a > 3) }';
				const queryRa = 'sigma a <= 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test < predicate', (assert) => {
				const queryTrc = '{ t | R(t) and not(t.a < 3) }';
				const queryRa = 'sigma a >= 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test = predicate', (assert) => {
				const queryTrc = '{ t | R(t) and not(t.a = 3) }';
				const queryRa = 'sigma a != 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test <= predicate', (assert) => {
				const queryTrc = '{ t | R(t) and not(t.a <= 3) }';
				const queryRa = 'sigma a > 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test >= predicate', (assert) => {
				const queryTrc = '{ t | R(t) and not(t.a >= 3) }';
				const queryRa = 'sigma a < 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test != predicate', (assert) => {
				const queryTrc = '{ t | R(t) and not(t.a != 3) }';
				const queryRa = 'sigma a = 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		})

		QUnit.module('Comparison', () => {
			QUnit.test('test > predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a > 3 }';
				const queryRa = 'sigma a > 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('negation test > predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a > 3 }';
				const queryRa = 'sigma a > 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test < predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a < 3 }';
				const queryRa = 'sigma a < 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test = predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a = 3 }';
				const queryRa = 'sigma a = 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test <= predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a <= 3 }';
				const queryRa = 'sigma a <= 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test >= predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a >= 3 }';
				const queryRa = 'sigma a >= 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test != predicate', (assert) => {
				const queryTrc = '{ t | R(t) and t.a != 3 }';
				const queryRa = 'sigma a != 3 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test between predicate with numbers', (assert) => {
				const queryTrc = '{ t | R(t) and t.a between 3 and 5 }';
				const queryRa = 'sigma a >= 3 and a <= 5 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test negation between predicate with numbers', (assert) => {
				const queryTrc = '{ t | R(t) and not (t.a between 3 and 5) }';
				const queryRa = 'sigma a < 3 or a > 5 (R)';

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test between predicate with strings', (assert) => {
				const queryTrc = "{ t | R(t) and t.b between 'b' and 'e' }";
				const queryRa = "sigma b >= 'b' and b <= 'e' (R)";

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('test negation between predicate with strings', (assert) => {
				const queryTrc = "{ t | R(t) and not (t.b between 'b' and 'e') }";
				const queryRa = "sigma b < 'b' or b > 'e' (R)";

				const resultTrc = exec_trc(queryTrc).getResult()
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		})
	});

	QUnit.module('existencial quantifier operator(∃)', () => {
		QUnit.test('given ∃ operator with no tuple variable refence and at least one true condition, should return all tuples', (assert) => {
			const queryTrc = '{ t | R(t) and ∃s(S(s) and s.d > 300) }';

			const resultTrc = exec_trc(queryTrc).getResult()
			const resultRa = srcTableR.getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∃ operator with no tuple variable reference and false condition, should return no tuples', (assert) => {
			const queryTrc = '{ t | R(t) and ∃s(S(s) and s.d > 1000) }';

			const resultTrc = exec_trc(queryTrc).getResult();

			assert.equal(resultTrc.getNumRows(), 0);
		});

		QUnit.test('given ∃ operator with tuple variable reference and true condition, should return tuples that match the condition', (assert) => {
			const queryTrc = '{ t | R(t) and ∃s(S(s) and s.b = t.b) }';
			const queryRa = 'pi R.a, R.b, R.c (R join R.b = S.b S)'

			const resultTrc = exec_trc(queryTrc).getResult();
			const resultRa = exec_ra(queryRa).getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given ¬∃ with no tuple variable refence and at least one exists true condition, should return no tuples', (assert) => {
				const queryTrc = '{ t | R(t) and not ∃s(S(s) and s.d > 300) }';

				const resultTrc = exec_trc(queryTrc).getResult()

				assert.equal(resultTrc.getNumRows(), 0);
			});

			QUnit.test('given ¬∃ with no tuple variable reference and exists false condition, should return all tuples', (assert) => {
				const queryTrc = '{ t | R(t) and not ∃s(S(s) and s.d > 1000) }';

				const resultTrc = exec_trc(queryTrc).getResult();

				assert.deepEqual(resultTrc.getRows(), srcTableR.getResult().getRows());
			});

			QUnit.test('given ¬∃ with tuple variable reference and, return tuples that do not match the condition', (assert) => {
				const queryTrc = '{ t | R(t) and not ∃s(S(s) and (s.d < 200 and t.a < 3)) }';
				const queryRa = 'sigma R.a >= 3 (R)'

				const resultTrc = exec_trc(queryTrc).getResult();
				const resultRa = exec_ra(queryRa).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});
		});
	});

	QUnit.module('universal quantifier operator(∀)', () => {
		QUnit.test('given ∀ operator with relation predicate, should return all tuples', (assert) => {
			const queryTrc = '{ t | R(t) and ∀s (S(s)) }';

			const resultTrc = exec_trc(queryTrc).getResult();
			const resultRa = srcTableR.getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∀ operator with no tuple variable reference and true condition for some elements but not all, should return no tuples', (assert) => {
			const queryTrc = '{ t | R(t) and ∀s(S(s) and s.d > 300) }';

			const resultTrc = exec_trc(queryTrc).getResult();

			assert.equal(resultTrc.getNumRows(), 0);
		});

		QUnit.test('given ∀ operator with no tuple variable reference and true condition for all elements, should return all tuples', (assert) => {
			const queryTrc = '{ t | R(t) and ∀s(S(s) and s.d > 50) }';

			const resultTrc = exec_trc(queryTrc).getResult();
			const resultRa = srcTableR.getResult();

			assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
		});

		QUnit.test('given ∀ operator with tuple variable reference should return tuples that match the condition', (assert) => {
			const queryTrc1 = '{ r | R(r) and ∀s(S(s) ⇒ s.d < r.a) }';
			const queryTrc2 = '{ r | R(r) and ∀s(S(s) ⇒ s.d > r.a) }';

			const expectedResult1 = exec_ra('sigma a = 1000 (R)').getResult()
			const expectedResult2 = exec_ra('sigma a < 1000 (R)').getResult()

			const resultTrc1 = exec_trc(queryTrc1).getResult();
			const resultTrc2 = exec_trc(queryTrc2).getResult();

			assert.deepEqual(resultTrc1.getRows(), expectedResult1.getRows());
			assert.deepEqual(resultTrc2.getRows(), expectedResult2.getRows());
		});

		QUnit.module('Negation', () => {
			QUnit.test('given ∀ operator with no tuple variable reference and true condition for some elements but not all, should return all tuples', (assert) => {
				const queryTrc = '{ t | R(t) and not ∀s(S(s) and s.d > 300) }';

				const resultRa = srcTableR.getResult();
				const resultTrc = exec_trc(queryTrc).getResult();

				assert.deepEqual(resultTrc.getRows(), resultRa.getRows());
			});

			QUnit.test('given ∀ operator with no tuple variable reference and true condition for all elements, should return no tuples', (assert) => {
				const queryTrc = '{ t | R(t) and not ∀s(S(s) and s.d > 50) }';

				const resultTrc = exec_trc(queryTrc).getResult();

				assert.equal(resultTrc.getNumRows(), 0);
			});

			QUnit.test('given ∀ operator with tuple variable reference should return tuples that do not match the condition', (assert) => {
				const queryTrc1 = '{ r | R(r) and not ∀s(S(s) ⇒ s.d < r.a) }';
				const queryTrc2 = '{ r | R(r) and not ∀s(S(s) ⇒ s.d > r.a) }';

				const expectedResult1 = exec_ra('sigma a != 1000 (R)').getResult()
				const expectedResult2 = exec_ra('sigma a >= 1000 (R)').getResult()

				const resultTrc1 = exec_trc(queryTrc1).getResult();
				const resultTrc2 = exec_trc(queryTrc2).getResult();

				assert.deepEqual(resultTrc1.getRows(), expectedResult1.getRows());
				assert.deepEqual(resultTrc2.getRows(), expectedResult2.getRows());
			});
		});
	});
});