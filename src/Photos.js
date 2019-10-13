import React, { Component, useState, useEffect, Fragment } from 'react';
import { Route, Link, Switch } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { connect, shallowEqual, useSelector, useDispatch } from "react-redux";

import { 
  photoActions,
  notify
} from './actions/Actions.js';
import { 
  getLoadingStatus,
  parseQueryString
} from './Utils.js';
import { FoodPhotoThumbnail } from './Common.js';

//import './Photo.scss';

export function PhotosPage(props) {
  const dispatch = useDispatch();
  const queryParams = parseQueryString(props.location.search);

  const uid = useSelector(state => queryParams['uid'] || state.session.uid);
  const loadingStatus = useSelector(
    state => state.loadingStatus['PHOTOS']
  );
  const photos = useSelector(state => state.photos.entities);
  if (!getLoadingStatus(loadingStatus, {user_id: uid})) {
    dispatch(photoActions['fetchMultiple']({user_id: uid}));
  }
  let photosByDate = {};
  Object.values(photos).forEach(photo => {
    if (!photosByDate[photo.date]) {
      photosByDate[photo.date] = [];
    }
    photosByDate[photo.date].push(photo);
  });
  let sortedDates = Object.keys(photosByDate).sort().reverse();
  let photosDom = [];
  sortedDates.forEach(d => {
    photosDom.push(<h3 key={d}>{d}</h3>);
    photosByDate[d].forEach(photo => {
      photosDom.push(
        <FoodPhotoThumbnail photoId={photo.id}
            selected={false}
            key={photo.id}/>
      );
    });
  });
  return (
    <main className='photo-page-container'>
      {photosDom}
    </main>
  );
}
