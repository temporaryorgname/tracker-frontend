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
  photos: {},
  photoIds: null,
  photoIdsByDate: {},
  photoData: {},

  photoGroups: {},
  photoGroupIdsByDate: {},

  tagIds: [],
  tagsById: {},

  labelsById: {},
  labelIdsByPhotoId: {}
};
function dataReducer(state = initialDataState, action) {
  switch (action.type) {
    case 'FETCH_PHOTO_COMPLETED': {
      var data = action.payload.data;
      return {
        ...state,
        photos: {
          ...state.photos,
          ...data.reduce(function(acc,photo){
            acc[photo.id] = photo;
            return acc;
          }, {})
        },
        photoIds: data.map(p => p.id),
        photoIdsByDate: {
          ...state.photoIdsByDate,
          ...data.reduce(function(acc, photo) {
            if (!photo['date']) {
              return acc;
            }
            if (! (photo['date'] in acc)) {
              acc[photo['date']] = [photo.id];
            } else {
              acc[photo['date']].push(photo.id);
            }
            return acc;
          }, {})
        }
      };
    }
    case 'UPDATE_PHOTO_COMPLETED': {
      var id = action.payload.photoId;
      var data = action.payload.data;
      console.log('Updating photo entry');
      console.log(id);
      console.log(data);
      var oldEntry = state.photos[id];
      var newEntry = {
        ...oldEntry,
        ...data
      };
      if (oldEntry.date === newEntry.date) {
        var byDate = state.photoIdsByDate;
      } else {
        var byDate = {
          ...state.photoIdsByDate,
          [newEntry.date]: [...state.photoIdsByDate[newEntry.date], id]
        }
        byDate[oldEntry.date] = byDate[oldEntry.date].filter(x => x !== id)
      }
      return {
        ...state,
        photos: {
          ...state.photos,
          [id]: newEntry
        },
        photoIdsByDate: byDate
      };
    }
    case 'FETCH_PHOTO_GROUPS_COMPLETED': {
      var data = action.payload.data;
      return {
        ...state,
        photoGroups: data.reduce(function(acc,group){
          acc[group.id] = group;
          return acc;
        }, {}),
        photoGroupIdsByDate: {
          ...data.reduce(function(acc, group) {
            if (!group['date']) {
              return acc;
            }
            if (! (group['date'] in acc)) {
              acc[group['date']] = [group.id]
            } else {
              acc[group['date']].push(group.id);
            }
            return acc;
          }, {})
        }
      };
    }
    case 'FETCH_PHOTO_DATA_COMPLETED': {
      var id = action.payload.id;
      var data = action.payload.data;
      return {
        ...state,
        photoData: {
          ...state.photoData,
          [id]: data
        }
      };
    }
    case 'CREATE_PHOTO_COMPLETED': {
      var files = action.payload.files;
      var fileData = action.payload.fileData;
      var date = action.payload.date;
      var photoId = action.payload.id;
      var byDate = {...state.photoIdsByDate};
      if (date) {
        if (date in byDate) {
          byDate[date] = [...byDate[date], photoId];
        }
      }
      return {
        ...state,
        photoIds: [...state.photoIds, photoId],
        photoIdsByDate: byDate,
        photoData: {...state.photoData, [photoId]: fileData}
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
      var labels = action.payload.labels;
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
      return {
        ...state,
        tagIds: state.tagIds.concat([tag.id]),
        tagsById: {
          ...state.tagsById,
          [tag.id]: tag
        }
      };
    }
    case 'CREATE_LABEL_COMPLETED': {
      var label = action.payload.data;
      return {
        ...state,
        labelsById: {
          ...state.labelsById,
          [label.id]: label,
        },
        labelIdsByPhotoId: {
          ...state.labelIdsByPhotoId,
          [label.photo_id]: state.labelIdsByPhotoId[label.photo_id]
              .concat([label.id])
        }
      };
    }
    case 'UPDATE_LABEL_COMPLETED': {
      var label = action.payload.label;
      return {
        ...state,
        labelsById: {
          ...state.labelsById,
          [label.id]: label,
        }
      };
    }
    case 'DELETE_LABEL_COMPLETED': {
      var label = action.payload.data;
      var {[label.id]: removedLabel, ...newLabelsById} = state.labelsById; // FIXME: This isn't working in removing the label.
      return {
        ...state,
        labelsById: newLabelsById,
        labelIdsByPhotoId: {
          ...state.labelIdsByPhotoId,
          [label.photo_id]: state.labelIdsByPhotoId[label.photo_id]
                .filter(id => id !== label.id)
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
