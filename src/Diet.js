import React, { Component, Fragment } from 'react';
import { Link } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, FormText, Alert } from 'reactstrap';
import axios from 'axios';

export class DietPage extends Component {
  constructor(props) {
    super(props)
    var now = new Date();
    var nowString = now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate(); // Need to rebuild it to get rid of time zone funniness
    this.state = {
      date: nowString
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
              <Input type="file" name="file" accept="image/*" capture="camera" onChange={this.uploadFile}/>
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
        <td></td>
        <td>{this.state.date}</td>
        <td><input type='text' value={this.state.name} onChange={this.onChange} name='name' ref={this.nameRef} /></td>
        <td><input type='text' value={this.state.quantity} onChange={this.onChange} name='quantity' /></td>
        <td><input type='text' value={this.state.calories} onChange={this.onChange} name='calories' /></td>
        <td><input type='text' value={this.state.protein} onChange={this.onChange} name='protein' /></td>
        <td>
          <FileUploadDialog onUpload={this.onFileUpload} files={this.state.photos}/>
        </td>
        <td><Button color='primary' onClick={this.addEntry}>Save</Button></td>
      </tr>
    );
  }
}

class DropdownCheckbox extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: props.checked
    }
    this.toggle = this.toggle.bind(this);
  }
  toggle() {
    var newValue = !this.state.checked;
    this.setState({
      checked: newValue
    });
    if (this.props.onChange) {
      this.props.onChange(newValue);
    }
  }
  render() {
    return (
      <label className='dropdown-checkbox'>
        <i className='material-icons'>
          {this.state.checked ? 'arrow_drop_down':'arrow_right'}
        </i>
        <input type='checkbox' onChange={this.toggle}/>
      </label>
    );
  }
}

class FoodRow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.id,
      date: props.date,
      name: props.name,
      quantity: props.quantity,
      calories: props.calories,
      protein: props.protein,
      photos: props.photos,
      children: props.children || [],
      selected: [],
      dirty: false,
      expanded: false
    };
    this.lastStateUpdateTime = new Date();
    this.lastDatabaseUpdateTime = new Date(0);
    this.databaseUpdateIntervalId = null;
    this.dropdownCheckbox = React.createRef();
    this.handleToggleSelected = this.handleToggleSelected.bind(this);
    this.getToggleSelectedHandler = this.getToggleSelectedHandler.bind(this);
    this.toggleChildren = this.toggleChildren.bind(this);
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
  handleToggleSelected(entryId) {
    /* Callback to be triggered when an entry has been selected. */
    if (this.state.selected.includes(entryId)){
      var index = this.state.selected.indexOf(entryId);
      var array = this.state.selected.slice();
      array.splice(index, 1);
      this.setState({
        selected: array
      });
    } else {
      this.setState({
        selected: this.state.selected.concat([entryId])
      });
    }
  }
  getToggleSelectedHandler(entryId) {
    var that = this;
    return function() {
      that.handleToggleSelected(entryId);
    }
  }
  toggleChildren(visible) {
    this.setState({
      expanded: visible
    });
  }
  render() {
    var that = this;
    return (
      <Fragment>
        <tr draggable='true' className={this.state.dirty ? 'table-info' : ''}>
          <td>{this.state.children.length > 0 && <DropdownCheckbox ref={this.dropdownCheckbox} onChange={this.toggleChildren}/>}</td>
          <FoodRowCell value={this.state.date} onChange={this.getOnUpdateHandler('date')} />
          <FoodRowCell value={this.state.name} onChange={this.getOnUpdateHandler('name')} />
          <FoodRowCell value={this.state.quantity} onChange={this.getOnUpdateHandler('quantity')} />
          <FoodRowCell value={this.state.calories} onChange={this.getOnUpdateHandler('calories')} />
          <FoodRowCell value={this.state.protein} onChange={this.getOnUpdateHandler('protein')} />
          <td>
            <FileUploadDialog onUpload={this.getOnUpdateHandler('photos')} files={this.state.photos}/>
          </td>
          <td onClick={this.props.onToggleSelected}><input type='checkbox' checked={this.props.selected}/></td>
        </tr>
        {
          this.state.expanded &&
          this.state.children.map(function(data){
            return <FoodRow key={data.id} 
                        selected={that.state.selected.includes(data.id)}
                        onToggleSelected={that.getToggleSelectedHandler(data.id)}
                        {...data}/>
          })
        }
      </Fragment>
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
      data: ""
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
    if (this.state.data == "") {
      return (<i className="material-icons">fastfood</i>);
    } else {
      return (
        <img src={"data:image/png;base64,"+this.state.data} />
      );
    }
  }
}

class FoodTable extends FoodRow {
  constructor(props){
    super(props)
    //this.state.children = [
    //  {"id":1,"date":"2018-08-26","name":"asdf","quantity":"","calories":1,"protein":9,"photos":[]},
    //  {"id":2,"date":"2018-08-26","name":"asdf","quantity":"","calories":1,"protein":9,"photos":[], "children": 
    //    [{"id":3,"date":"2018-08-26","name":"child item","quantity":"","calories":1,"protein":9,"photos":[]},
    //    {"id":4,"date":"2018-08-26","name":"child item 2","quantity":"","calories":1,"protein":9,"photos":[]}],
    //  }
    //];
    this.handleAddEntry = this.handleAddEntry.bind(this);
    this.deleteSelectedEntries = this.deleteSelectedEntries.bind(this);
    this.updateData = this.updateData.bind(this);
    this.computeTotal = this.computeTotal.bind(this);

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
            children: response.data
          });
        });
  }
  handleAddEntry(entry) {
    this.setState({
      children: [entry].concat(this.state.children)
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
  computeTotal(key) {
    return this.state.children.reduce(function(acc, cur) {
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
              <td></td>
              <th>Date</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Calories</th>
              <th>Protein</th>
              <th></th>
              <th></th>
            </tr>
            </thead>
            <tbody>
            <tr>
              <td></td>
              <th>Total</th>
              <td></td>
              <td></td>
              <td>{this.computeTotal('calories')}</td>
              <td>{this.computeTotal('protein')}</td>
              <td></td>
            </tr>
            <FoodRowNewEntry defaultDate={this.props.date} onSubmit={this.handleAddEntry}/>
            {
              this.state.children.map(function(data){
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

