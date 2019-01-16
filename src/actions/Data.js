import axios from 'axios';

import {
  stringifyPolygon,
  parsePolygon,
  stringifyBox,
  parseBox
} from '../Utils.js';

import { 
  REQUEST_USER_PROFILE,
  RECEIVE_USER_PROFILE
} from "../constants/action-types";

export const fetchPhotoStart = function(userId){
  return {
    type: 'FETCH_PHOTO_START',
    payload: {userId: userId}
  }
}
export const fetchPhotos = function(userId){
  return function(dispatch) {
    dispatch(fetchPhotoStart(userId));
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/by_user/"+userId, 
      {withCredentials: true}
    ).then(function(response){
      dispatch(fetchPhotoCompleted(response.data));
    }).catch(function(error){
      console.error('Unable to fetch user\'s photo IDs.');
      console.error(error);
    });
  }
}
export const fetchPhotoCompleted = function(data){
  return { 
    type: 'FETCH_PHOTO_COMPLETED',
    payload: {
      data: data
    }
  };
}

export const updatePhoto = function(id,data){
  return function(dispatch) {
    console.log('Updating photo '+id);
    console.log(data);
    dispatch({
      type: 'UPDATE_PHOTO_START',
      payload: {
        photoId: id,
        data: data
      }
    });
    dispatch({
      type: 'UPDATE_PHOTO_COMPLETED',
      payload: {
        photoId: id,
        data: data
      }
    });
    //axios.post(
    //  process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/by_user/"+userId, 
    //  {withCredentials: true}
    //).then(function(response){
    //  dispatch(fetchPhotoCompleted(response.data));
    //}).catch(function(error){
    //  console.error('Unable to fetch user\'s photo IDs.');
    //  console.error(error);
    //});
  }
}

export const fetchPhotoGroupsStart = function(userId){
  return {
    type: 'FETCH_PHOTO_GROUPS_START',
    payload: {userId: userId}
  }
}
export const fetchPhotoGroups = function(){
  return function(dispatch) {
    dispatch(fetchPhotoGroupsStart());
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/groups", 
      {withCredentials: true}
    ).then(function(response){
      dispatch(fetchPhotoGroupsCompleted(response.data));
    }).catch(function(error){
      console.error('Unable to fetch user\'s photo IDs.');
      console.error(error);
    });
  }
}
export const fetchPhotoGroupsCompleted = function(data){
  return { 
    type: 'FETCH_PHOTO_GROUPS_COMPLETED',
    payload: {
      data: data
    }
  };
}

export const createPhotoGroup = function(date){
  return function(dispatch) {
    console.log('Create photo group');
    dispatch({
      type: 'CREATE_PHOTO_GROUP_START',
      payload: {date: date}
    });
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/groups", 
      {date: date},
      {withCredentials: true}
    ).then(function(response){
      dispatch({
        type: 'CREATE_PHOTO_GROUP_COMPLETED',
        payload: {
          data: response.data
        }
      })
    }).catch(function(error){
      console.error('Unable to create photo group.');
      console.error(error);
    });
  }
}

export const fetchPhotoData = function(photoId){
  return function(dispatch) {
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/photos/"+photoId+'/data?size=700',
      {withCredentials: true}
    ).then(function(response){
      var data = "data:image/png;base64,"+response.data.data;
      dispatch(fetchPhotoDataCompleted(photoId, data));
    });
  }
}
const fetchPhotoDataCompleted = function(photoId, data){
  return { 
    type: 'FETCH_PHOTO_DATA_COMPLETED',
    payload: {
      id: photoId,
      data: data
    }
  };
}

export const createPhotos = function(files, date=null){
  return function(dispatch) {
    var formData = new FormData();
    formData.append("file", files[0]);
    if (date) {
      formData.append("date", date);
    }
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo",
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      }
    ).then(function(response){
      console.log('Uploaded photo successfully');
      var reader = new FileReader();
      reader.onload = function(e) {
        dispatch(
          createPhotoCompleted(response.data.id, e.target.result, date)
        );
      };
      reader.readAsDataURL(files[0]);
    });
  }
}
const createPhotoCompleted = function(photoId, fileData, date){
  return { 
    type: 'CREATE_PHOTO_COMPLETED',
    payload: {
      id: photoId,
      fileData: fileData,
      date: date
    }
  };
}

const fetchTagsStart = function(userId){
  return {
    type: 'FETCH_TAGS_START',
    payload: {userId: userId}
  }
}
export const fetchTags = function(){
  return function(dispatch) {
    dispatch(fetchTagsStart());
    return axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/tags", 
      {withCredentials: true}
    ).then(function(response){
      dispatch(fetchTagsCompleted(response.data));
    }).catch(function(error){
      console.error('Unable to fetch tags');
      console.error(error);
    });
  }
}
const fetchTagsCompleted = function(data){
  return { 
    type: 'FETCH_TAGS_COMPLETED',
    payload: {
      data: data
    }
  };
}

const createTagStart = function(tag){
  return {
    type: 'CREATE_TAG_START',
    payload: {
      data: tag
    }
  }
}
export const createTag = function(tag){
  return function(dispatch) {
    dispatch(createTagStart(tag));
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/tags",
      tag,
      {withCredentials: true}
    );
  }
}

const fetchLabelsStart = function(photoId){
  return {
    type: 'FETCH_LABELS_START',
    payload: {photoId: photoId}
  }
}
export const fetchLabels = function(photoId){
  return function(dispatch) {
    dispatch(fetchLabelsStart(photoId));
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/"+photoId+"/labels", 
      {withCredentials: true}
    ).then(function(response){
      var labels = response.data;
      labels = labels.map(function(label){
        return {...label, 
          'bounding_box': parseBox(label['bounding_box']),
          'bounding_polygon': parsePolygon(label['bounding_polygon']),
          'photo_id': photoId
        }
      });
      dispatch(fetchLabelsCompleted(photoId, labels));
    }).catch(function(error){
      console.error('Unable to fetch labels');
      console.error(error);
    });
  }
}
const fetchLabelsCompleted = function(photoId, labels){
  return { 
    type: 'FETCH_LABELS_COMPLETED',
    payload: {
      photoId: photoId,
      labels: labels
    }
  };
}

const createLabelStart = function(label){
  return {
    type: 'CREATE_LABEL_START',
    payload: {
      data: label
    }
  }
}
export const createLabel = function(label){
  return function(dispatch) {
    dispatch(createLabelStart(label));
    var parsedLabel = {...label};
    parsedLabel['bounding_box'] = stringifyBox(label['bounding_box']);
    parsedLabel['bounding_polygon'] = stringifyPolygon(label['bounding_polygon']);
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/"+label.photo_id+'/labels',
      parsedLabel,
      {withCredentials: true}
    ).then(function(response){
      label['id'] = response.data['id'];
      dispatch(createLabelCompleted(label));
    });
  }
}
const createLabelCompleted = function(label){
  return {
    type: 'CREATE_LABEL_COMPLETED',
    payload: {
      data: label
    }
  }
}

const updateLabelStart = function(label){
  return {
    type: 'UPDATE_LABEL_START',
    payload: {
      data: label
    }
  }
}
export const updateLabel = function(label){
  return function(dispatch) {
    dispatch(updateLabelStart(label));
    var parsedLabel = {...label};
    parsedLabel['bounding_box'] = stringifyBox(label['bounding_box']);
    parsedLabel['bounding_polygon'] = stringifyPolygon(label['bounding_polygon']);
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/"+label.photo_id+'/labels/'+label['id'],
      parsedLabel,
      {withCredentials: true}
    ).then(function(response){
      dispatch(updateLabelCompleted(label));
    });
  }
}
const updateLabelCompleted = function(label){
  return {
    type: 'UPDATE_LABEL_COMPLETED',
    payload: {
      label: label
    }
  };
}

const deleteLabelStart = function(label){
  return {
    type: 'DELETE_LABEL_START',
    payload: {
      data: label
    }
  }
}
export const deleteLabel = function(label){
  return function(dispatch) {
    dispatch(deleteLabelStart(label));
    return axios.delete(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/"+label.photo_id+'/labels/'+label['id'],
      {withCredentials: true}
    ).then(function(response){
      dispatch(deleteLabelCompleted(label));
    });
  }
}
const deleteLabelCompleted = function(label){
  return {
    type: 'DELETE_LABEL_COMPLETED',
    payload: {
      data: label
    }
  }
}
