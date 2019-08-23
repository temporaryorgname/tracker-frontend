import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import {EntryEditorForm} from '../Diet.js';
import '../Diet.scss';
import '../index.scss';

storiesOf('Organisms|EntryEditorForm', module)
  .add('Default', () => <div>
    <EntryEditorForm />
  </div>);
