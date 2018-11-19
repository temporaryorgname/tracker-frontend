import axios from 'axios';

import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from 'redux-thunk'

import rootReducer from "../reducers/index";

const store = createStore(
  rootReducer,
  applyMiddleware(
    thunkMiddleware
  )
);

var updateTimeout = null;
var lastDirtyEntries = new Set();
store.subscribe(function(){
  var currentDirtyEntries = store.getState().food.dirtyEntries;
  if (lastDirtyEntries.size === currentDirtyEntries.size) {
    var same = Array.from(lastDirtyEntries)
      .map((x) => currentDirtyEntries.has(x))
      .reduce((a,b) => a && b, true);
    if (same) {
      return;
    }
  }
  clearTimeout(updateTimeout);
  lastDirtyEntries = new Set(currentDirtyEntries);
  if (currentDirtyEntries.size === 0) {
    return;
  }
  updateTimeout = setTimeout(
    function() { // Update one at a time
      var id = lastDirtyEntries.values().next().value;
      var data = store.getState().food.entries[id];
      axios.post(
        process.env.REACT_APP_SERVER_ADDRESS+"/data/food/"+id,
        data,
        {withCredentials: true}
      ).then(function(response){
        store.dispatch({
          type: 'UPDATE_FOOD_COMPLETED',
          payload: {
            id: id
          }
        });
      });
    }, 500
  );
});

export default store;
