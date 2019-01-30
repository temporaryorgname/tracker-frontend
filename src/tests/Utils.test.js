import React from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';

import { 
  getLoadingStatus,
  updateLoadingStatus,
} from '../Utils.js';

test('updateLoadingStatus empty tree', () => {
  let tree = updateLoadingStatus(null, {a: 0}, 'loading');
});

test('updateLoadingStatus no filters', () => {
  let tree = updateLoadingStatus(null, {}, 'loading');
  let status = null;

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
