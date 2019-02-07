import axios from 'axios';

export const updateSession = function(email, password){
  return function(dispatch) {
    dispatch({
      type: 'UPDATE_SESSION_START'
    });
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/current_session",
      {withCredentials: true}
    ).then(function(response){
      dispatch({ 
        type: 'UPDATE_SESSION_SUCCESS',
        payload: response.data
      });
    }).catch(function(response){
      dispatch({ 
        type: 'UPDATE_SESSION_FAILURE',
        payload: response.error
      });
    });
  }
}

export const login = function(email, password, remember){
  return function(dispatch) {
    dispatch({type: 'LOGIN_START'});
    return axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/login",
      {email: email, password: password, permanent: remember},
      {withCredentials: true}
    ).then(function(response){
      dispatch({ 
        type: 'LOGIN_SUCCESS',
        payload: {id: response.data}
      });
      return response;
    }).catch(function(error){
      dispatch({ 
        type: 'LOGIN_FAILURE',
        payload: {error: "Login failure. Try again."}
      });
      return error;
    });
  }
}

export const logout = function(email, password){
  return function(dispatch) {
    dispatch({type: 'LOGOUT_START'});
    return axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/auth/logout",
      {withCredentials: true}
    ).then(function(response){
      dispatch({type: 'LOGOUT_SUCCESS'});
      return response;
    });
  }
}
