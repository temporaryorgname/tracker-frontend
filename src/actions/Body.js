import axios from 'axios';

import { 
  REQUEST_BODYWEIGHT,
  RECEIVE_BODYWEIGHT
} from "../constants/action-types";

export const requestBodyweight = function(date){
  return {
    type: REQUEST_BODYWEIGHT,
    payload: {date: date}
  }
}

export const fetchBodyweight = function(){
  return function(dispatch) {
    dispatch(requestBodyweight());
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight", 
      {withCredentials: true}
    ).then(function(response){
      dispatch(receiveBodyweight(response.data));
    });
  }
}

export const receiveBodyweight = function(data){
  return { 
    type: RECEIVE_BODYWEIGHT,
    payload: {
      data: data
    }
  };
}

export const createBodyweight = function(weight) {
  return function(dispatch) {
    var now = new Date();
    var nowString = now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate(); // Need to rebuild it to get rid of time zone funniness
    var payload = {
      date: nowString,
      time: now.toLocaleTimeString(),
      bodyweight: weight
    }
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight",
      payload,
      {withCredentials: true}
    ).then(function(response){
      dispatch(fetchBodyweight());
      return response;
    });
  }
}

export const deleteBodyweight = function(id){
  return function(dispatch) {
    return axios.delete(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight/"+id,
      {withCredentials: true}
    ).then(function(response){
      dispatch(fetchBodyweight());
    });
  }
}
