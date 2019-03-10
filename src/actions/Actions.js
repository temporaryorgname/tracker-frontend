import axios from 'axios';
import { 
  getLoadingStatus,
  formatString,
  extractPlaceholders,
  splitDict,
  dictToQueryString
} from '../Utils.js';

function createActions(dataType, path, autosortProps) {
  // Process path. If it should start with a / but not end with one.
  if (!path.startsWith('/')) {
    path = '/'+path;
  }
  if (path.endsWith('/')) {
    path = path.substr(0, path.length-1);
  }

  return {
    fetchSingle: function(id) {
      console.log('FETCH '+dataType);
      const ACTION = 'FETCH_'+dataType;
      return function(dispatch, getState) {
        // Send request
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+path+'/'+id,
          {
            withCredentials: true
          }
        ).then(function(response){
          // Update data
          dispatch({ 
            type: ACTION+'_SUCCESS',
            payload: {
              data: response.data
            }
          });
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
          dispatch({ 
            type: ACTION+'_SUCCESS',
            payload: {
              filters: filters,
              data: response.data
            }
          });
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
    create: function(newEntity) {
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
            withCredentials: true
          }
        ).then(function(response){
          if (contentType === 'application/json') {
            if (response.data.entities) {
              for (let entity of response.data.entities) {
                dispatch({
                  type: 'CREATE_'+dataType+'_SUCCESS',
                  payload: {
                    data: entity
                  }
                });
              }
            } else {
              dispatch({
                type: 'CREATE_'+dataType+'_SUCCESS',
                payload: {
                  data: {
                    ...newEntity,
                    id: response.data.id || response.data.ids[0]
                  }
                }
              });
            }
          }
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
          dispatch({
            type: 'UPDATE_'+dataType+'_SUCCESS',
            payload: {
              id: data.id
            }
          });
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
          dispatch({
            type: 'DELETE_'+dataType+'_SUCCESS',
            payload: {
              filters: [{id: id}]
            }
          });
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
          dispatch({
            type: 'DELETE_'+dataType+'_SUCCESS',
            payload: {
              filters: filters
            }
          });
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

function createActions2(dataType, path) {
  // Process path. If it should start with a / but not end with one.
  if (!path.startsWith('/')) {
    path = '/'+path;
  }
  let pathParamKeys = extractPlaceholders(path);

  return {
    get: function(params, cache=true) {
      let [pathParams, queryParams] = splitDict(params, pathParamKeys);
      console.log('FETCH '+dataType);
      const ACTION = 'FETCH_'+dataType;
      return function(dispatch, getState) {
        // Check if this is already loading/loaded
        if (params && cache) {
          let status = getLoadingStatus(getState().loadingStatus[dataType], params);
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
            params: params,
            filters: params //TODO: Here for backwards compatibility. Remove later.
          }
        });
        // Send request
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+formatString(path,pathParams)+dictToQueryString(queryParams),
          {
            withCredentials: true
          }
        ).then(function(response){
          // Update data
          dispatch({ 
            type: ACTION+'_SUCCESS',
            payload: {
              data: response.data
            }
          });
          // Save 'loaded' status
          dispatch({
            type: 'LOADING_SUCCESS',
            payload: {
              entityName: dataType,
              params: params,
              filters: params //TODO: Here for backwards compatibility. Remove later.
            }
          });
          return response;
        }).catch(function(error){
          // Set 'error' status
          dispatch({
            type: 'LOADING_FAILURE',
            payload: {
              entityName: dataType,
              params: params,
              filters: params, //TODO: Here for backwards compatibility. Remove later.
              error: error.response.data.error
            }
          });
          return error;
        });
      }
    },
    post: function(params, newEntity) {
      let [pathParams, queryParams] = splitDict(params, pathParamKeys);
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
          process.env.REACT_APP_SERVER_ADDRESS+formatString(path,pathParams)+dictToQueryString(queryParams),
          newEntity,
          {
            headers: {
              'Content-Type': contentType
            },
            withCredentials: true
          }
        ).then(function(response){
          dispatch({
            type: 'CREATE_'+dataType+'_SUCCESS',
            payload: {
              data: {...newEntity, id: response.data.id}
            }
          })
          return response;
        });
      }
    },
    put: function(params, data) {
      let [pathParams, queryParams] = splitDict(params, pathParamKeys);
      console.log('UPDATE '+dataType);
      console.log(data);
      return function(dispatch) {
        return axios.put(
          process.env.REACT_APP_SERVER_ADDRESS+formatString(path,pathParams)+dictToQueryString(queryParams),
          data,
          {withCredentials: true}
        ).then(function(response){
          dispatch({
            type: 'UPDATE_'+dataType+'_SUCCESS',
            payload: {
              id: data.id,
              params: params,
              filters: params //TODO: Here for backwards compatibility. Remove later.
            }
          });
          return response;
        });
      }
    },
    delete: function(params) {
      let [pathParams, queryParams] = splitDict(params, pathParamKeys);
      console.log('DELETE '+dataType);
      return function(dispatch) {
        return axios.delete(
          process.env.REACT_APP_SERVER_ADDRESS+formatString(path,pathParams)+dictToQueryString(queryParams),
          {withCredentials: true}
        ).then(function(response) {
          dispatch({
            type: 'DELETE_'+dataType+'_SUCCESS',
            payload: {
              params: params,
              filters: params //TODO: Here for backwards compatibility. Remove later.
            }
          });
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

export const userProfileActions = createActions('USER_PROFILES', '/data/user_profiles');

export const foodActions = createActions('FOOD', '/data/foods');
export const foodListActions = createActions('FOOD', '/data/foods');
export const foodSummaryActions = createActions('FOOD_SUMMARY', '/data/foods/summary');

export const photoActions = createActions('PHOTOS', '/data/photos');

export const tagActions = createActions('TAGS', '/data/tags');
export const labelActions = createActions('LABELS', '/data/labels');

export const bodyweightActions = createActions('BODYWEIGHT', '/data/body/weights');
export const bodyweightSummaryActions = createActions('BODYWEIGHT_SUMMARY', '/data/body/weights/summary');

photoActions['create'] = (function(){
  let createPhoto = photoActions['create'];
  return function(files, date=null) {
    var formData = new FormData();
    formData.append("file", files[0]);
    if (date) {
      formData.append("date", date);
    }
    return createPhoto(formData);
  }
})()

export const getFoodByPhotoId = createActions2('FOOD', '/data/photos/{id}/food')['get'];
