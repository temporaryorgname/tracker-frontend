import React, { useState, useEffect } from 'react';
import { Route, Link, Switch, useLocation } from "react-router-dom";

import axios from 'axios';

import { connect, shallowEqual, useSelector, useDispatch } from "react-redux";

import { 
  photoActions,
  notify
} from './actions/Actions.js';
import { 
  getLoadingStatus,
  parseQueryString,
  formatDate
} from './Utils.js';
import { FoodPhotoThumbnail, BigButton } from './Common.js';

import './Photos.scss';

export function PhotosPage(props) {
  const dispatch = useDispatch();
  const uploadPhoto = (files, progressCallback, date) => dispatch(
    photoActions['create'](files, progressCallback, date)
  );
  const location = useLocation();
  const currentUid = useSelector(state => state.session.uid);
  const loadingStatus = useSelector(state => state.loadingStatus['PHOTOS']);
  const photos = useSelector(state => state.photos.entities);

  const [uid, setUid] = useState(currentUid);
  const [date, setDate] = useState(formatDate(new Date()));

  // Query string change
  useEffect(() => {
    let queryParams = parseQueryString(location.search);
    setUid(queryParams['uid'] || currentUid);
  }, [location, currentUid]);

  const [ulProgress,setUlProgress] = useState({});
  const [ulErrors,setUlErrors] = useState([]);
  function uploadFile(file) {
    let that = this;
    // Find first available index
    let index = 0;
    while (index in ulProgress) {
      index++;
    }
    setUlProgress({
      ...ulProgress,
      [index]: 0
    });
    uploadPhoto(
      file,
      function(progress) {
        setUlProgress({
          ...ulProgress,
          [index]: progress.loaded/progress.total
        });
      },
      date
    ).then(function(response){
      //that.props.fetchPhotos(false);
      let progress = {...ulProgress};
      delete progress[index];
      setUlProgress(progress);
    }).catch(function(error){
      setUlErrors([
        ...ulErrors,
        {
          error: error.response.data,
          file: file,
          retry: function() {
            setUlErrors(ulErrors.filter(e => e.file !== file));
            uploadFile(file);
          }
        }
      ])
    });
  }

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
      <div className='main-card col-12'>
        <div className='card'>
          <h2>Upload Photo</h2>
          <label>
            <input type="file" name="file" accept="image/*" capture="camera"
                onChange={(e) => uploadFile(e.target.files)}/>
            <BigButton icon='add_a_photo' text='Upload Photo' />
          </label>
        </div>
      </div>
      <div className='card col-12'>
        {photosDom}
      </div>
    </main>
  );
}
