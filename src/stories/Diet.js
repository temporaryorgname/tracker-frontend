import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import '../index.scss'

storiesOf('Atoms|button', module)
  .add('All buttons', () => <div>
      <button>Button</button>
      <input type='button' value='Input Button'/>
      <input type='submit' value='Submit' />
    </div>);

storiesOf('Atoms|input', module)
  .add('All inputs', () => <div>
      <input type='text' value='Text Input' />
      <input type='password' value='Password' />
      <input type='search' value='Search' />
      <input type='email' value='Email@valid.com' />
      <input type='email' value='Invalid Email' />
      <input type='date'/>
      <input type='time'/>
      <input type='number'/>
      <input type='checkbox'/>
      <input type='radio' name='r' value='Value 1'/>
      <input type='radio' name='r' value='Value 2'/>
      <input type='range'/>
      <select>
        <option value='Value 1'>Value 1</option>
        <option value='Value 2'>Value 2</option>
      </select>
    </div>);
