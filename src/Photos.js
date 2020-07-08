import React, { useState, useEffect, useRef } from 'react';
import {
  useLocation, useHistory
} from "react-router-dom";

import { useSelector, useDispatch } from "react-redux";

import { 
  photoActions,
  foodActions
} from './actions/Actions.js';
import { 
  getLoadingStatus,
  parseQueryString,
  formatDate,
  toggleSet
} from './Utils.js';
import { FoodPhotoThumbnail, BigButton } from './Common.js';
import { EntryEditorForm, useFoodPhotos } from './Diet.js';

import './Photos.scss';

export function usePhotoUploader(date,food_id=null) {
  const dispatch = useDispatch();
  const uploadPhoto = (files, progressCallback, date) => dispatch(
    photoActions['create'](files, progressCallback, date)
  );
  const [ulProgress,setUlProgress] = useState({});
  const [ulErrors,setUlErrors] = useState([]);
  function uploadFile(file) {
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
      if (!photo)
        return; // Skip deleted photos
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

  // Query string change
  useEffect(() => {
    let queryParams = parseQueryString(location.search);
    setUid(queryParams['uid'] || currentUid);
  }, [location, currentUid]);

  const [
    ulProgress,
    ulErrors,
    uploadCallback
  ] = usePhotoUploader(formatDate(new Date()));

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
  const dispatch = useDispatch();
  const history = useHistory();
  const photosByDate = usePhotos(uid);
  const [maxPhotos,setMaxPhotos] = useState(10);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  function toggleSelectPhoto(id) {
    setSelectedPhotos(toggleSet(selectedPhotos,id));
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

  function deleteSelectedPhotos() {
    if (window.confirm('Are you sure you want to delete the selected photos?')) {
      for (let pid of selectedPhotos) {
        dispatch(photoActions['deleteSingle'](pid));
      }
      setSelectedPhotos(new Set());
    }
  }

  return (<>
    {photosDom}
    <div>
      <button onClick={()=>setMaxPhotos(maxPhotos+10)}>Show More</button>
      {
        selectedPhotos.size > 0 &&
        <button onClick={deleteSelectedPhotos}>Delete Selected</button>
      }
    </div>
  </>);
}

export function FoodPhotosGallery(props) {
  const {
    foodId = null,
    uid = null,
    date = formatDate(new Date()),
  } = props;
  const dispatch = useDispatch();
  const photos = useFoodPhotos(uid, foodId, date);
  const [
    ulProgress,
    ulErrors,
    uploadCallback
  ] = usePhotoUploader(date, foodId);
  const ref = useRef();
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [scrollPos, setScrollPos] = useState(0);
  const [scrollLimits, setScrollLimits] = useState([0,0])

  useEffect(() => {
    setScrollWidth(ref.current.scrollWidth);
    setClientWidth(ref.current.clientWidth);
    setScrollLimits([
      -(ref.current.scrollWidth-ref.current.clientWidth*0.5), 0
    ]);
  }, [ref]);

  function scroll(direction) {
    const [min,max] = scrollLimits;
    let pos = scrollPos+direction*0.8*clientWidth;
    if (pos > max) {
      pos = max;
    } else if (pos < min) {
      pos = min;
    }
    setScrollPos(pos);
  }
  
  const [scrollMin,scrollMax] = scrollLimits;
  let style = {transform: 'translateX('+scrollPos+'px)'};
  return (<div className='food-photos-gallery'>
    <div className='scrollable-container' ref={ref} style={style}>
      <label>
        <input type="file" name="file" accept="image/*" capture="camera"
            onChange={uploadCallback}/>
        <BigButton icon='add_a_photo' text='Upload Photo' />
      </label>
      <BigButton icon='collections' text='Select Photo' />
      {
        photos.map(photo =>
          <FoodPhotoThumbnail key={photo.id}
              photoId={photo.id} />
        )
      }
    </div>
    {
      scrollPos < scrollMax &&
      <div className='control left' onClick={()=>scroll(1)}>
        <i className='material-icons'>navigate_before</i>
      </div>
    }
    {
      scrollPos > scrollMin &&
      <div className='control right' onClick={()=>scroll(-1)}>
        <i className='material-icons'>navigate_next</i>
      </div>
    }
  </div>);
}

export function PhotoPage(props) {
  const location = useLocation();
  const dispatch = useDispatch();

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
          <img src={process.env.REACT_APP_SERVER_ADDRESS+photo.file_url}
              alt='Food'/>
        }
      </div>
      {
        (food && food.id) &&
        <div className='card col-12 other-photos'>
          <h2>Other Photos</h2>
          <FoodPhotosGallery foodId={food.id}
              date={food.date}/>
        </div>
      }
      <div className='card col-12'>
        <h2>Nutritional Information Entry</h2>
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
