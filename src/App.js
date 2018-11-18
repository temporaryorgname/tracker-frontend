import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import { Alert } from 'reactstrap';
import axios from 'axios';
import './App.css';

import { DietPage } from './Diet.js'
import { BodyStatsPage } from './Body.js'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedIn: false
    };
    this.updateLoggedInStatus = this.updateLoggedInStatus.bind(this);
    this.updateLoggedInStatus();
  }
  updateLoggedInStatus() {
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/auth/current_session", {withCredentials: true})
        .then(function(response){
          if (response.data !== 'None') {
            that.setState({loggedIn: true});
          } else {
            that.setState({loggedIn: false});
          }
        });
  }
  render() {
    if (this.state.loggedIn) {
      return (
        <Router>
          <div className="App container-fluid">
            <Navigation loggedIn={this.state.loggedIn}/>
            <Switch>
              <Route path="/food" component={DietPage} />
              <Route path="/body" component={BodyStatsPage} />
              <Route path="/logout" render={(props) => <Logout onLogout={this.updateLoggedInStatus} {...props} />}/>
              <Route render={(props) => <ErrorPage404 />}/>
            </Switch>
          </div>
        </Router>
      );
    } else {
      return (
        <Router>
          <div className="App container-fluid">
            <Navigation loggedIn={this.state.loggedIn}/>
            <Switch>
              <Route path="/login" render={(props) => <Login onLogin={this.updateLoggedInStatus} {...props} />}/>
              <Route path="/signup" render={(props) => <Signup onSignup={this.updateLoggedInStatus} {...props} />}/>
              <Route render={(props) => <ErrorPage404 />}/>
            </Switch>
          </div>
        </Router>
      );
    }
  }
}

class Navigation extends Component {
  render() {
    if (this.props.loggedIn) {
      return (
        <ul className="nav">
          <li className="nav-item">
            <Link className="nav-link" to="food">Diet</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="workout">Workouts</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="body">Body Stats</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="logout">Logout</Link>
          </li>
        </ul>
      );
    } else {
      return (
        <ul className="nav">
          <li className="nav-item">
            <Link className="nav-link" to="login">Login</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="signup">Sign Up</Link>
          </li>
        </ul>
      );
    }
  }
}

class Logout extends Component {
  constructor(props) {
    super(props);
    this.logout = this.logout.bind(this);
  }
  logout() {
    var that = this;
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/auth/logout", this.state, {withCredentials: true})
        .then(function(response){
          that.props.onLogout(response);
          that.props.history.push('/login');
        });
  }
  componentWillMount() {
    this.logout();
  }
  render() {
    return (
      <div>Logging out...</div>
    );
  }
}

class Login extends Component {
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
    this.setState({ loggingIn: true, errors: [] });
    var that = this;
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/auth/login", this.state, {withCredentials: true})
        .then(function(response){
          that.setState({ loggingIn: false });
          that.onLogin(response);
          that.props.history.push('/food');
        })
        .catch(function(error){
          that.setState({
            loggingIn: false,
            errors: ["Login failure. Try again."]
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
      <form onSubmit={this.login}>
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
          <label>E-mail: </label>
          <input className='form-control' type='text' name='email' onChange={this.handleFormChange}/>
        </div>
        <div className="form-group">
          <label>Password: </label>
          <input className='form-control' type='password' name='password' onChange={this.handleFormChange}/>
        </div>
        <input className='btn btn-primary' type='submit' value={this.state.loggingIn ? 'Logging in...' : 'Login'} />
      </form>
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

