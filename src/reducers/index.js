import { combineReducers } from 'redux'

import { 
  RECEIVE_FOOD,
  REQUEST_BODYWEIGHT,
  RECEIVE_BODYWEIGHT,
  REQUEST_USER_PROFILE,
  RECEIVE_USER_PROFILE
} from "../constants/action-types";

const initialFoodState = {
  entriesByDate: {}, // Key: date, data: array of food IDs
  entries: {}, // Key: id, data: array of entries
  dirtyEntries: new Set() // IDs of entries that were modified
};
function foodReducer(state = initialFoodState, action) {
  switch (action.type) {
    case RECEIVE_FOOD: {
      let date = action.payload.date;
      let data = action.payload.data;
      let entryIds = [];
      let entries = {};
      data.forEach(function(x){
        entries[x.id] = x;
        entryIds.push(x.id);
      });
      return {...state,
        entriesByDate: {...state.entriesByDate, [date]: entryIds},
        entries: {...state.entries, ...entries}
      };
    }
    case 'UPDATE_FOOD': {
      console.log('UPDATE_FOOD');
      let id = action.payload.id;
      let data = action.payload.data;
      let dirtyEntriesCopy = new Set(state.dirtyEntries);
      dirtyEntriesCopy.add(id);
      return {...state,
        entries: {...state.entries, [id]: data},
        dirtyEntries: dirtyEntriesCopy
      };
    }
    case 'UPDATE_FOOD_COMPLETED': {
      var id = action.payload.id;
      var dirtyEntriesCopy = new Set(state.dirtyEntries);
      dirtyEntriesCopy.delete(id);
      return {...state,
        dirtyEntries: dirtyEntriesCopy
      };
    }
    default:
      return state;
  }
}

function bodyweightReducer(state = [], action) {
  switch (action.type) {
    case REQUEST_BODYWEIGHT:
      return state; //TODO: Mark as loading
    case RECEIVE_BODYWEIGHT:
      return action.payload.data;
    default:
      return state;
  }
}

const initialUserState = {
  session: {},
  profiles: {} // Key: user id
};
function userReducer(state = initialUserState, action) {
  switch (action.type) {
    case 'UPDATE_SESSION_COMPLETED': {
      if (isFinite(action.payload)) {
        return {
          ...state,
          session: {
            uid: action.payload
          }
        };
      } else {
        return {
          ...state,
          session: {}
        };
      }
    }
    case 'LOGIN_START': {
      return {
        ...state,
        session: {
          loggingIn: true
        }
      };
    }
    case 'LOGIN_COMPLETED': {
      if (action.payload.error) {
        return {
          ...state,
          session: {
            error: action.payload.error
          }
        };
      }
      if (action.payload.id) {
        return {
          ...state,
          session: {
            uid: action.payload.id
          }
        };
      }
      return {};
    }
    case 'LOGOUT_COMPLETED': {
      return {
        ...state,
        session: {}
      };
    }
    case REQUEST_USER_PROFILE:
      var userId = action.payload.userId;
      return {
        ...state,
        profiles: {
          ...state.profiles,
          [userId]: {
            loading: true
          }
        }
      }
    case RECEIVE_USER_PROFILE:
      var data = action.payload.data;
      return {
        ...state,
        profiles: {
          ...state.profiles,
          [data.id]: data
        }
      }
    default:
      return state;
  }
}

const initialDataState = {
  photoIds: null,
  tagIds: [],
  tagsById: {},
  labelsById: {},
  labelIdsByPhotoId: {}
};
function dataReducer(state = initialDataState, action) {
  switch (action.type) {
    case 'FETCH_PHOTO_IDS_START': {
      return state;
    }
    case 'FETCH_PHOTO_IDS_COMPLETED': {
      return {
        ...state,
        photoIds: action.payload.data
      };
    }
    case 'FETCH_TAGS_COMPLETED': {
      var tags = action.payload.data;
      return {
        ...state,
        tagIds: tags.map((t) => t.id),
        tagsById: tags.reduce((acc,t) => {acc[t.id] = t; return acc}, {})
      };
    }
    case 'FETCH_LABELS_COMPLETED': {
      var labels = action.payload.data;
      labels = labels.map(function(label){
        if (label['bounding_box'] !== null) {
          label['bounding_box'] = JSON.parse(
            '['+label['bounding_box'].split('(').join('[').split(')').join(']')+']'
          );
        }
        if (label['bounding_polygon'] !== null) {
          label['bounding_polygon'] = JSON.parse(
            label['bounding_polygon'].split('(').join('[').split(')').join(']')
          );
          console.log(label['bounding_polygon']);
        } else {
          label['bounding_polygon'] = [];
        }
        return label;
      })
      return {
        ...state,
        labelsById: {
          ...state.labelsById,
          ...labels.reduce((acc,l) => {acc[l.id] = l; return acc}, {})
        },
        labelIdsByPhotoId: {
          ...state.labelIdsByPhotoId,
          [action.payload.photoId]: labels.map((l) => l.id)
        }
      };
    }
    case 'CREATE_TAG_START': {
      var tag = action.payload.data;
      console.log(action.type);
      console.log(tag);
      return {
        ...state,
        tagIds: state.tagIds.concat([tag.id]),
        tagsById: {
          ...state.tagsById,
          [tag.id]: tag
        }
      };
    }
    case 'UPDATE_LABEL_COMPLETED': {
      var label = action.payload.data;
      console.log(action.type);
      console.log(label);
      return {
        ...state,
        labelsByIds: {
          ...state.labelsByIds,
          [label.id]: label,
        }
      };
    }
    default:
      return state;
  }
}

const rootReducer = combineReducers({
  food: foodReducer,
  bodyweight: bodyweightReducer,
  user: userReducer,
  data: dataReducer
});

export default rootReducer;
