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
        let filteredKeys = Object.keys(state.entities).filter(function(key){
          let entity = state.entities[key];
          for (let props in filters) {
            if (entity[props] !== filters[props]) {
              return true;
            }
          }
          return false;
        });
        let entities = {};
        filteredKeys.forEach(function(key){
          entities[key] = state.entities[key];
        });
        // Remove matching entity IDs from `by`
        // TODO
        return {
          ...state,
          entities: entities
        };
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
    default:
      return state;
  }
}

function foodSummaryReducer(state = {history: null}, action) {
  switch (action.type) {
    case 'FETCH_FOOD_SUMMARY_SUCCESS': {
			let data = action.payload.data;
			return {
				...state,
				history: data
			}
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

const rootReducer = combineReducers({
  food: createReducer('FOOD'),
	foodSummary: foodSummaryReducer,
  photos: createReducer('PHOTOS'),
  photoGroups: createReducer('PHOTO_GROUPS'),
  tags: createReducer('TAGS'),
  labels: createReducer('LABELS'),
  bodyweight: createReducer('BODYWEIGHT'),
  bodyweightSummary: bodyweightSummaryReducer,
  loadingStatus: loadingStatusReducer,
  users: createReducer('USERS'),
  session: sessionReducer
});

export default rootReducer;
