import { combineReducers } from 'redux'
import { 
  updateLoadingStatus,
} from '../Utils.js';

function createReducer(entityName) {
  let initialState = {
    entities: {},
    by: {},
    dirtyEntities: new Set() // IDs of entries that were modified
  }
  return function(state = initialState, action) {
    switch (action.type) {
      case 'FETCH_'+entityName+'_SUCCESS': {
        let filters = action.payload.filters || {};
        let data = action.payload.data;
        let ids = [];
        let entities = {};
        if (data instanceof Array) {
          data.forEach(function(x){
            entities[x.id] = x;
            ids.push(x.id);
          });
        } else {
          entities[data.id] = data;
          ids.push(data.id);
        }

        let filterKeys = Object.keys(filters);
        if (filterKeys.length === 1) {
          // If we filtered by one criterion, then update the 'by' object
          let filterKey = filterKeys[0];
          let filterValue = filters[filterKey];
          return {...state,
            by: {
              ...state.by,
              [filterKey]: {
                ...state.by[filterKey],
                [filterValue]: ids
              }
            },
            entities: {...state.entities, ...entities}
          };
        } else {
          // If there's moe than one filter, then only update the individual entities
          return {...state,
            entities: {...state.entities, ...entities}
          };
        }
      }
      case 'CREATE_'+entityName+'_SUCCESS': {
        let newEntity = action.payload.data;
        let by = {...state.by};
        for (let props in by) {
          let key = newEntity[props];
          if (key in by[props]) {
            by[props] = {
              ...by[props],
              [key]: [...by[props][key], newEntity.id]
            };
          }
        }
        return {
          ...state,
          entities: {...state.entities, [newEntity.id]: newEntity},
          by: by
        };
      }
      case 'UPDATE_'+entityName+'_START': {
        let newEntity = action.payload.data;
        let id = newEntity.id;
        // Add to set of dirty entries
        let dirtyEntities = new Set(state.dirtyEntities);
        dirtyEntities.add(id);
        // Look for changed properties
        let oldEntity = state.entities[id];
        let changedProps = [];
        for (let key in oldEntity) {
          if (oldEntity[key] !== newEntity[key]) {
            changedProps.push(key);
          }
        }
        // Update 'by'
        let by = {...state.by};
        changedProps.forEach(function(key){
          //TODO: Remove only by[key][oldEntity[key]] and by[key][newEntity[key]]
          by[key] = {};
        });
        // Create new state
        return {...state,
          entities: {...state.entities, [id]: newEntity},
          by: by,
          dirtyEntities: dirtyEntities
        };
      }
      case 'UPDATE_'+entityName+'_SUCCESS': {
        var id = action.payload.id;
        var dirtyEntities = new Set(state.dirtyEntities);
        dirtyEntities.delete(id);
        return {...state,
          dirtyEntities: dirtyEntities
        };
      }
      case 'DELETE_'+entityName+'_SUCCESS': {
        let filters = action.payload.filters;
        // Remove matching entities from `entities`
        let deletedIds = [];
        let filteredKeys = Object.keys(state.entities).filter(function(key){
          let entity = state.entities[key];
          for (let filter of filters) {
            let mismatch = Object.keys(filter).filter(prop => entity[prop] !== filter[prop]);
            if (mismatch.length === 0) {
              deletedIds.push(key);
              return false;
            }
          }
          return true;
        });
        let entities = {};
        filteredKeys.forEach(function(key){
          entities[key] = state.entities[key];
        });
        // Remove matching entity IDs from `by`
        let by = {...state.by};
        Object.keys(state.by).forEach(function(prop){
          let updatedBy = {...state.by[prop]};
          for (let id of deletedIds) {
            let entity = state.entities[id];
            if (entity[prop] in updatedBy) {
              updatedBy[entity[prop]] = updatedBy[entity[prop]].filter(x => x !== id);
            }
          }
          by[prop] = updatedBy;
        });
        return {
          ...state,
          entities: entities,
          by: by
        };
      }
      case 'CLEAR_'+entityName: {
        return initialState;
      }
      default:
        return state;
    }
  }
}

export function loadingStatusReducer(state = {}, action) {
  switch (action.type) {
    case 'LOADING_START': {
      let entityName = action.payload.entityName;
      let filters = action.payload.filters;
      let statusTree = state[entityName];
      let newStatus = updateLoadingStatus(
        statusTree, filters, {status: 'loading'}
      );
      return {
        ...state,
        [entityName]: newStatus
      };
    }
    case 'LOADING_SUCCESS': {
      let entityName = action.payload.entityName;
      let filters = action.payload.filters;
      let statusTree = state[entityName];
      let newStatus = updateLoadingStatus(
        statusTree, filters, {status: 'loaded', time: new Date()}
      );
      return {
        ...state,
        [entityName]: newStatus
      };
    }
    case 'LOADING_FAILURE': {
      let entityName = action.payload.entityName;
      let filters = action.payload.filters;
      let error = action.payload.error;
      let statusTree = state[entityName];
      let newStatus = updateLoadingStatus(
        statusTree, filters, {status: 'error', error: error, time: new Date()}
      );
      return {
        ...state,
        [entityName]: newStatus
      };
    }
    case 'CLEAR_LOADING_STATUS': {
      let entityName = action.payload.entityName;
      let newState = {};
      Object.keys(state).forEach(function(key){
        if (key === entityName) {
          return;
        }
        newState[key] = state[key];
      });
      return newState;
    }
    default:
      return state;
  }
}

function foodSummaryReducer(state = {history: null}, action) {
  switch (action.type) {
    case 'FETCH_FOOD_SUMMARY_SUCCESS': {
      let data = action.payload.data;
      return data;
    }
    default:
      return state;
  }
}

function bodyweightSummaryReducer(state = {}, action) {
  switch (action.type) {
    case 'FETCH_BODYWEIGHT_SUMMARY_SUCCESS': {
      return action.payload.data;
    }
    default:
      return state;
  }
}

function notificationReducer(state = [], action) {
  switch (action.type) {
    case 'NOTIFY': {
      return [...state, action.payload];
    }
    case 'UNNOTIFY': {
      return state.filter(x => x !== action.payload);
    }
    default:
      return state;
  }
}

function sessionReducer(state = {}, action) {
  switch (action.type) {
    case 'UPDATE_SESSION_SUCCESS': {
      if (isFinite(action.payload)) {
        return {
          uid: action.payload
        };
      } else {
        return {
          uid: null
        };
      }
    }
    case 'LOGIN_START': {
      return {
        loggingIn: true
      };
    }
    case 'LOGIN_SUCCESS': {
      return {
        ...state,
        session: {
          uid: action.payload.id
        }
      };
    }
    case 'LOGIN_FAILURE': {
      return {
        error: action.payload.error
      };
    }
    case 'LOGOUT_SUCCESS': {
      return {};
    }
    default:
      return state;
  }
}

const combinedReducer = combineReducers({
  food: createReducer('FOOD'),
  foodSummary: foodSummaryReducer,
  photos: createReducer('PHOTOS'),
  photoGroups: createReducer('PHOTO_GROUPS'),
  photoData: createReducer('PHOTO_DATA'),
  tags: createReducer('TAGS'),
  labels: createReducer('LABELS'),
  bodyweight: createReducer('BODYWEIGHT'),
  bodyweightSummary: bodyweightSummaryReducer,
  loadingStatus: loadingStatusReducer,
  userProfiles: createReducer('USER_PROFILES'),
  notifications: notificationReducer, 
  session: sessionReducer
});

const rootReducer = function(state, action) {
  if (action.type === 'LOGOUT_SUCCESS') {
    return combinedReducer(undefined, action);
  }
  return combinedReducer(state, action);
}

export default rootReducer;
