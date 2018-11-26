import axios from 'axios';

import { 
  REQUEST_USER_PROFILE,
  RECEIVE_USER_PROFILE
} from "../constants/action-types";

export const fetchPhotoIdsStart = function(userId){
  return {
    type: 'FETCH_PHOTO_IDS_START',
    payload: {userId: userId}
  }
}
export const fetchPhotoIds = function(userId){
  return function(dispatch) {
    dispatch(fetchPhotoIdsStart(userId));
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/by_user/"+userId, 
      {withCredentials: true}
    ).then(function(response){
      console.log(response.data);
      dispatch(fetchPhotoIdsCompleted(response.data));
    }).catch(function(error){
      console.error('Unable to fetch user\'s photo IDs.');
      console.error(error);
    });
  }
}
export const fetchPhotoIdsCompleted = function(data){
  return { 
    type: 'FETCH_PHOTO_IDS_COMPLETED',
    payload: {
      data: data
    }
  };
}
