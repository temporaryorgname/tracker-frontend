import React from 'react';
import { MemoryRouter } from 'react-router';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import { NavigationBar } from '../App.js';
import '../index.scss'

storiesOf('Organisms|NavigationBar/Mobile', module)
  //.addDecorator(StoryRouter({},{
  //  initialEntries: ["/food"],
  //  initialIndex: 0
  //}))
  .addDecorator(story => (
    <MemoryRouter initialEntries={['/food']} initialIndex={0}>
      {story()}
    </MemoryRouter>
  ))
  .addParameters({ viewport: { defaultViewport: 'iphone6' }})
  .add('LoggedOut', () => <div>
      <NavigationBar />
    </div>)
  .add('LoggedIn', () => <div>
      <NavigationBar loggedIn='true' />
    </div>);

storiesOf('Organisms|NavigationBar/Desktop', module)
  .addDecorator(StoryRouter())
  .add('LoggedOut', () => <div>
      <NavigationBar />
    </div>)
  .add('LoggedIn', () => <div>
      <NavigationBar loggedIn='true' />
    </div>);
