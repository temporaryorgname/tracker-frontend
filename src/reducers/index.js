import { combineReducers } from 'redux'

import { 
  RECEIVE_FOOD,
  REQUEST_BODYWEIGHT,
  RECEIVE_BODYWEIGHT
} from "../constants/action-types";

const initialFoodState = {
  entriesByDate: {}, // Key: date, data: array of food IDs
  entries: {}, // Key: id, data: array of entries
  dirtyEntries: new Set() // IDs of entries that were modified
};
function foodReducer(state = initialFoodState, action) {
  switch (action.type) {
    case RECEIVE_FOOD:
      var date = action.payload.date;
      var data = action.payload.data;
      var entryIds = [];
      var entries = {};
      data.forEach(function(x){
        entries[x.id] = x;
        entryIds.push(x.id);
      });
      return {...state,
        entriesByDate: {...state.entriesByDate, [date]: entryIds},
        entries: {...state.entries, ...entries}
      };
    case 'UPDATE_FOOD':
      console.log('UPDATE_FOOD');
      var id = action.payload.id;
      var data = action.payload.data;
      var dirtyEntriesCopy = new Set(state.dirtyEntries);
      dirtyEntriesCopy.add(id);
      return {...state,
        entries: {...state.entries, [id]: data},
        dirtyEntries: dirtyEntriesCopy
      };
    case 'UPDATE_FOOD_COMPLETED':
      var id = action.payload.id;
      var dirtyEntriesCopy = new Set(state.dirtyEntries);
      dirtyEntriesCopy.delete(id);
      return {...state,
        dirtyEntries: dirtyEntriesCopy
      };
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

const rootReducer = combineReducers({
  food: foodReducer,
  bodyweight: bodyweightReducer
});

export default rootReducer;
