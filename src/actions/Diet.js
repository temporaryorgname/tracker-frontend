import axios from 'axios';

import { 
  REQUEST_FOOD,
  RECEIVE_FOOD
} from "../constants/action-types";

export const requestFood = function(date){
  return {
    type: REQUEST_FOOD,
    payload: {date: date}
  }
}

export const fetchFood = function(date){
  return function(dispatch) {
    dispatch(requestFood(date));
    return axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food",
      {
        params: {date: date}, 
        withCredentials: true
      }
    ).then(function(response){
      dispatch(receiveFood(date, response.data));
    });
  }
}

export const receiveFood = function(date, data){
  return { 
    type: RECEIVE_FOOD,
    payload: {
      date: date,
      data: data
    }
  };
}

export const createFood = function(data){
  return function(dispatch) {
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food",
      data,
      {withCredentials: true}
    ).then(function(response){
      dispatch(fetchFood(data.date))
    });
  }
}

export const updateFood = function(id, data){
  return {
    type: 'UPDATE_FOOD',
    payload: {
      id: id,
      data: data
    }
  }
}

export const deleteFood = function(ids){
  return function(dispatch) {
    return axios.delete(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food",
      {data: {id: ids}, withCredentials: true}
    );
  }
}
