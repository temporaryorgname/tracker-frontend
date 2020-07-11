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
  toggleSet,
  subtractSets
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
            <input type="file" name="file" accept="image/*"
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
  const history = useHistory();
  const photos = useFoodPhotos(uid, foodId, date);
  const [
    ulProgress,
    ulErrors,
    uploadCallback
  ] = usePhotoUploader(date, foodId);
  const ref = useRef();

  // 'view' = display photos associated with this food entry
  // 'select' = Display all photos for this date so a new set can be selected
  const [mode, setMode] = useState('view');
  const [selectedSet, setSelectedSet] = useState(null);
  const selectedPhotos = useSelector(
    state => selectedSet && 
      Array.from(selectedSet).map(id => state.photos.entities[id])
  );
  function handleSelectedPhotosChange() {
    let originalSet = new Set(photos.map(p => p.id));
    let deletedIds = subtractSets(originalSet,selectedSet);
    let addedIds = subtractSets(selectedSet,originalSet);
    for (let photo of selectedPhotos) {
      dispatch(photoActions['update']({
        ...photo,
        food_id: foodId
      }));
    }
    for (let photo of photos) {
      if (deletedIds.has(photo.id)) {
        dispatch(photoActions['update']({
          ...photo,
          food_id: null
        }));
      }
    }
    setMode('view');
  }
  function enableSelectMode() {
    setSelectedSet(new Set(
      photos.map(p => p.id)
    ));
    setMode('select');
  }

  // Scrolling
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [scrollPos, setScrollPos] = useState(0);
  const [scrollLimits, setScrollLimits] = useState([0,0])
  function updateScrollLimits() {
    if (!ref.current) return;
    let s = ref.current.scrollWidth; // Width of full div
    let c = ref.current.clientWidth; // Width of the visile window
    setScrollWidth(s);
    setClientWidth(c);
    setScrollLimits([
      s > c ? -(s-c*0.8) : 0,
      0
    ]);
  }
  let resizeObs = useRef( // Keep reference so we don't create a new one each time
    new ResizeObserver(x => {
      updateScrollLimits();
    })
  );
  let mutationObs = useRef( // Children addition does not trigger ResizeObserver
    new MutationObserver((mutations,observer) => {
      for (let mutation of mutations) {
        if (mutation.type === 'childList') {
          updateScrollLimits();
          return;
        }
      }
    })
  );
  useEffect(() => {
    if (!ref.current) return;
    resizeObs.current.observe(ref.current);
    mutationObs.current.observe(ref.current, {childList: true});
    for (let child of ref.current.children) {
      resizeObs.current.observe(child);
    }
    return () => {
      resizeObs.current.disconnect();
      mutationObs.current.disconnect();
    }
  }, [ref.current]);
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
  
  // Render
  function renderView() {
    return (<>
      <label>
        <input type="file" name="file" accept="image/*" capture="camera"
            onChange={uploadCallback}/>
        <BigButton icon='add_a_photo' text='Upload Photo' />
      </label>
      <BigButton icon='collections' text='Select Photo'
          onClick={enableSelectMode}/>
      {
        photos.map(photo =>
          <FoodPhotoThumbnail key={photo.id}
              photoId={photo.id}
              onClick={()=>history.push('/photo?id='+photo.id)}/>
        )
      }
    </>);
  }
  function renderSelect() {
    return (
      <FoodPhotosSelectorGallery date={date} uid={uid}
          onChange={setSelectedSet} selectedPhotos={selectedSet} />
    );
  }

  const [scrollMin,scrollMax] = scrollLimits;
  let style = {transform: 'translateX('+scrollPos+'px)'};
  return (<div className='food-photos-gallery'>
    <div className='scrollable-container' ref={ref} style={style}>
      { mode === 'view' ? renderView() : renderSelect() }
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
    {
      mode === 'select' &&
      <>
        <button onClick={handleSelectedPhotosChange}>Done</button>
        <button onClick={() => setMode('view')}>Cancel</button>
      </>
    }
  </div>);
}

export function FoodPhotosSelectorGallery(props) {
  const {
    uid = null,
    date = formatDate(new Date()),
    onChange = () => {},
    selectedPhotos = new Set(),
  } = props;
  const dispatch = useDispatch();
  const photos = useFoodPhotos(uid, null, date);
  const ref = useRef();

  function toggleSelected(id) {
    onChange(toggleSet(selectedPhotos,id));
  }

  function getOverlay(photo) {
    if (selectedPhotos.has(photo.id)) {
      return <i className='material-icons'>check</i>;
    } else if (photo.food_id) {
      return <i className='material-icons'>fastfood</i>;
    } else {
      return null;
    }
  }
  return photos.map(photo =>
    <FoodPhotoThumbnail key={photo.id}
        photoId={photo.id}
        selected={selectedPhotos.has(photo.id)}
        onClick={() => toggleSelected(photo.id)}
        overlay={getOverlay(photo)}/>
  );
}

export function PhotoPage(props) {
  const location = useLocation();
  const dispatch = useDispatch();
  const history = useHistory();

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
      {
        photo &&
        <div className='card col-12'>
          <h2>Misc</h2>
          <button onClick={() => history.push('/food?uid='+photo.user_id+'date='+photo.date)}>
            View Diet Log
          </button>
        </div>
      }
    </main>
  );
}
