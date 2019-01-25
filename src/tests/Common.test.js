import React from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';

import { Checkbox } from '../Common.js';

test('Checkbox renders without crashing', () => {
  const component = renderer.create(
    <Checkbox />
  );
});

