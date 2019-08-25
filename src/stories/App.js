import React from 'react';
import { MemoryRouter } from 'react-router';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import { NavigationBar } from '../App.js';
import '../index.scss'

storiesOf('Molecules|NavigationBar/Mobile', module)
  .addDecorator(story => (
    <MemoryRouter initialEntries={['/food']} initialIndex={0}>
      {story()}
    </MemoryRouter>
  ))
  .addParameters({ viewport: { defaultViewport: 'iphone6' }})
  .add('LoggedOut', () => <div>
      <NavigationBar title='Log In' />
    </div>)
  .add('LoggedIn', () => <div>
      <NavigationBar loggedIn='true' title='Diet Log' />
    </div>);

storiesOf('Molecules|NavigationBar/Desktop', module)
  .addDecorator(StoryRouter())
  .add('LoggedOut', () => <div>
      <NavigationBar />
    </div>)
  .add('LoggedIn', () => <div>
      <NavigationBar loggedIn='true' />
    </div>);
