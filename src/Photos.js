import React, { useState, useEffect } from 'react';
import {
  Route, Link, Switch, useLocation, useHistory
} from "react-router-dom";

import axios from 'axios';

import { connect, shallowEqual, useSelector, useDispatch } from "react-redux";

import { 
  photoActions,
  foodActions,
  notify
} from './actions/Actions.js';
import { 
  getLoadingStatus,
  parseQueryString,
  formatDate
} from './Utils.js';
import { FoodPhotoThumbnail, BigButton } from './Common.js';
import { EntryEditorForm } from './Diet.js';

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
    <main className='photos-page-container'>
      <div className='main-card col-12'>
        <div className='card'>
          <h2>Upload Photo</h2>
          {
            ulErrors.map(error => {
              return (<div class='error-message'>
                {error.error}
                <span onClick={error.retry}>Retry</span>
              </div>);
            })
          }
          <label>
            <input type="file" name="file" accept="image/*" capture="camera"
                onChange={uploadCallback}/>
            <BigButton icon='add_a_photo' text='Upload Photo' />
          </label>
          {
            Object.values(ulProgress).map(progress => {
              return (<div class='progress'>
                Uploading: {progress*100}
              </div>);
            })
          }
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
  const history = useHistory();
  const photosByDate = usePhotos(uid);
  const [maxPhotos,setMaxPhotos] = useState(10);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  function toggleSelectPhoto(id) {
    let selected = new Set(selectedPhotos);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    setSelectedPhotos(selected);
  }

  let sortedDates = Object.keys(photosByDate).sort().reverse();
  let photosDom = [];
  let count = 0;
  for (let d of sortedDates) {
    if (isNaN(new Date(d))) continue; // Check if date is valid
    //photosDom.push(<h3 key={d}>{d}</h3>);
    photosByDate[d].forEach(photo => {
      photosDom.push(
        <FoodPhotoThumbnail photoId={photo.id}
            selected={selectedPhotos.has(photo.id)}
            key={photo.id}
            onClick={()=>toggleSelectPhoto(photo.id)}
            onDoubleClick={()=>history.push('/photo?id='+photo.id)}/>
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

export function PhotoPage(props) {
  const location = useLocation();
  const dispatch = useDispatch();

  //const [photoId, setPhotoId] = useState(null);
  const [photoId, setPhotoId] = useState(null);
  const photo = useSelector(
    state => photoId ? state.photos.entities[photoId] : null
  )
  const [newFoodEntry, setNewFoodEntry] = useState(null);
  const food = useSelector(
    state => {
      if (photo) {
        if (photo.food_id) {
          return state.food.entities[photo.food_id];
        } else {
          return newFoodEntry;
        }
      } else {
        return null;
      }
    }
  )
  const otherPhotos = useSelector(
    state => Object.values(
      state.photos.entities
    ).filter(
      p => food && food.id && p.food_id == food.id
    )
  );

  if (!photo && photoId) {
    dispatch(photoActions['fetchSingle'](photoId));
  }
  if (!food && photo && photo.food_id) {
    dispatch(foodActions['fetchSingle'](photo.food_id));
  }

  // If the photo is loaded, and it's not associated with any food entry,
  // Create a new entry and fill in data from the photo.
  useEffect(() => {
    if (photo && !photo.food_id) {
      setNewFoodEntry({
        date: photo.date,
        user_id: photo.user_id,
        photo_ids: [photo.id]
      });
    }
  }, [photo]);

  // If the food entry changes, check if there are other photos associated with that food entry. If so, load them.
  useEffect(() => {
    if (food && food.id) {
      dispatch(photoActions['fetchMultiple']({food_id: food.id}));
    }
  }, [food])

  // Query string change
  useEffect(() => {
    let queryParams = parseQueryString(location.search);
    setPhotoId(queryParams['id']);
  }, [location]);

  function foodOnChange(entry) {
    if (photo && photo.food_id) {
      dispatch(foodActions['update'](entry));
    } else {
      setNewFoodEntry(entry);
    }
  }
  function foodCreateEntry() {
    dispatch(foodActions['create'](newFoodEntry));
  }
  function foodDeleteEntry() {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      dispatch(foodActions['deleteSingle'](food.id));
    }
  }

  return (
    <main className='photo-page-container'>
      <div className='card col-12 photo'>
        {
          photo &&
          <img src={process.env.REACT_APP_SERVER_ADDRESS+photo.file_url} />
        }
      </div>
      {
        <div className='card col-12'>
          {
            otherPhotos.map(photo =>
              <FoodPhotoThumbnail photoId={photo.id} />
            )
          }
        </div>
      }
      <div className='card col-12'>
        {
          food &&
          <EntryEditorForm entry={food}
              onChange={foodOnChange} /> 
        }
        {
          (photo && !photo.food_id) ?
          <button onClick={foodCreateEntry}>Create New Entry</button> :
          <button onClick={foodDeleteEntry}>Delete Entry</button>
        }
      </div>
    </main>
  );
}
