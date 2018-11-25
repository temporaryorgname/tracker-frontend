import axios from 'axios';

import { 
  REQUEST_USER_PROFILE,
  RECEIVE_USER_PROFILE
} from "../constants/action-types";

export const updateSessionStart = function() {
  return {
    type: 'UPDATE_SESSION_START'
  };
}
export const updateSession = function(email, password){
  return function(dispatch) {
    console.log('Updating session.');
    dispatch(loginStart());
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/current_session",
      {withCredentials: true}
    ).then(function(response){
      dispatch(updateSessionCompleted(response.data));
    });
  }
}
export const updateSessionCompleted = function(data){
  return { 
    type: 'UPDATE_SESSION_COMPLETED',
    payload: data
  };
}

export const loginStart = function() {
  return {
    type: 'LOGIN_START'
  };
}
export const login = function(email, password, remember){
  return function(dispatch) {
    dispatch(loginStart());
    console.log(remember);
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/login",
      {email: email, password: password, permanent: remember},
      {withCredentials: true}
    ).then(function(response){
      dispatch(loginCompleted({id: response.data}));
    }).catch(function(error){
      dispatch(loginCompleted({error: "Login failure. Try again."}));
    });
  }
}
export const loginCompleted = function(data){
  return { 
    type: 'LOGIN_COMPLETED',
    payload: data
  };
}

export const logoutStart = function() {
  return {
    type: 'LOGOUT_START'
  };
}
export const logout = function(email, password){
  return function(dispatch) {
    console.log('Logging out.');
    dispatch(logoutStart());
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/logout",
      {withCredentials: true}
    ).then(function(response){
      dispatch(logoutCompleted());
    });
  }
}
export const logoutCompleted = function(){
  return { 
    type: 'LOGOUT_COMPLETED'
  };
}

export const requestUserProfile = function(userId){
  return {
    type: REQUEST_USER_PROFILE,
    payload: {userId: userId}
  }
}
export const fetchUserProfile = function(userId){
  return function(dispatch) {
    console.log('Fetching user profile '+userId);
    dispatch(requestUserProfile(userId));
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/user/"+userId, 
      {withCredentials: true}
    ).then(function(response){
      console.log('User profile received or UID '+userId);
      console.log(response.data);
      dispatch(receiveUserProfile(response.data));
    }).catch(function(error){
      console.error('Unable to fetch user profile.');
      console.error(error);
    });
  }
}
export const receiveUserProfile = function(data){
  return { 
    type: RECEIVE_USER_PROFILE,
    payload: {
      data: data
    }
  };
}

