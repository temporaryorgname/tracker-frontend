import React, { Component, useState } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import axios from 'axios';
import './App.scss';

import { connect, useDispatch } from "react-redux";
import { login, logout, updateSession } from './actions/User.js';
import { userProfileActions, notify, unnotify } from './actions/Actions.js';

import { ConnectedOverviewPage } from './Home.js'
import { ConnectedDietPage } from './Diet.js'
import { BodyStatsPage } from './Body.js'
import { UserPage } from './User.js'
import { DataPage, TagsPage } from './Data.js'
import { PhotosPage } from './Photos.js'

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
    let {
      loggedIn,
      uid,
      logout
    } = this.props;
		let loggedInRoutes = [
			{
				route: '/food',
				component: ConnectedDietPage,
				title: 'Diet Log'
			},{
				route: '/photos',
				component: PhotosPage,
				title: 'Photos'
			},{
				route: '/body',
				component: BodyStatsPage,
				title: 'Body Stats'
			},{
				route: '/user',
				component: UserPage,
				title: 'User Profile'
			},{
				route: '/data',
				component: DataPage
			},{
				route: '/tags',
				component: TagsPage
			},{
				route: '/logout',
				component: LogoutPage
			},{
				route: '/',
				component: ConnectedOverviewPage,
				title: 'Overview'
			}
		];
		let loggedOutRoutes = [
			{
				route: '/login',
				component: LoginPage,
				title: 'Log In'
			},{
				route: '/signup',
				component: SignupPage,
				title: 'Sign Up'
			},{
				route: '/',
				component: LoginPage,
				title: 'Log In'
			}
		];
		let routes = loggedIn ? loggedInRoutes : loggedOutRoutes;
		return (
			<Router>
				<div className="App">
					<Switch>
					{
						routes.map(function(route){
							return (<Route path={route.route} key={route.route}
								render={routeProps => <NavigationBar 
										loggedIn={loggedIn}
										uid={uid}
										logout={logout}
										title={route.title}
										route={route.route}
										{...routeProps} />} />);
						})
					}
					</Switch>
					<Switch>
						{
							routes.map(function(route){
								return <Route path={route.route} key={route.route}
										component={route.component} />
							})
						}
						<Route render={() => <ErrorPage404 />}/>
					</Switch>
					<NotificationContainer />
				</div>
			</Router>
		);
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

function NavigationBar(props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => setMenuVisible(!menuVisible);
  let {
    location = {},
    title = '',
    route,
    loggedIn,
    uid
  } = props;
  let path = location.pathname;

  // Class names
  let navClasses = ['nav'];
  if (!menuVisible) {
    //navClasses.push('hide-mobile');
    navClasses.push('closed');
  } else {
    navClasses.push('open');
  }
  navClasses = navClasses.join(' ');

  // Render
  let navLinks = null;
  if (loggedIn) {
    navLinks = (
      <ul className={navClasses} onClick={toggleMenu}>
        <Link to="/"><li>Overview</li></Link>
        <Link to={"/food?uid="+uid}><li>Diet</li></Link>
        <Link to={"/photos?uid="+uid}><li>Photos</li></Link>
        <Link to={"/body?uid="+uid}><li>Body Stats</li></Link>
        <Link to={"/user?uid="+uid}><li>User Profile</li></Link>
        <Link to={"/logout"}><li>Sign Out</li></Link>
      </ul>
    );
  } else {
    navLinks = (
      <ul className={navClasses} onClick={toggleMenu}>
        <Link className="nav-link" to="/login"><li>Login</li></Link>
        <Link className="nav-link" to="/signup"><li>Sign Up</li></Link>
      </ul>
    );
  }
  return (
    <nav>
      <span className='title'>{route ? <Link to={route}>{title}</Link> : title}</span>
      <div className='toggle-menu' onClick={toggleMenu}>
        <i className='material-icons'>menu</i>
      </div>
      {navLinks}
    </nav>
  );
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

function LoginPage(props) {
  const dispatch = useDispatch();
  const fetchSession = () => dispatch(updateSession());
  function handleLogin() {
    props.history.push('/');
    fetchSession();
  }
  return (
    <main>
      <div className='main-card col-12'>
        <div className='card'>
          <LoginPrompt onLogin={handleLogin}/>
        </div>
      </div>
    </main>
  );
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
          <label>
						<span>Display Name:</span>
						<input className='form-control' type='text' name='name' onChange={this.handleFormChange}/>
					</label>
        </div>
        <div className="form-group">
          <label>
						<span>E-mail:</span>
						<input className='form-control' type='text' name='email' onChange={this.handleFormChange}/>
					</label>
        </div>
        <div className="form-group">
          <label>
						<span>Password:</span>
						<input className='form-control' type='password' name='password' onChange={this.handleFormChange}/>
					</label>
        </div>
        <div className="form-group">
          <label>
						<span>Retype Password:</span>
						<input className='form-control' type='password' name='password2' onChange={this.handleFormChange}/>
					</label>
        </div>
        <input className='btn btn-primary' type='submit' value={this.state.signingUp ? 'Signing up...' : 'Sign Up'} />
      </form>
      </div>
    );
  }
}

function SignupPage(props) {
  const dispatch = useDispatch();
  const fetchSession = () => dispatch(updateSession());
  function handleSuccessfulSignup() {
    fetchSession();
    props.history.push('/');
  }
  return (
    <main>
      <div className='main-card col-12'>
        <div className='card'>
          <Signup onSignup={handleSuccessfulSignup}/>
        </div>
      </div>
    </main>
  );
}

function LogoutPage(props) {
  const dispatch = useDispatch();
  const logout = () => dispatch(logout());
	logout().then(() => {
		console.log('logged out');
	});
	return 'Logging out...';
}

function ErrorPage404(props) {
  return (
    <div>
      404 - Page not found.
    </div>
  );
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
export { App, NavigationBar };
