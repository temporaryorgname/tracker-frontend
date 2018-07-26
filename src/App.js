import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, FormText, Alert } from 'reactstrap';
import axios from 'axios';
import './App.css';

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
          if (response.data != 'None') {
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
    if (this.state.password != this.state.password2) {
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

class FileUploadDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
    }
    this.ref = React.createRef();
    this.toggle = this.toggle.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.onUpload = props.onUpload;
  }
  uploadFile(event) {
    var target = event.target;
    var formData = new FormData();
    var that = this;
    formData.append("file", target.files[0]);
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo", formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
        }).then(function(response){
          target.value = "";
          that.onUpload(that.props.files.concat([response.data.id]));
        });
  }
  toggle() {
    this.setState({
      modal: !this.state.modal
    });
  }
  render() {
    return (
      <div>
        <Link to='#' onClick={this.toggle}>
          <i className="material-icons">add_a_photo</i>
        </Link>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className="modal-sm">
          <ModalHeader toggle={this.toggle}>Upload Photo</ModalHeader>
          <ModalBody>
            <div>
              {
                this.props.files.map(function(file){
                  return <FoodPhotoThumbnail key={file} fileid={file}/>
                })
              }
            </div>
            <FormGroup>
              <Label for="file"></Label>
              <Input type="file" name="file" onChange={this.uploadFile}/>
              <FormText color="muted">
                Select a photo to include with your entry.
              </FormText>
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.toggle}>Done</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

class DietPage extends Component {
  constructor(props) {
    super(props)
    var now = new Date();
    var nowString = now.getFullYear()+"-"+now.getMonth()+"-"+now.getDate(); // Need to rebuild it to get rid of time zone funniness
    this.state = {
      date: new Date(nowString).toISOString().substr(0,10),
    }
    this.handleDateChange = this.handleDateChange.bind(this);
  }
  handleDateChange(event) {
    this.setState({
      date: event.target.value
    });
  }
  render() {
    return (
      <div>
        <div className='row'>
          <div className='col col-6'>
            <Form inline>
              <FormGroup>
                <Label for="date"><i className="material-icons">date_range</i></Label>
                <Input className='form-control' value={this.state.date} type='date' onChange={this.handleDateChange}/>
              </FormGroup>
            </Form>
          </div>
        </div>
        <FoodTable date={this.state.date} />
      </div>
    );
  }
}

class FoodTable extends Component {
  constructor(props){
    super(props)
    this.state = {
      data: [],
      selected: []
    }
    this.handleAddEntry = this.handleAddEntry.bind(this);
    this.deleteSelectedEntries = this.deleteSelectedEntries.bind(this);
    this.updateData = this.updateData.bind(this);
    this.computeTotal = this.computeTotal.bind(this);
    this.getToggleSelectedHandler = this.getToggleSelectedHandler.bind(this);

    this.updateData();
  }
  componentDidUpdate(prevProps) {
    if (prevProps.date != this.props.date) {
      this.updateData();
    }
  }
  updateData() {
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/food", {params: {date: this.props.date}, withCredentials: true})
        .then(function(response){
          window.result = response;
          that.setState({
            data: response.data
          });
        });
  }
  handleAddEntry(entry) {
    this.setState({
      data: [entry].concat(this.state.data)
    });
  }
  deleteSelectedEntries() {
    var that = this;
    axios.delete(process.env.REACT_APP_SERVER_ADDRESS+"/data/food", {data: {id: this.state.selected}, withCredentials: true})
        .then(function(response) {
          that.setState({
            selected: []
          });
          that.updateData();
        });
  }
  getToggleSelectedHandler(entryId) {
    var that = this;
    return function() {
      if (that.state.selected.includes(entryId)){
        var index = that.state.selected.indexOf(entryId);
        var array = that.state.selected.slice();
        array.splice(index, 1);
        that.setState({
          selected: array
        });
      } else {
        that.setState({
          selected: that.state.selected.concat([entryId])
        });
      }
    }
  }
  computeTotal(key) {
    return this.state.data.reduce(function(acc, cur) {
      var num = cur[key];
      if (num == null || !isFinite(num) || isNaN(num))
        return acc;
      num = parseFloat(num);
      if (num == null || !isFinite(num) || isNaN(num))
        return acc;
      return acc + num;
    }, 0);
  }
  render() {
    var that = this;
    return (
      <div className='row'>
        <div className='col col-12'>
          <Link to='#' onClick={this.deleteSelectedEntries}><i className="material-icons">delete</i></Link>
        </div>
        <div className='col col-12 table-responsive'>
          <table className="Food table">
            <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Calories</th>
              <th>Protein</th>
              <th></th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <th>Total</th>
              <td></td>
              <td></td>
              <td></td>
              <td>{this.computeTotal('calories')}</td>
              <td>{this.computeTotal('protein')}</td>
              <td></td>
            </tr>
            <FoodRowNewEntry defaultDate={this.props.date} onSubmit={this.handleAddEntry}/>
            {
              this.state.data.map(function(data){
                return <FoodRow key={data.id} 
                            selected={that.state.selected.includes(data.id)}
                            onToggleSelected={that.getToggleSelectedHandler(data.id)}
                            {...data}/>
              })
            }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

class FoodRowNewEntry extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: '',
      name: '',
      quantity: '',
      calories: '',
      protein: '',
      photos: []
    };
    if ("onSubmit" in props) {
      this.onSubmit = props['onSubmit'];
    } else {
      this.onSubmit = function(){};
    }
    this.nameRef = React.createRef();
    this.addEntry = this.addEntry.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }
  componentWillReceiveProps(props) {
    this.setState({
      date: props.defaultDate || new Date().toISOString().substr(0,10),
    });  
  }
  addEntry(e) {
    var stateClone = JSON.parse(JSON.stringify(this.state));
    if (stateClone['date'] == '') {
      stateClone['date'] = new Date().toISOString().substr(0,10);
    }
    // Submit entry to server
    var that = this;
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/data/food", stateClone, {withCredentials: true})
        .then(function(response){
          stateClone['id'] = response.data;
          // Parent Callback
          that.onSubmit(stateClone);
          // Clear form
          that.setState({
            date: that.props.defaultDate || new Date().toISOString().substr(0,10),
            name: '',
            quantity: '',
            calories: '',
            protein: '',
            photos: []
          });
          // Place cursor
          that.nameRef.current.focus();
        });

  }
  onChange(e) {
    var x = {}
    x[e.target.name] = e.target.value;
    this.setState(x);
  }
  onFileUpload(photoIds) {
    this.setState({
      photos: photoIds
    });
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.addEntry(e);
    }
  }
  render() {
    return (
      <tr onKeyPress={this.handleKeyPress}>
        <td><Button color='primary' onClick={this.addEntry}>Save</Button></td>
        <td><input type='text' value={this.state.date} onChange={this.onChange} name='date' /></td>
        <td><input type='text' value={this.state.name} onChange={this.onChange} name='name' ref={this.nameRef} /></td>
        <td><input type='text' value={this.state.quantity} onChange={this.onChange} name='quantity' /></td>
        <td><input type='text' value={this.state.calories} onChange={this.onChange} name='calories' /></td>
        <td><input type='text' value={this.state.protein} onChange={this.onChange} name='protein' /></td>
        <td>
          <FileUploadDialog onUpload={this.onFileUpload} files={this.state.photos}/>
        </td>
      </tr>
    );
  }
}

class FoodRow extends Component {
  constructor(props) {
    super(props)
    this.state = {
      id: props.id,
      date: props.date,
      name: props.name,
      quantity: props.quantity,
      calories: props.calories,
      protein: props.protein,
      photos: props.photos,
      dirty: false
    };
    this.lastStateUpdateTime = new Date();
    this.lastDatabaseUpdateTime = new Date(0);
    this.databaseUpdateIntervalId = null;
    this.checkboxRef = React.createRef();
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
	}
  updateDatabase() {
    var stateClone = JSON.parse(JSON.stringify(this.state));
    var that = this;
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/data/food/"+this.props.id, stateClone, {withCredentials: true})
        .then(function(response){
          that.lastDatabaseUpdateTime = new Date();
        });
  }
  getOnUpdateHandler(propName) {
    var that = this;
    return function(val) {
      // Update entry values
      var x = {};
      x[propName] = val;
      that.setState(x);

      // Update dirty state
      that.lastStateUpdateTime = new Date();
      that.setState({ dirty: true });
      // Check if we're already waiting to update
      if (that.databaseUpdateIntervalId != null) {
        return;
      }
      // Not yet waiting to update, so set up an interval to wait until the user stops editing
      that.databaseUpdateIntervalId = setInterval(function() {
        if (new Date() - that.lastStateUpdateTime < 2000) {
          return; // There's been a change in the last 5s, so don't update the database yet
        }
        that.updateDatabase();
        clearInterval(that.databaseUpdateIntervalId);
        that.databaseUpdateIntervalId = null;
        that.setState({ dirty: false });
      }, 1000);
    }
  }
  render() {
    return (
      <tr draggable='true' className={this.state.dirty ? 'table-info' : ''}>
        <td onClick={this.props.onToggleSelected}><input type='checkbox' checked={this.props.selected}/></td>
        <FoodRowCell value={this.state.date} onChange={this.getOnUpdateHandler('date')} />
        <FoodRowCell value={this.state.name} onChange={this.getOnUpdateHandler('name')} />
        <FoodRowCell value={this.state.quantity} onChange={this.getOnUpdateHandler('quantity')} />
        <FoodRowCell value={this.state.calories} onChange={this.getOnUpdateHandler('calories')} />
        <FoodRowCell value={this.state.protein} onChange={this.getOnUpdateHandler('protein')} />
        <td>
          <FileUploadDialog onUpload={this.getOnUpdateHandler('photos')} files={this.state.photos}/>
        </td>
      </tr>
    );
  }
}

class FoodRowCell extends Component {
  constructor(props) {
    super(props)
    this.state = {
      edit: false,
    }
    this.onChange = props.onChange;
    this.startEdit = this.startEdit.bind(this);
    this.doneEdit = this.doneEdit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }
  startEdit(e) {
    this.setState({ edit: true });
  }
  doneEdit(e) {
    this.setState({ edit: false });
  }
  handleChange(e) {
    this.onChange(e.target.value);
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.doneEdit(e);
    }
  }
  render() {
    if (!this.state.edit) {
      return (
        <td onClick={this.startEdit}>{this.props.value}</td>
      );
    } else {
      return (
        <td><input type='textfield' value={this.props.value} onKeyPress={this.handleKeyPress} onBlur={this.doneEdit} onChange={this.handleChange}/></td>
      );
    }
  }
}

class FoodPhotoThumbnail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: "R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7"
    }
  }
  componentWillMount() {
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/"+this.props.fileid, {withCredentials: true})
        .then(function(response){
          that.setState({data: response.data.data});
        });
  }
  render() {
    return (
      <img width="32" src={"data:image/png;base64,"+this.state.data} />
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
