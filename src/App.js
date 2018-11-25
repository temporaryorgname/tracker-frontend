import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import { Alert } from 'reactstrap';
import axios from 'axios';
import './App.scss';

import { connect } from "react-redux";
import { login, logout, updateSession } from './actions/User.js';

import { DietPage } from './Diet.js'
import { BodyStatsPage } from './Body.js'
import { UserPage } from './User.js'

class ConnectedApp extends Component {
  constructor(props) {
    super(props);
    props.updateSession();
  }
  render() {
    if (this.props.loggedIn) {
      return (
        <Router>
          <div className="App container-fluid">
            <Navigation loggedIn={this.props.loggedIn}/>
            <Switch>
              <Route path="/food" component={DietPage} />
              <Route path="/body" component={BodyStatsPage} />
              <Route path="/user" component={UserPage} />
              <Route render={() => <ErrorPage404 />}/>
            </Switch>
          </div>
        </Router>
      );
    } else {
      return (
        <Router>
          <div className="App container-fluid">
            <Navigation loggedIn={this.props.loggedIn}/>
            <Switch>
              <Route path="/login" component={LoginPrompt} />
              <Route path="/signup" component={Signup} />
              <Route component={LoginPrompt} />
            </Switch>
          </div>
        </Router>
      );
    }
  }
}
const App = connect(
  function(state, ownProps) {
    console.log('App: '+state.user.session.uid);
    if (state.user.session.uid) {
      return {
        loggedIn: true
      };
    }
    return {
      loggedIn: false
    };
  },
  function(dispatch, ownProps) {
    return {
      updateSession: () => dispatch(updateSession())
    }
  }
)(ConnectedApp);

class ConnectedNavigation extends Component {
  render() {
    if (this.props.loggedIn) {
      return (
        <nav>
          <ul className="nav">
            <li>
              <Link to="food">Diet</Link>
            </li>
            <li>
              <Link to="workout">Workouts</Link>
            </li>
            <li>
              <Link to="body">Body Stats</Link>
            </li>
            <li>
              <Link to="#" onClick={(e) => {e.preventDefault(); this.props.logout();}}>Logout</Link>
            </li>
          </ul>
          <div className='user'>
            <Link to="user"><i className='material-icons'>account_circle</i></Link>
          </div>
        </nav>
      );
    } else {
      return (
        <nav>
        <ul className="nav">
          <li className="nav-item">
            <Link className="nav-link" to="login">Login</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="signup">Sign Up</Link>
          </li>
        </ul>
        </nav>
      );
    }
  }
}
const Navigation = connect(
  function(state, ownProps) {
    return {};
  },
  function(dispatch, ownProps) {
    return {
      logout: () => dispatch(logout())
    };
  }
)(ConnectedNavigation);

class ConnectedLoginPrompt extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      loggingIn: false,
      errors: []
    };
    this.onLogin = props['onLogin'];
    this.login = this.login.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }
  login(e) {
    e.preventDefault(); // Prevent the form from routing the user elsewhere
    this.props.login(this.state.email, this.state.password);
  }
  handleFormChange(e) {
    var x = {}
    x[e.target.name] = e.target.value;
    this.setState(x);
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
        {
          this.state.errors.map(function(error){
            return (
              <div className="error">
                {error}
              </div>
            );
          })
        }
        <div>
          <input type='text' name='email' placeholder='E-mail' onChange={this.handleFormChange}/>
        </div>
        <div>
          <input type='password' name='password' placeholder='Password' onChange={this.handleFormChange}/>
        </div>
        <input type='submit' value={this.props.loggingIn ? 'Logging in...' : 'Login'} />
      </form>
      </div>
    );
  }
}
const LoginPrompt = connect(
  function(state, ownProps) {
    if (state.user.session.loggingIn) {
      return {
        loggingIn: true
      };
    }
    if (state.user.session.error) {
      return {
        error: state.user.session.error
      };
    }
    if (state.user.session.uid) {
      return {
        uid: state.user.session.uid
      };
    }
  },
  function(dispatch, ownProps) {
    return {
      login: (email, password) => dispatch(login(email, password))
    };
  }
)(ConnectedLoginPrompt);

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
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/auth/signup", this.state, {withCredentials: true})
        .then(function(response){
          that.setState({ signingUp: false, errors: [] });
          that.onSignup(response);
        })
        .catch(function(error){
          that.setState({ signingUp: false, errors: ["Signup failure. Try again."] });
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
              <Alert color="danger">
                {error}
              </Alert>
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

class ErrorPage404 extends Component {
  render() {
    return (
      <div>
        404 - Page not found.
      </div>
    );
  }
}

class Modal extends Component {
  constructor(props) {
    super(props);
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }
  handleClickOutside(event) {
    if (event.target !== this.ref) {
      return;
    }
    this.props.toggle();
  }
  render() {
    var className = 'modal-background';
    if (this.props.isOpen) {
      className += ' visible';
    }
    console.log(className);
    return (
      <div className={className} onClick={this.handleClickOutside} ref={(x)=>(this.ref=x)}>
        <div className='modal'>
          <div className='close' onClick={this.props.toggle}><i className='material-icons'>close</i></div>
          {this.props.children}
        </div>
      </div>
    );
  }
}
class ModalHeader extends Component {
  render() {
    return (
      <div className='modal-header'>
        {this.props.children}
      </div>
    );
  }
}
class ModalBody extends Component {
  render() {
    return (
      <div className='modal-body'>
        {this.props.children}
      </div>
    );
  }
}
class ModalFooter extends Component {
  render() {
    return (
      <div className='modal-footer'>
        {this.props.children}
      </div>
    );
  }
}

export default App;
export { Modal, ModalHeader, ModalBody, ModalFooter };

