import React from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';

import { 
  getLoadingStatus,
  updateLoadingStatus,
  formatString,
  extractPlaceholders,
  splitDict,
  dictEqual,
  computeDietEntryTotal,
  fillEntry,
	clipFloat
} from '../Utils.js';

//////////////////////////////////////////////////
// updateLoadingStatus
// getLoadingStatus
//////////////////////////////////////////////////

test('updateLoadingStatus empty tree', () => {
  let tree = updateLoadingStatus(null, {a: 0}, 'loading');
});

test('updateLoadingStatus no filters', () => {
  let tree = updateLoadingStatus(null, {}, 'loading');
  let status = null;

  status = getLoadingStatus(tree, {});
  expect(status).toEqual('loading');

  status = getLoadingStatus(tree, {a: 0});
  expect(status).toEqual('loading');

  status = getLoadingStatus(tree, {a: 1});
  expect(status).toEqual('loading');

  status = getLoadingStatus(tree, {b: 0});
  expect(status).toEqual('loading');
});

test('getLoadingStatus one item', () => {
  let tree = updateLoadingStatus(null, {a: 0}, 'loading');
  let status = null;

  status = getLoadingStatus(tree, {a: 0});
  expect(status).toEqual('loading');

  status = getLoadingStatus(tree, {a: 1});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 0});
  expect(status).toEqual(null);
});

test('getLoadingStatus one key multiple values', () => {
  let tree = null;
  tree = updateLoadingStatus(tree, {a: 1}, 'status1');
  tree = updateLoadingStatus(tree, {a: 2}, 'status2');
  let status = null;

  status = getLoadingStatus(tree, {a: 1});
  expect(status).toEqual('status1');

  status = getLoadingStatus(tree, {a: 2});
  expect(status).toEqual('status2');

  status = getLoadingStatus(tree, {a: 3});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 1});
  expect(status).toEqual(null);
});

test('getLoadingStatus multiple keys', () => {
  let tree = null;
  tree = updateLoadingStatus(tree, {a: 0}, 'status a');
  tree = updateLoadingStatus(tree, {b: 0}, 'status b');
  let status = null;

  status = getLoadingStatus(tree, {a: 0});
  expect(status).toEqual('status a');

  status = getLoadingStatus(tree, {b: 0});
  expect(status).toEqual('status b');

  status = getLoadingStatus(tree, {a: 1});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 1});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {c: 0});
  expect(status).toEqual(null);
});

test('getLoadingStatus partial match', () => {
  let tree = null;
  tree = updateLoadingStatus(tree, {a: 0}, 'status a');
  let status = null;

  status = getLoadingStatus(tree, {a: 0, b: 0});
  expect(status).toEqual('status a');

  status = getLoadingStatus(tree, {a: 1, b: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {c: 0, b: 0});
  expect(status).toEqual(null);
});

test('getLoadingStatus partial match with multiple keys', () => {
  let tree = null;
  tree = updateLoadingStatus(tree, {a: 0}, 'status a');
  tree = updateLoadingStatus(tree, {b: 1}, 'status b');
  let status = null;

  status = getLoadingStatus(tree, {a: 0, b: 1});
  expect(status).not.toEqual(null);

  status = getLoadingStatus(tree, {a: 0, b: 0});
  expect(status).toEqual('status a');

  status = getLoadingStatus(tree, {a: 1, b: 1});
  expect(status).toEqual('status b');

  status = getLoadingStatus(tree, {a: 1, b: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {c: 0, b: 0});
  expect(status).toEqual(null);
});

test('getLoadingStatus partial match with multikeys filters', () => {
  let tree = null;
  tree = updateLoadingStatus(tree, {a: 0, b: 1}, 'status');
  let status = null;

  status = getLoadingStatus(tree, {a: 0, b: 1});
  expect(status).toEqual('status');

  status = getLoadingStatus(tree, {a: 0, b: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {a: 1, b: 1});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {a: 1, b: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {a: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 1});
  expect(status).toEqual(null);

  tree = updateLoadingStatus(tree, {b: 1}, 'status');

  status = getLoadingStatus(tree, {a: 0, b: 1});
  expect(status).toEqual('status');

  status = getLoadingStatus(tree, {a: 0, b: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {a: 1, b: 1});
  expect(status).toEqual('status');

  status = getLoadingStatus(tree, {a: 1, b: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {a: 0});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 1});
  expect(status).toEqual('status');
});

test('getLoadingStatus one item (object)', () => {
  let tree = updateLoadingStatus(null, {a: 0}, {status: 'status'});
  let status = null;

  status = getLoadingStatus(tree, {a: 0});
  expect(status).not.toEqual(null);
  expect(typeof status).toEqual('object');
  expect(status.status).toEqual('status');

  status = getLoadingStatus(tree, {a: 1});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 0});
  expect(status).toEqual(null);

  tree = updateLoadingStatus(tree, {a: 0}, {status: 'status2'});
  status = getLoadingStatus(tree, {a: 0});
  expect(status).not.toEqual(null);
  expect(typeof status).toEqual('object');
  expect(status.status).toEqual('status2');

  status = getLoadingStatus(tree, {a: 1});
  expect(status).toEqual(null);

  status = getLoadingStatus(tree, {b: 0});
  expect(status).toEqual(null);
});

//////////////////////////////////////////////////
// formatString
//////////////////////////////////////////////////

test('formatString no input', () => {
  let input = 'This is a string';
  let output = formatString(input, {});
  expect(output).toEqual(input);

  input = '';
  output = formatString(input, {});
  expect(output).toEqual(input);
});

test('formatString one value', () => {
  let input = 'This {verb} a string';

  let output = formatString(input, {verb: 'is'});
  expect(output).toEqual('This is a string');

  output = formatString(input, {verb: 'is', adjective: 'red'});
  expect(output).toEqual('This is a string');

  output = formatString(input, {});
  expect(output).toEqual('This {verb} a string');
});

test('formatString two values', () => {
  let input = 'This {verb} a {noun}';

  let output = formatString(input, {verb: 'is'});
  expect(output).toEqual('This is a {noun}');

  output = formatString(input, {verb: 'is', adjective: 'red'});
  expect(output).toEqual('This is a {noun}');

  output = formatString(input, {verb: 'is', noun: 'string'});
  expect(output).toEqual('This is a string');
});

//////////////////////////////////////////////////
// clipFloat
//////////////////////////////////////////////////

test('formatString two values', () => {
  let output = clipFloat(1.2345, 2);
  expect(output).toEqual('1.23');

  output = clipFloat(1.2345, 1);
  expect(output).toEqual('1.2');

  output = clipFloat(1.2345, 0);
  expect(output).toEqual('1');
});

//////////////////////////////////////////////////
// extractPlaceholders
//////////////////////////////////////////////////

test('extractPlaceholders no input', () => {
  let input = '';
  let output = extractPlaceholders(input);
  expect(output.size).toEqual(0);
});

test('extractPlaceholders no placeholders', () => {
  let input = 'asdf asdf asdf';
  let output = extractPlaceholders(input);
  expect(output.size).toEqual(0);

  input = '{}';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(0);

  input = 'asdf asdf {} asdf';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(0);

  input = 'asdf asdf {} asdf {}';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(0);
});

test('extractPlaceholders 1 placeholder', () => {
  let input = '{asdf}';
  let output = extractPlaceholders(input);
  expect(output.size).toEqual(1);
  expect(output.has('asdf')).toBeTruthy();

  input = '{asdf} asdf asdf';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(1);
  expect(output.has('asdf')).toBeTruthy();

  input = 'asf {asdf} asdf';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(1);
  expect(output.has('asdf')).toBeTruthy();

  input = 'asf asdf {asdf}';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(1);
  expect(output.has('asdf')).toBeTruthy();

  input = 'asf {asdf} {asdf}';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(1);
  expect(output.has('asdf')).toBeTruthy();
});

test('extractPlaceholders 2 placeholders', () => {
  let input = '{asdf}{qwer}';
  let output = extractPlaceholders(input);
  expect(output.size).toEqual(2);
  expect(output.has('asdf')).toBeTruthy();
  expect(output.has('qwer')).toBeTruthy();

  input = '{asdf} asdf {qwer}';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(2);
  expect(output.has('asdf')).toBeTruthy();
  expect(output.has('qwer')).toBeTruthy();

  input = 'asf {asdf} {qwer} asdf';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(2);
  expect(output.has('asdf')).toBeTruthy();
  expect(output.has('qwer')).toBeTruthy();

  input = '{qwer}{qwer}{asdf}asf {} asdf {asdf}';
  output = extractPlaceholders(input);
  expect(output.size).toEqual(2);
  expect(output.has('asdf')).toBeTruthy();
  expect(output.has('qwer')).toBeTruthy();
});

//////////////////////////////////////////////////
// splitDict
//////////////////////////////////////////////////

test('splitDict empty input', () => {
  let input = {};
  let output = splitDict(input, []);
  expect(output[0]).toEqual({});
  expect(output[1]).toEqual({});
});

test('splitDict', () => {
  let output = null;

  output = splitDict({a: 0, b: 0}, ['a']);
  expect(output[0]).toEqual({a: 0});
  expect(output[1]).toEqual({b: 0});

  output = splitDict({a: 0}, ['a']);
  expect(output[0]).toEqual({a: 0});
  expect(output[1]).toEqual({});

  output = splitDict({b: 0}, ['a']);
  expect(output[0]).toEqual({});
  expect(output[1]).toEqual({b: 0});

  output = splitDict({a: 0, b: 1, c: 2, d: 3}, ['a', 'd']);
  expect(output[0]).toEqual({a: 0, d: 3});
  expect(output[1]).toEqual({b: 1, c: 2});
});

//////////////////////////////////////////////////
// dictEqual
//////////////////////////////////////////////////

test('dictEqual empty dict', () => {
  let output = dictEqual({}, {});
  expect(output).toBeTruthy();
});

test('dictEqual flat', () => {
  let output = null;

  output = dictEqual({a: 1}, {a: 1});
  expect(output).toBeTruthy();

  output = dictEqual({a: 1, b: 2}, {a: 1, b: 2});
  expect(output).toBeTruthy();

  output = dictEqual({a: 1}, {a: 1, b: 2});
  expect(output).toBeFalsy();

  output = dictEqual({a: 1, b: 1}, {a: 1, b: 2});
  expect(output).toBeFalsy();
});

test('dictEqual nested', () => {
  let output = null;

  output = dictEqual({a: 1, b: {}}, {a: 1, b: {}});
  expect(output).toBeTruthy();

  output = dictEqual({a: 1, b: 2, c: {d: 3, e: 4}}, {a: 1, b: 2, c: {d: 3, e: 4}});
  expect(output).toBeTruthy();

  output = dictEqual({a: 1, b: 2, c: {d: 3}}, {a: 1, b: 2, c: {d: 3, e: 4}});
  expect(output).toBeFalsy();

  output = dictEqual({a: 1, b: 2, c: {d: 3, e: 3}}, {a: 1, b: 2, c: {d: 3, e: 4}});
  expect(output).toBeFalsy();
});

//////////////////////////////////////////////////
// computeDietEntryTotal
//////////////////////////////////////////////////

test('computeDietEntryTotal empty inputs', () => {
  let output = computeDietEntryTotal([]);
  expect(output).toEqual({});
});

test('computeDietEntryTotal shallow sum 1 val', () => {
  let output = computeDietEntryTotal([
    {a: 1}, {a: 2}
  ]);
  expect(output).toEqual({a: 3});

  output = computeDietEntryTotal([
    {a: 1}, {a: 2}, {}
  ]);
  expect(output).toEqual({a: 3});
});

test('computeDietEntryTotal shallow sum 2 vals', () => {
  let output = computeDietEntryTotal([
    {a: 1, b: 1}, {a: 2}, {b: 3}
  ]);
  expect(output).toEqual({a: 3, b: 4});
});

test('computeDietEntryTotal nested 1 val', () => {
  let output = computeDietEntryTotal([
    {a: 1}, {a: 2}, {children: [{a: 3}, {a: 4}]}
  ]);
  expect(output).toEqual({a: 10});
});

test('computeDietEntryTotal nested 2 vals', () => {
  let output = computeDietEntryTotal([
    {a: 1}, {a: 2}, {children: [{a: 3, b: 1}, {a: 4}]}
  ]);
  expect(output).toEqual({a: 10, b: 1});

  output = computeDietEntryTotal([
    {a: 1}, {a: 2}, {b:2, children: [{a: 3, b: 1}, {a: 4}]}
  ]);
  expect(output).toEqual({a: 10, b: 2});
});

//////////////////////////////////////////////////
// fillEntry
//////////////////////////////////////////////////

test('fillEntry empty dicts', () => {
  let output = fillEntry({}, {});
  expect(output).toEqual({});
});

test('fillEntry empty dest', () => {
  let output = fillEntry({}, {name: 'thing'});
  expect(output.name).toEqual('thing');

  output = fillEntry({}, {name: 'thing', quantity: '100g'});
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('100g');

  output = fillEntry({}, {name: 'thing', quantity: '100g', calories: 200});
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('100g');
  expect(output.calories).toEqual('200');
});

test('fillEntry sort of empty dest', () => {
  let output = fillEntry({name: ''}, {name: 'thing'});
  expect(output.name).toEqual('thing');

  output = fillEntry(
    {name: '', quantity: ''}, 
    {name: 'thing', quantity: '100g'}
  );
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('100g');

  output = fillEntry(
    {name: '', quantity: '', calories: ''}, 
    {name: 'thing', quantity: '100g', calories: 200}
  );
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('100g');
  expect(output.calories).toEqual('200');

  output = fillEntry(
    {name: '', quantity: '', calories: ' '}, 
    {name: 'thing', quantity: '100g', calories: 200}
  );
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('100g');
  expect(output.calories).toEqual('200');

  output = fillEntry(
    {name: '', quantity: '', calories: ' '}, 
    {name: 'thing', quantity: '100g', calories: 200}
  );
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('100g');
  expect(output.calories).toEqual('200');
});

test('fillEntry with existing data', () => {
  let output = fillEntry(
    {name: 'boop'},
    {name: 'thing'}
  );
  expect(output.name).toEqual('boop');

  output = fillEntry(
    {name: '', quantity: '200g'}, 
    {name: 'thing', quantity: '100g'}
  );
  expect(output.name).toEqual('thing');
  expect(output.quantity).toEqual('200g');

  output = fillEntry(
    {name: 'foo', quantity: '', calories: null, protein: null}, 
    {name: 'bar', quantity: '100g', calories: 200}
  );
  expect(output.name).toEqual('foo');
  expect(output.quantity).toEqual('100g');
  expect(output.calories).toEqual('200');
});

test('fillEntry with number types without error', () => {
  let output = fillEntry(
    {name: 'boop', calories: 1},
    {name: 'thing', protein: 2}
  );
});
