import React, { Component } from 'react';

import { connect } from "react-redux";

//import './User.scss';
import { parseQueryString } from './Utils.js';
import { 
  bodyweightActions,
  userProfileActions
} from './actions/Actions.js';

import './User.scss';

export class UserPage extends Component {
  render() {
    var queryParams = parseQueryString(this.props.location.search);
    console.log(queryParams);
    return (
      <main className='user-page-container'>
        <div className='background'></div>
        <UserProfile uid={queryParams['uid']} />
      </main>
    );
  }
}

class ConnectedUserProfile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      form: {}
    };
    props.fetchData();

    this.handleFormChange = this.handleFormChange.bind(this);
    this.handleSaveProfile = this.handleSaveProfile.bind(this);
    this.handleSaveGoals = this.handleSaveGoals.bind(this);
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
    let that = this;
    this.props.updateUser(user).then(
      function() {
        that.props.clearBodyweight();
      }
    );
  }
  handleSaveGoals(event) {
    event.preventDefault();
    let target_weight = this.state.form.target_weight;
    let target_calories = this.state.form.target_calories;
    let weight_goal = this.state.form.weight_goal;
    let user = {
      ...this.props.userInfo,
      target_weight, target_calories, weight_goal
    };
    this.props.updateUser(user);
  }
  render() {
    if (!this.props.userInfo) {
      return null;
    }
    return (
      <div>
        <h2>Account Settings</h2>
        <h3>Profile</h3>
        <form>
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
            <select name='prefered_units' value={this.state.form.prefered_units} onChange={this.handleFormChange}>
              <option value='lbs'>Imperial (lbs)</option>
              <option value='kg'>Metric (kg)</option>
            </select>
          </label>
          <button onClick={this.handleSaveProfile}>Save</button>
        </form>
        <h3>Goals</h3>
        <form>
          <label>
            <span>Bodyweight goal</span>
            <select name='bodyweight_goal' value={this.state.form.bodyweight_goal} onChange={this.handleFormChange}>
              <option value='gain'>Gain weight</option>
              <option value='lose'>Lose weight</option>
              <option value='maintain'>Maintain</option>
              <option value='none'>None</option>
            </select>
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
        <h3>Change Password</h3>
        <form>
          <label>
            <span>Current password</span>
            <input type='password' name='current_pass' />
          </label>
          <label>
            <span>New password</span>
            <input type='password' name='new_pass' />
          </label>
          <label>
            <span>Reenter New password</span>
            <input type='password' name='new_pass2' />
          </label>
          <button>Save</button>
        </form>
      </div>
    );
  }
}
const UserProfile = connect(
  function(state, ownProps) {
    var uid = ownProps.uid || state.loggedInAs;
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
