import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import axios from 'axios';
import './App.scss';

import { connect } from "react-redux";
import { login, logout, updateSession } from './actions/User.js';
import { userProfileActions, notify, unnotify } from './actions/Actions.js';

import { HomePage } from './Home.js'
import { DietPage } from './Diet.js'
import { BodyStatsPage } from './Body.js'
import { UserPage } from './User.js'
import { DataPage, TagsPage } from './Data.js'

class ConnectedApp extends Component {
  constructor(props) {
    super(props);
    props.fetchSession();
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.uid !== prevProps.uid) {
      this.props.fetchUserProfile(this.props.uid);
    }
  }
  render() {
    if (this.props.loggedIn) {
      return (
        <Router>
          <div className="App container-fluid">
            <NavigationBar loggedIn={this.props.loggedIn}
                uid={this.props.uid}
                logout={this.props.logout}/>
            <Switch>
              <Route path="/food" component={DietPage} />
              <Route path="/body" component={BodyStatsPage} />
              <Route path="/user" component={UserPage} />
              <Route path="/data" component={DataPage} />
              <Route path="/tags" component={TagsPage} />
              <Route path="/" component={HomePage} />
              <Route render={() => <ErrorPage404 />}/>
            </Switch>
            <NotificationContainer />
          </div>
        </Router>
      );
    } else {
      return (
        <Router>
          <div className="App container-fluid">
            <NavigationBar loggedIn={this.props.loggedIn}/>
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/signup" component={SignupPage} />
              <Route component={LoginPage} />
            </Switch>
            <NotificationContainer />
          </div>
        </Router>
      );
    }
  }
}
const App = connect(
  function(state, ownProps) {
    if (state.session.uid) {
      return {
        loggedIn: true,
        uid: state.session.uid
      };
    }
    return {
      loggedIn: false
    };
  },
  function(dispatch, ownProps) {
    return {
      logout: () => dispatch(logout()),
      fetchSession: () => dispatch(updateSession()),
      fetchUserProfile: (id) => dispatch(userProfileActions['fetchSingle'](id))
    }
  }
)(ConnectedApp);

class NavigationBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      menuVisibile: false
    }
    this.toggleMenu = this.toggleMenu.bind(this);
  }
  toggleMenu() {
    this.setState({
      menuVisibile: !this.state.menuVisibile
    });
  }
  render() {
    let navClasses = ['nav'];
    if (!this.state.menuVisibile) {
      navClasses.push('hide-mobile');
    }
    navClasses = navClasses.join(' ');
    if (this.props.loggedIn) {
      return (
        <nav>
          <div className='toggle-menu' onClick={this.toggleMenu}>
            <i className='material-icons'>menu</i>
          </div>
          <div className='home'>
            <Link to="/"><i className='material-icons'>home</i></Link>
          </div>
          <div className='user'>
            <Link to={"/user?uid="+this.props.uid}><i className='material-icons'>account_circle</i></Link>
          </div>
          <ul className={navClasses} onClick={this.toggleMenu}>
            <Link to={"/food/table?uid="+this.props.uid}><li>Diet</li></Link>
            <Link to={"/food/photos?uid="+this.props.uid}><li>Photos</li></Link>
            <Link to={"/body?uid="+this.props.uid}><li>Body Stats</li></Link>
            <Link to="#" onClick={(e) => {e.preventDefault(); this.props.logout();}}><li>Logout</li></Link>
          </ul>
        </nav>
      );
    } else {
      return (
        <nav>
          <div className='toggle-menu' onClick={this.toggleMenu}>
            <i className='material-icons'>menu</i>
          </div>
          <ul className={navClasses} onClick={this.toggleMenu}>
            <Link className="nav-link" to="/login"><li>Login</li></Link>
            <Link className="nav-link" to="/signup"><li>Sign Up</li></Link>
          </ul>
        </nav>
      );
    }
  }
}

class ConnectedLoginPrompt extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      rememberMe: false
    };
    this.onLogin = props['onLogin'];
    this.login = this.login.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.toggleRememberMe = this.toggleRememberMe.bind(this);
  }
  login(e) {
    e.preventDefault(); // Prevent the form from routing the user elsewhere
    let that = this;
    this.props.login(
      this.state.email,
      this.state.password,
      this.state.rememberMe)
    .then(function(){
      if (that.props.onLogin) {
        that.props.onLogin();
      }
    });
  }
  handleFormChange(e) {
    var x = {}
    x[e.target.name] = e.target.value;
    this.setState(x);
  }
  toggleRememberMe() {
    this.setState({
      rememberMe: !this.state.rememberMe
    });
  }
  render() {
    if (this.props.uid) {
      this.props.history.push('/');
      return (
        <div className='login-container'>
        <h2>Login</h2>
        <div>
          Already logged in.
        </div>
        </div>
      );
    }
    return (
      <div className='login-container'>
      <h2>Login</h2>
      <form onSubmit={this.login}>
        <div className="error-message">
          {this.props.error}
        </div>
        <div>
          <input type='text' name='email' placeholder='E-mail' value={this.state.email} onChange={this.handleFormChange}/>
        </div>
        <div>
          <input type='password' name='password' placeholder='Password' value={this.state.password} onChange={this.handleFormChange}/>
        </div>
        <div>
          <input type='checkbox' name='rememberMe' checked={this.state.rememberMe} onChange={this.toggleRememberMe}/> Remember me
        </div>
        <input type='submit' value={this.props.loggingIn ? 'Logging in...' : 'Login'} />
      </form>
      </div>
    );
  }
}
const LoginPrompt = connect(
  function(state, ownProps) {
    if (state.session.loggingIn) {
      return {
        loggingIn: true
      };
    }
    if (state.session.error) {
      return {
        error: state.session.error
      };
    }
    if (state.session.uid) {
      return {
        uid: state.session.uid
      };
    }
    return {};
  },
  function(dispatch, ownProps) {
    return {
      login: (email, password, remember) => dispatch(login(email, password, remember))
    };
  }
)(ConnectedLoginPrompt);

class ConnectedLoginPage extends Component {
  constructor(props) {
    super(props);
    this.handleLogin = this.handleLogin.bind(this);
  }
  handleLogin() {
    this.props.history.push('/');
    this.props.fetchSession();
  }
  render() {
    return (
      <main>
        <div className='background'></div>
        <LoginPrompt onLogin={this.handleLogin}/>
      </main>
    );
  }
}
const LoginPage = connect(
  function(state, ownProps) {
    return {};
  },
  function(dispatch, ownProps) {
    return {
      fetchSession: () => dispatch(updateSession())
    }
  }
)(ConnectedLoginPage);

class Signup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      email: '',
      password: '',
      password2: '',
      signingUp: false,
      errors: []
    };
    this.onSignup = props['onSignup'];
    this.signup = this.signup.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }
  signup(e) {
    e.preventDefault(); // Prevent the form from routing the user elsewhere
    this.setState({ signingUp: true, errors: [] });
    if (this.state.password !== this.state.password2) {
      this.setState({ signingUp: false, errors: ["Passwords do not match"] });
      return;
    }
    if (this.state.password.length < 4) {
      this.setState({ signingUp: false, errors: ["Password must be at least 4 characters long."] });
      return;
    }
    var that = this;
    axios.post(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/users",
      this.state,
      {withCredentials: true}
    ).then(function(response){
      that.setState({ signingUp: false, errors: [] });
      if (that.onSignup) {
        that.onSignup();
      }
    }).catch(function(error){
      console.log(error);
      that.setState({
        signingUp: false,
        errors: ["Signup failure. Try again."]
      });
    });
  }
  handleFormChange(e) {
    var x = {}
    x[e.target.name] = e.target.value;
    this.setState(x);
  }
  render() {
    return (
      <div className='signup-container'>
      <h2>Sign Up</h2>
      <form onSubmit={this.signup}>
        {
          this.state.errors.map(function(error){
            return (
              <div className="error-message">
                {error}
              </div>
            );
          })
        }
        <div className="form-group">
          <label>Display Name: </label>
          <input className='form-control' type='text' name='name' onChange={this.handleFormChange}/>
        </div>
        <div className="form-group">
          <label>E-mail: </label>
          <input className='form-control' type='text' name='email' onChange={this.handleFormChange}/>
        </div>
        <div className="form-group">
          <label>Password: </label>
          <input className='form-control' type='password' name='password' onChange={this.handleFormChange}/>
        </div>
        <div className="form-group">
          <label>Retype Password: </label>
          <input className='form-control' type='password' name='password2' onChange={this.handleFormChange}/>
        </div>
        <input className='btn btn-primary' type='submit' value={this.state.signingUp ? 'Signing up...' : 'Sign Up'} />
      </form>
      </div>
    );
  }
}

class ConnectedSignupPage extends Component {
  constructor(props) {
    super(props);
    this.handleSuccessfulSignup = this.handleSuccessfulSignup.bind(this);
  }
  handleSuccessfulSignup() {
    this.props.fetchSession();
    this.props.history.push('/');
  }
  render() {
    return (
      <main>
        <div className='background'></div>
        <Signup onSignup={this.handleSuccessfulSignup}/>
      </main>
    );
  }
}
const SignupPage = connect(
  function(state, ownProps) {
    return {};
  },
  function(dispatch, ownProps) {
    return {
      fetchSession: () => dispatch(updateSession())
    }
  }
)(ConnectedSignupPage);

class ErrorPage404 extends Component {
  render() {
    return (
      <div>
        404 - Page not found.
      </div>
    );
  }
}

class ConnectedNotificationContainer extends Component {
  render() {
    let that = this;
    let notifications = this.props.notifications.map(function(n,i){
      return (
        <div className='notification' key={i} onClick={()=>that.props.unnotify(n)}>
          {n.content}
        </div>
      );
    });
    if (notifications.length > 0) {
      return (
        <div className='notification-container'>
          {notifications}
        </div>
      );
    } else {
      return null;
    }
  }
}
const NotificationContainer = connect(
  function(state, ownProps) {
    return {
      notifications: state.notifications || []
    };
  },
  function(dispatch, ownProps) {
    return {
      unnotify: x => dispatch(unnotify(x))
    }
  }
)(ConnectedNotificationContainer);

export default App;
