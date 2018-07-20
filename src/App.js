import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input, FormText } from 'reactstrap';
import axios from 'axios';
import https from 'https';
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
    axios.get("https://97.107.137.19:5000/auth/current_session", {withCredentials: true})
        .then(function(response){
          console.log(response);
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
            <Route path="/food" component={FoodTable} />
            <Route path="/logout" render={(props) => <Logout onLogout={this.updateLoggedInStatus} {...props} />}/>
          </div>
        </Router>
      );
    } else {
      return (
        <Router>
          <div className="App container-fluid">
            <Navigation loggedIn={this.state.loggedIn}/>
            <Route path="/login" render={(props) => <Login onLogin={this.updateLoggedInStatus} {...props} />}/>
            <Route path="/signup" render={(props) => <Signup onSignup={this.updateLoggedInStatus} {...props} />}/>
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
    console.log("Attempting to log out.");
    var that = this;
    axios.post("https://97.107.137.19:5000/auth/logout", this.state, {withCredentials: true})
        .then(function(response){
          console.log(response);
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
      password: ''
    };
    this.onLogin = props['onLogin'];
    this.login = this.login.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }
  login(e) {
    e.preventDefault();
    // TODO: Login
    console.log("Attempting to log in.");
    console.log(this.state);
    var that = this;
    axios.post("https://97.107.137.19:5000/auth/login", this.state, {withCredentials: true, rejectUnauthorized: false})
        .then(function(response){
          console.log(response);
          that.onLogin(response);
          that.props.history.push('/diet');
        })
        .catch(function(error){
          console.log("Login failure. Try again.");
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
        <div className="form-group">
          <label>E-mail: </label>
          <input className='form-control' type='text' name='email' onChange={this.handleFormChange}/>
        </div>
        <div className="form-group">
          <label>Password: </label>
          <input className='form-control' type='password' name='password' onChange={this.handleFormChange}/>
        </div>
        <input className='btn btn-primary' type='submit' value='Login' />
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
      password2: ''
    };
    this.onSignup = props['onSignup'];
    this.signup = this.signup.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }
  signup() {
    console.log("Attempting to sign up.");
    console.log(this.state);
    var that = this;
    axios.post("https://97.107.137.19:5000/auth/signup", this.state, {withCredentials: true})
        .then(function(response){
          console.log(response);
          that.onSignup(response);
        })
        .catch(function(error){
          console.log("Signup failure. Try again.");
        });
  }
  handleFormChange(e) {
    var x = {}
    x[e.target.name] = e.target.value;
    this.setState(x);
  }
  render() {
    return (
      <div>
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
        <input className='btn btn-primary' type='submit' value='Sign Up' onClick={this.signup} />
      </div>
    );
  }
}

class FileUploader extends Component {
  constructor(props) {
    super(props);
    this.handleFileUpload = this.handleFileUpload.bind(this);
  }
  handleFileUpload(e) {
    window.x = e.target;
    var formData = new FormData();
    formData.append("file", e.target.files[0]);
    axios.post("https://97.107.137.19:5000/data/food/photo", formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
        });
  }
  render() {
    return (
      <input type="file" name="file" onChange={this.handleFileUpload}/>
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
    console.log(this.onUpload);
  }
  uploadFile(event) {
    console.log('uploading stuff');
    console.log(event);
    var target = event.target;
    var formData = new FormData();
    var that = this;
    formData.append("file", target.files[0]);
    axios.post("https://97.107.137.19:5000/data/food/photo", formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
        }).then(function(response){
          console.log(response);
          console.log(event);
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
        <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
          <ModalHeader toggle={this.toggle}>Modal title</ModalHeader>
          <ModalBody>
            <div>
              {
                this.props.files.map(function(file){
                  return <FoodPhotoThumbnail key={file} fileid={file}/>
                })
              }
            </div>
            <FormGroup>
              <Label for="exampleFile">File</Label>
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

class FoodTable extends Component {
  constructor(props){
    super(props)
    this.state = {
      date: new Date().toISOString().substr(0,10),
      data: []
    }
    this.handleAddEntry = this.handleAddEntry.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);
    this.updateData = this.updateData.bind(this);
  }
  componentDidMount() {
    this.updateData();
  }
  updateData() {
    var that = this;
    axios.get("https://97.107.137.19:5000/data/food", {params: {date: this.state.date}, withCredentials: true})
        .then(function(response){
          window.result = response;
          that.setState({
            data: response.data
          });
        });
  }
  handleDateChange(event) {
    this.setState({
      date: event.target.value
    }, this.updateData);
  }
  handleAddEntry(entry) {
    this.setState({
      data: [entry].concat(this.state.data)
    });
  }
  render() {
    return (
      <div className='row'>
        <div className='col col-3'>
          <i className="material-icons">date_range</i>
          <input className='form-control' type='date' onChange={this.handleDateChange}/>
        </div>
        <div className='col col-6'>
          <span>Food intake on {this.state.date}</span>
        </div>
        <div className='col col-12'>
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
            <FoodRowNewEntry onSubmit={this.handleAddEntry}/>
            {
              this.state.data.map(function(data){
                return <FoodRow key={data.id} {...data}/>
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
    super(props)
    this.state = {
      date: props.date,
      itemName: props.itemName,
      quantity: props.quantity,
      calories: props.calories,
      protein: props.protein,
      photos: []
    };
    if ("onSubmit" in props) {
      this.onSubmit = props['onSubmit'];
    } else {
      this.onSubmit = function(){};
    }
    this.ref = React.createRef();
    this.dialogRef = React.createRef();
    window.ref = this.dialogRef;
    this.addEntry = this.addEntry.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }
  addEntry(e) {
    var stateClone = JSON.parse(JSON.stringify(this.state));
    if (stateClone['date'] == '') {
      //stateClone['date'] = 
    }
    // Submit entry to server
    var that = this;
    axios.post("https://97.107.137.19:5000/data/food", stateClone, {withCredentials: true})
        .then(function(response){
          stateClone['id'] = response.data;
          // Parent Callback
          that.onSubmit(stateClone);
        });


    // Clear form and place cursor
    window.x = this.ref.current;
    //$(this.ref.current).find('input:text').val('');
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
    //<td><input type='button' className='btn btn-primary' value='Save' onClick={this.addEntry}/></td>
    return (
      <tr ref={this.ref} onKeyPress={this.handleKeyPress}>
        <td><Button color='primary' onClick={this.addEntry}>Save</Button></td>
        <td><input type='text' onChange={this.onChange} name='date' /></td>
        <td><input type='text' onChange={this.onChange} name='itemName' /></td>
        <td><input type='text' onChange={this.onChange} name='quantity' /></td>
        <td><input type='text' onChange={this.onChange} name='calories' /></td>
        <td><input type='text' onChange={this.onChange} name='protein' /></td>
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
      itemName: props.itemName,
      quantity: props.quantity,
      calories: props.calories,
      protein: props.protein,
      photos: props.photos
    };
    this.lastStateUpdateTime = new Date();
    this.lastDatabaseUpdateTime = new Date(0);
    this.databaseUpdateIntervalId = null;
    this.onClick = this.onClick.bind(this);
    this.checkboxRef = React.createRef();
  }
  onClick() {
    // TODO: Call parent handler for selection
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    this.lastStateUpdateTime = new Date();
    // Check if we're already waiting to update
    if (this.databaseUpdateIntervalId != null) {
      return;
    }
    // Not yet waiting to update, so set up an interval to wait until the user stops editing
    var that = this;
    this.databaseUpdateIntervalId = setInterval(function() {
      if (new Date() - that.lastStateUpdateTime < 2000) {
        return; // There's been a change in the last 5s, so don't update the database yet
      }
      that.updateDatabase();
      clearInterval(that.databaseUpdateIntervalId);
      that.databaseUpdateIntervalId = null;
    }, 1000);
	}
  updateDatabase() {
    var stateClone = JSON.parse(JSON.stringify(this.state));
    var that = this;
    axios.post("https://97.107.137.19:5000/data/food/"+this.props.id, stateClone, {withCredentials: true})
        .then(function(response){
          console.log('Updating db');
          that.lastDatabaseUpdateTime = new Date();
        });
  }
  getOnUpdateHandler(propName) {
    var that = this;
    return function(val) {
      var x = {};
      x[propName] = val;
      that.setState(x);
    }
  }
  render() {
    return (
      <tr draggable='true'>
        <td onClick={this.onClick}><input ref={this.checkboxRef} type='checkbox' /></td>
        <FoodRowCell value={this.state.date} onChange={this.getOnUpdateHandler('date')} />
        <FoodRowCell value={this.state.itemName} onChange={this.getOnUpdateHandler('itemName')} />
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

class FoodRowPhotoCell extends Component {
  render() {
    return (
      <td>
        <FileUploadDialog onUpload={this.props.onChange} files={this.props.photos}/>
      </td>
    );
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
    axios.get("https://97.107.137.19:5000/data/food/photo/"+this.props.fileid, {withCredentials: true})
        .then(function(response){
          that.setState({data: response.data.data});
        });
  }
  render() {
    return (
      <img width="32" height="32" src={"data:image/png;base64,"+this.state.data} />
    );
  }
}

export default App;
