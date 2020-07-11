import React, { Component } from 'react';

import { connect } from "react-redux";

import axios from 'axios';

//import './User.scss';
import {
  parseQueryString
} from './Utils.js';
import { 
  bodyweightActions,
  userProfileActions
} from './actions/Actions.js';
import {
  DropdownMenu
} from './Common.js';

import './User.scss';

class ConnectedUserPage extends Component {
  constructor(props) {
    super(props);
    var queryParams = parseQueryString(this.props.location.search);
    if (!queryParams['uid']) {
      queryParams['uid'] = this.props.uid;
    }
    this.state = {
      params: queryParams
    };
  }
  render() {
    return (
      <main className='user-page-container'>
        <UserProfile uid={this.state.params['uid']} />
      </main>
    );
  }
}
export const UserPage = connect(
  function(state, ownProps) {
    return {
      uid: state.session.uid
    }
  },
  function(dispatch, ownProps) {
    return {};
  }
)(ConnectedUserPage);

class ConnectedUserProfile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      form: {},
      profileSuccessMessage: null,
      profileErrorMessage: null,
      goalSuccessMessage: null,
      goalErrorMessage: null
    };
    props.fetchData();

    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleSaveProfile = this.handleSaveProfile.bind(this);
    this.handleSaveGoals = this.handleSaveGoals.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.userInfo !== prevProps.userInfo && this.props.userInfo) {
      this.setState({
        form: {
          ...this.props.userInfo
        }
      });
    }
  }
  handleFormChange(event) {
    this.setState({
      form: {
        ...this.state.form,
        [event.target.name]: event.target.value
      }
    });
  }
  handleSaveProfile(event) {
    event.preventDefault();
    let display_name = this.state.form.display_name;
    let country = this.state.form.country;
    let prefered_units = this.state.form.prefered_units;
    if (display_name && display_name.length === 0) {
      display_name = null;
    }
    if (country && country.length === 0) {
      country = null;
    }
    let user = {
      ...this.props.userInfo,
      display_name, country, prefered_units
    };
    this.setState({
      profileSuccessMessage: null,
      profileErrorMessage: null
    });
    let that = this;
    this.props.updateUser(user).then(function(response) {
      that.props.clearBodyweight();
      that.setState({
        profileSuccessMessage: response.data.message,
        profileErrorMessage: null
      });
    }).catch(function(error){
      that.setState({
        profileSuccessMessage: null,
        profileErrorMessage: error.response.data.error
      });
    });
  }
  handleSaveGoals(event) {
    event.preventDefault();
    let target_weight = this.state.form.target_weight || '';
    if (target_weight.length === 0) {
      target_weight = null;
    }
    let target_calories = this.state.form.target_calories || '';
    if (target_calories.length === 0) {
      target_calories = null;
    }
    let weight_goal = this.state.form.weight_goal;
    let user = {
      ...this.props.userInfo,
      target_weight, target_calories, weight_goal
    };
    this.setState({
      goalSuccessMessage: null,
      goalErrorMessage: null
    });
    let that = this;
    this.props.updateUser(user).then(function(response){
      that.setState({
        goalSuccessMessage: response.data.message,
        goalErrorMessage: null
      });
    }).catch(function(error){
      that.setState({
        goalSuccessMessage: null,
        goalErrorMessage: error.response.data.error
      });
    });
  }
  handleChangePassword(event) {
    event.preventDefault();
    if (this.state.new_pass !== this.state.new_pass2) {
      this.setState({
        passSuccessMessage: null,
        passErrorMessage: 'Passwords do not match.'
      });
      return;
    }
    let data = {
      password: this.state.form.current_pass,
      new_password: this.state.form.new_pass
    };
    console.log(data);
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/users/change_password",
      data,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    ).then(response => {
      this.setState({
        passSuccessMessage: 'Password changed successfully.',
        passErrorMessage: null,
        form: {
          ...this.state.form,
          current_pass: '',
          new_pass: '',
          new_pass2: ''
        }
      });
    }).catch(error => {
      this.setState({
        passSuccessMessage: null,
        passErrorMessage: error.response.data.error
      });
    });
  }
  render() {
    let form = (
      <>
        <div className='card col-12'>
        <h3>Profile</h3>
        <form>
          <div className='success-message'>
            {this.state.profileSuccessMessage}
          </div>
          <div className='error-message'>
            {this.state.profileErrorMessage}
          </div>
          <label>
            <span>Display Name</span>
            <input type='text' name='display_name' value={this.state.form.display_name || ''} onChange={this.handleFormChange}/>
          </label>
          <label>
            <span>Country</span>
            <input type='text' name='country' value={this.state.form.country || ''} onChange={this.handleFormChange}/>
          </label>
          <label>
            <span>Prefered Units</span>
            <DropdownMenu value={this.state.form.prefered_units}
              options={{
                lbs: 'Imperial (lbs)',
                kgs: 'Metric (kgs)'}}
              onChange={x=>this.setState(
                {form: {...this.state.form,prefered_units: x}})} />
          </label>
          <button onClick={this.handleSaveProfile}>Save</button>
        </form>
        </div>
        <div className='card col-12'>
        <h3>Goals</h3>
        <form>
          <div className='success-message'>
            {this.state.goalSuccessMessage}
          </div>
          <div className='error-message'>
            {this.state.goalErrorMessage}
          </div>
          <label>
            <span>Bodyweight goal</span>
            <DropdownMenu value={this.state.form.weight_goal}
              options={{
                none: 'None',
                gain: 'Gain weight',
                lose: 'Lose weight',
                maintain: 'Maintain'}}
              onChange={x=>this.setState(
                {form: {...this.state.form,weight_goal: x}})} />
          </label>
          <label>
            <span>Target weight</span>
            <input type='text' name='target_weight' value={this.state.form.target_weight || ''} onChange={this.handleFormChange} />
          </label>
          <label>
            <span>Target Calories</span>
            <input type='text' name='target_calories' value={this.state.form.target_calories || ''} onChange={this.handleFormChange} />
          </label>
          <button onClick={this.handleSaveGoals}>Save</button>
        </form>
        </div>
        <div className='card col-12'>
        <h3>Change Password</h3>
        <form>
          <div className='success-message'>
            {this.state.passSuccessMessage}
          </div>
          <div className='error-message'>
            {this.state.passErrorMessage}
          </div>
          <label>
            <span>Current password</span>
            <input type='password' name='current_pass'
              value={this.state.form.current_pass || ''}
              onChange={this.handleFormChange}/>
          </label>
          <label>
            <span>New password</span>
            <input type='password' name='new_pass'
              value={this.state.form.new_pass || ''}
              onChange={this.handleFormChange}/>
          </label>
          <label>
            <span>Reenter New password</span>
            <input type='password' name='new_pass2'
              value={this.state.form.new_pass2 || ''}
              onChange={this.handleFormChange}/>
          </label>
          <button onClick={this.handleChangePassword}>Save</button>
        </form>
        </div>
      </>
    );
    let loadingStatus = (
      <div>LOADING...</div>
    );
    if (this.props.userInfo) {
      loadingStatus = null;
    }
    return (
      <>
        { loadingStatus || form }
      </>
    );
  }
}
const UserProfile = connect(
  function(state, ownProps) {
    let uid = ownProps.uid || state.loggedInAs;
    if (!uid) {
      return {};
    }
    var userInfo = state.userProfiles.entities[uid];
    if (!userInfo) {
      return {};
    } else {
      return {
        userInfo
      };
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchData: () => dispatch(userProfileActions['fetchSingle'](ownProps.uid)),
      updateUser: (user) => dispatch(userProfileActions['updateNow'](user)),
      clearBodyweight: () => dispatch(bodyweightActions['clear']())
    };
  }
)(ConnectedUserProfile);
