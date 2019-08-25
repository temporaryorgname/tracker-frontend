import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import {
  EntryEditorFormModal, EntryEditorForm, FoodTable, DietPage, DateSelector 
} from '../Diet.js';
import '../Diet.scss';
import '../index.scss';

let entries = {
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
};

storiesOf('Molecules|DateSelector', module)
  .add('Default', () => <div>
    <DateSelector onChange={action('Date Change')} />
  </div>);

storiesOf('Molecules|EntryEditorForm', module)
  .add('Empty', () => <div>
    <EntryEditorForm onChange={action('Entry Change')} />
  </div>)
  .add('Populated', () => <div>
    <EntryEditorForm onChange={action('Entry Change')} entry={entries[0]}/>
  </div>);

storiesOf('Molecules|EntryEditorFormModal', module)
  .add('Empty', () => <div>
    <EntryEditorFormModal onChange={action('Entry Change')} />
  </div>)
  .add('Populated', () => <div>
    <EntryEditorFormModal onChange={action('Entry Change')} entry={entries[0]}/>
  </div>);

storiesOf('Molecules|FoodTable', module)
  .addDecorator(StoryRouter())
  .add('Default', () => <div>
    <FoodTable entries={entries} createNewEntry={action('Create new entry')}/>
  </div>);

storiesOf('Pages|DietPage', module)
  .addDecorator(StoryRouter())
  .add('Empty', () => <div>
    <DietPage createNewEntry={action('Create New Entry')}/>
  </div>)
  .add('Populated', () => <div>
    <DietPage createNewEntry={action('Create New Entry')} entries={entries}/>
  </div>)
  .add('PopulatedSubEntry', () => <div>
    <DietPage createNewEntry={action('Create New Entry')} mainEntry={entries[0]} entries={entries[0].children}/>
  </div>);
