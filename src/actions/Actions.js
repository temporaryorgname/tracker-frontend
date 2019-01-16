import axios from 'axios';

function createActions(dataType, path) {
  // Process path. If it should start with a / but not end with one.
  if (!path.startsWith('/')) {
    path = '/'+path;
  }
  if (path.endsWith('/')) {
    path = path.substr(0, path.length-1);
  }

  return {
    fetch: function(filters) {
      console.log('FETCH '+dataType);
      const ACTION = 'FETCH_'+dataType;
      return function(dispatch) {
        dispatch({
          type: ACTION+'_START',
          payload: {
            filters: filters
          }
        });
        return axios.get(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          {
            params: filters, 
            withCredentials: true
          }
        ).then(function(response){
          dispatch({ 
            type: ACTION+'_SUCCESS',
            payload: {
              filters: filters,
              data: response.data
            }
          });
        });
      }
    },
    create: function(newEntity) {
      console.log('CREATE '+dataType);
      return function(dispatch) {
        return axios.post(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          newEntity,
          {withCredentials: true}
        ).then(function(response){
          dispatch({
            type: 'CREATE_'+dataType+'_SUCCESS',
            payload: {
              data: newEntity
            }
          })
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
    delete: function(filters) {
      console.log('DELETE '+dataType);
      return function(dispatch) {
        return axios.delete(
          process.env.REACT_APP_SERVER_ADDRESS+path,
          {data: filters, withCredentials: true}
        );
      }
    }
  }
}

export const foodActions = createActions('FOOD', '/data/foods');
export const photoActions = createActions('PHOTOS', '/data/photos');
export const tagActions = createActions('TAGS', '/data/tags');
export const labelActions = createActions('LABELS', '/data/labels');
