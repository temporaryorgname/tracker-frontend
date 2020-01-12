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

export function usePhotoUploader(date,food_id=null) {
  const dispatch = useDispatch();
  const uploadPhoto = (files, progressCallback, date) => dispatch(
    photoActions['create'](files, progressCallback, date)
  );
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
      {date: date || null, food_id: food_id || null}
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
  return [
    ulProgress,
    ulErrors,
    (e)=>uploadFile(e.target.files)
  ]
}

export function usePhotos(uid) {
  const dispatch = useDispatch();
  const loadingStatus = useSelector(state => state.loadingStatus['PHOTOS']);
  const photos = useSelector(state => state.photos.entities);
  const [photosByDate, setPhotosByDate] = useState({});

  useEffect(() => {
    if (!getLoadingStatus(loadingStatus, {user_id: uid})) {
      dispatch(photoActions['fetchMultiple']({user_id: uid}));
    }
  }, [uid]);
  useEffect(() => {
    let byDate = {};
    Object.values(photos).forEach(photo => {
      if (!byDate[photo.date]) {
        byDate[photo.date] = [];
      }
      byDate[photo.date].push(photo);
    });
    setPhotosByDate(byDate);
  }, [photos]);
  return photosByDate;
}

export function PhotosPage(props) {
  const location = useLocation();
  const currentUid = useSelector(state => state.session.uid);

  const [uid, setUid] = useState(currentUid);
  const [date, setDate] = useState(formatDate(new Date()));

  // Query string change
  useEffect(() => {
    let queryParams = parseQueryString(location.search);
    setUid(queryParams['uid'] || currentUid);
  }, [location, currentUid]);

  const [
    ulProgress,
    ulErrors,
    uploadCallback
  ] = usePhotoUploader(date);

  return (
    <main className='photo-page-container'>
      <div className='main-card col-12'>
        <div className='card'>
          <h2>Upload Photo</h2>
          <label>
            <input type="file" name="file" accept="image/*" capture="camera"
                onChange={uploadCallback}/>
            <BigButton icon='add_a_photo' text='Upload Photo' />
          </label>
        </div>
      </div>
      <div className='card col-12'>
        <Gallery uid={uid} />
      </div>
    </main>
  );
}

function Gallery(props) {
  const {
    uid
  } = props;
  const photosByDate = usePhotos(uid);
  const [maxPhotos,setMaxPhotos] = useState(10);

  let sortedDates = Object.keys(photosByDate).sort().reverse();
  let photosDom = [];
  let count = 0;
  for (let d of sortedDates) {
    if (isNaN(new Date(d))) continue; // Check if date is valid
    //photosDom.push(<h3 key={d}>{d}</h3>);
    photosByDate[d].forEach(photo => {
      photosDom.push(
        <FoodPhotoThumbnail photoId={photo.id}
            selected={false}
            key={photo.id}/>
      );
    });
    count += photosByDate[d].length;
    if (count > maxPhotos) {
      break;
    }
  }
  return (<>
    {photosDom}
    <div>
      <button onClick={()=>setMaxPhotos(maxPhotos+10)}>Show More</button>
    </div>
  </>);
}
