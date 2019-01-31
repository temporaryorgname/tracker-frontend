import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import axios from 'axios';
import './App.scss';

import { connect } from "react-redux";
import { login, logout, updateSession } from './actions/User.js';

import { HomePage } from './Home.js'
import { DietPage } from './Diet.js'
import { BodyStatsPage } from './Body.js'
import { UserPage } from './User.js'
import { DataPage, TagsPage } from './Data.js'

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
              <Route path="/data" component={DataPage} />
              <Route path="/tags" component={TagsPage} />
              <Route path="/" component={HomePage} />
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
              <Route path="/login" component={LoginPage} />
              <Route path="/signup" component={SignupPage} />
              <Route component={LoginPage} />
            </Switch>
          </div>
        </Router>
      );
    }
  }
}
const App = connect(
  function(state, ownProps) {
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
          <div className='home'>
            <Link to="/"><i className='material-icons'>home</i></Link>
          </div>
          <ul className="nav">
            <li>
              <Link to={"/food/table?uid="+this.props.uid}>Diet</Link>
            </li>
            <li>
              <Link to="/workout">Workouts</Link>
            </li>
            <li>
              <Link to={"/body?uid="+this.props.uid}>Body Stats</Link>
            </li>
            <li>
              <Link to="#" onClick={(e) => {e.preventDefault(); this.props.logout();}}>Logout</Link>
            </li>
          </ul>
          <div className='user'>
            <Link to="/user"><i className='material-icons'>account_circle</i></Link>
          </div>
        </nav>
      );
    } else {
      return (
        <nav>
        <ul className="nav">
          <li className="nav-item">
            <Link className="nav-link" to="/login">Login</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/signup">Sign Up</Link>
          </li>
        </ul>
        </nav>
      );
    }
  }
}
const Navigation = connect(
  function(state, ownProps) {
    return {
      uid: state.user.session.uid
    };
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
      rememberMe: false
    };
    this.onLogin = props['onLogin'];
    this.login = this.login.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
    this.toggleRememberMe = this.toggleRememberMe.bind(this);
  }
  login(e) {
    e.preventDefault(); // Prevent the form from routing the user elsewhere
    this.props.login(
      this.state.email,
      this.state.password,
      this.state.rememberMe);
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
    return {};
  },
  function(dispatch, ownProps) {
    return {
      login: (email, password, remember) => dispatch(login(email, password, remember))
    };
  }
)(ConnectedLoginPrompt);

class LoginPage extends Component {
  render() {
    return (
      <main>
        <div className='background'></div>
        <LoginPrompt />
      </main>
    );
  }
}

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
      that.props.history.push('/food');
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

class SignupPage extends Component {
  render() {
    return (
      <main>
        <div className='background'></div>
        <Signup />
      </main>
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

export default App;

