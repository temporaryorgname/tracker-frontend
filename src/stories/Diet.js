import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import { EntryEditorForm, FoodTable } from '../Diet.js';
import '../Diet.scss';
import '../index.scss';

storiesOf('Organisms|EntryEditorForm', module)
  .add('Default', () => <div>
    <EntryEditorForm onChange={action('Entry Change')} />
  </div>);

storiesOf('Organisms|FoodTable', module)
  .addDecorator(StoryRouter())
  .add('Default', () => <div>
    <FoodTable entries={{
      0: {
        name: 'Breakfast',
        calories: 440,
        protein: 21,
        children: {
          1: {}, 2: {}
        }
      },
      3: {
        name: 'Lunch',
        calories: 600,
        protein: 31,
      },
      4: {
        name: 'Dinner',
        calories: 700,
        protein: 30,
        children: {
          5: {}, 6: {}, 7: {}
        }
      }
    }} createNewEntry={action('Create new entry')}/>
  </div>);

