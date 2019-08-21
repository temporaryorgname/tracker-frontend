import React from 'react';

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import StoryRouter from 'storybook-react-router';

import { BigButton, Accordion } from '../Common.js';
import '../Common.scss';
import '../index.scss'

let lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla venenatis metus id condimentum vestibulum. Vivamus semper lacus in augue feugiat ullamcorper. Vestibulum consectetur enim sit amet erat scelerisque porttitor sit amet non neque. Nulla vitae nunc lacinia, consectetur velit ac, gravida neque. Etiam consequat mi lorem, non aliquam ex pulvinar vel. Sed magna mauris, consectetur nec ante a, suscipit tempus arcu. Nunc cursus fermentum nibh ut dapibus. Aenean ac elit vitae sapien hendrerit blandit. Suspendisse libero magna, mattis sit amet tincidunt id, mattis et velit.';

storiesOf('Molecules|BigButton', module)
  .addDecorator(StoryRouter())
  .add('Default', () => <BigButton icon='fastfood' text='Diet'/>);

storiesOf('Molecules|Accordion', module)
  .add('AllStates', () => <div>
    <Accordion heading='Collapsed Accordion' collapsed={true}>{lorem}</Accordion>
    <Accordion heading='Expanded Accordion' collapsed={false}>{lorem}</Accordion>
  </div>)
  .add('Default', () => <div>
    <Accordion heading='Heading goes here'>{lorem}</Accordion>
    <Accordion heading='Heading goes here'>{lorem}</Accordion>
  </div>);
