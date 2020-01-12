import axios from 'axios';
import { 
  getLoadingStatus,
  formatString,
  extractPlaceholders,
  splitDict,
  dictToQueryString
} from '../Utils.js';

function toUpperCaseSnakeCase(str) {
  return str.split(/(?=[A-Z])/).join('_').toUpperCase()
}

function createActions(dataType, path, autosortProps) {
  // Process path. If it should start with a / but not end with one.
  if (!path.startsWith('/')) {
    path = '/'+path;
  }
  if (path.endsWith('/')) {
    path = path.substr(0, path.length-1);
  }

  function updateStore(dispatch, response) {
    if (response.data.entities) {
      for (let [eType,entities] of Object.entries(response.data.entities)) {
        dispatch({ 
          type: 'FETCH_'+toUpperCaseSnakeCase(eType)+'_SUCCESS',
          payload: {
            entities: entities
          }
        });
      }
    }
    if (response.data.summary) {
      dispatch({ 
        type: 'FETCH_'+dataType+'_SUCCESS',
        payload: {
          summary: response.data.summary
        }
      });
    }
  }

  return {
    fetchSingle: function(id) {
      console.log('FETCH '+dataType);
      const ACTION = 'FETCH_'+dataType;
      return function(dispatch, getState) {
        // Send request
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+(id || ''),
          {
            withCredentials: true
          }
        ).then(function(response){
          // Update data
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    fetchMultiple: function(filters, cache=true) {
      filters = filters || {};
      console.log('FETCH '+dataType);
      const ACTION = 'FETCH_'+dataType;
      return function(dispatch, getState) {
        // Check if this is already loading/loaded
        if (filters && cache) {
          let status = getLoadingStatus(getState().loadingStatus[dataType], filters);
          // Check if there was an error. (TODO)
          // If not, then skip sending the request
          if (status) {
            console.log('Already loaded. Skipping.');
            return;
          }
        }
        // Save 'loading' status
        dispatch({
          type: 'LOADING_START',
          payload: {
            entityName: dataType,
            filters: filters
          }
        });
        // Send request
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          {
            params: filters, 
            withCredentials: true
          }
        ).then(function(response){
          // Update data
          updateStore(dispatch, response);
          // Save 'loaded' status
          dispatch({
            type: 'LOADING_SUCCESS',
            payload: {
              entityName: dataType,
              filters: filters
            }
          });
          return response;
        }).catch(function(error){
          // Set 'error' status
          console.log(error);
          dispatch({
            type: 'LOADING_FAILURE',
            payload: {
              entityName: dataType,
              filters: filters,
              error: error.response.data.error
            }
          });
          return error;
        });
      }
    },
    create: function(newEntity, progressCallback=()=>null) {
      console.log('CREATE '+dataType);
      // Check what kind of entity we're creating
      // If it's a JSON object, then send as application/json
      // If it's a FormData (probably a file), send as multipart/form-data
      let contentType = 'application/json';
      if (newEntity.constructor.name === 'FormData') {
        contentType = 'multipart/form-data';
      }
      return function(dispatch) {
        return axios.post(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          newEntity,
          {
            headers: {
              'Content-Type': contentType
            },
            withCredentials: true,
            onUploadProgress: progressCallback
          }
        ).then(function(response){
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    update: function(data) {
      console.log('UPDATE '+dataType);
      console.log(data);
      return {
        type: 'UPDATE_'+dataType+'_START',
        payload: {
          data: data
        }
      }
    },
    updateNow: function(data) {
      console.log('UPDATE '+dataType);
      console.log(data);
      return function(dispatch) {
        return axios.put(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+data.id,
          data,
          {withCredentials: true}
        ).then(function(response){
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    deleteSingle: function(id) {
      console.log('DELETE '+dataType);
      return function(dispatch) {
        return axios.delete(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+id,
          {withCredentials: true}
        ).then(function(response) {
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    deleteMultiple: function(filters) {
      console.log('DELETE '+dataType);
      return function(dispatch) {
        return axios.delete(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          {data: filters, withCredentials: true}
        ).then(function(response) {
          updateStore(dispatch, response);
          return response;
        });
      }
    },
    clear: function() {
      console.log('CLEAR '+dataType);
      return function(dispatch) {
        dispatch({
          type: 'CLEAR_'+dataType,
        });
        dispatch({
          type: 'CLEAR_LOADING_STATUS',
          payload: {
            entityName: dataType
          }
        });
      }
    }
  }
}

export const notify = function(notification){
  if (!notification.duration) {
    notification.duration = 5000;
  }
  return function(dispatch, getState) {
    dispatch({
      type: 'NOTIFY',
      payload: notification
    });
    setTimeout(function(){
      dispatch({
        type: 'UNNOTIFY',
        payload: notification
      });
    }, notification.duration);
  }
}

export const unnotify = function(notification){
  return function(dispatch, getState) {
    dispatch({
      type: 'UNNOTIFY',
      payload: notification
    });
  }
}

export const userProfileActions = createActions('USER_PROFILES', '/data/user_profiles');

export const foodActions = createActions('FOOD', '/data/food');
export const foodSummaryActions = createActions('FOOD_SUMMARY', '/data/food/summary');

export const photoActions = createActions('PHOTOS', '/data/photos');

export const tagActions = createActions('TAGS', '/data/tags');
export const labelActions = createActions('LABELS', '/data/labels');

export const bodyweightActions = createActions('BODYWEIGHT', '/data/body/weights');
export const bodyweightSummaryActions = createActions('BODYWEIGHT_SUMMARY', '/data/body/weights/summary');

photoActions['create'] = (function(){
  let createPhoto = photoActions['create'];
  return function(files, progressCallback, data={}) {
    var formData = new FormData();
    formData.append("file", files[0]);
    for (let [k,v] of Object.entries(data)) {
      formData.append(k, v);
    }
    return createPhoto(formData, progressCallback);
  }
})()
