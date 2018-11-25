import React, { Component } from 'react';

import { connect } from "react-redux";

//import './User.scss';
import { parseQueryString } from './Utils.js';
import { fetchUserProfile } from './actions/User.js';

export class UserPage extends Component {
  render() {
    var queryParams = parseQueryString(this.props.location.search);
    console.log(queryParams);
    return (
      <UserProfile uid={queryParams['uid']} />
    );
  }
}

class ConnectedUserProfile extends Component {
  constructor(props) {
    super(props);
    props.updateData();
  }
  render() {
    return (
      <div>
        <h2>Hi~</h2>
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
    var userInfo = state.user.profiles[uid];
    if (!userInfo) {
      return {};
    } else {
      return {
        name: userInfo.name,
        email: userInfo.email
      };
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchUserProfile(ownProps.uid)),
    };
  }
)(ConnectedUserProfile);

