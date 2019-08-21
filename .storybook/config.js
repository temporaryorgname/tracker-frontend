import { configure, addParameters } from '@storybook/react';
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';

function loadStories() {
  const req = require.context('../src/stories', true, /\.js$/);
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);

addParameters({ viewport: { viewports: INITIAL_VIEWPORTS } });
