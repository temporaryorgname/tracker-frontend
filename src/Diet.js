import React, { Component } from 'react';
import { Route, Link, Switch } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { connect } from "react-redux";

import { 
  getLoadingStatus,
  dictEqual
} from './Utils.js';
import { 
  foodActions,
  photoActions,
  photoGroupActions,
  getFoodByPhotoGroupId,
  getPhotosByPhotoGroupId
} from './actions/Actions.js';

import { Checkbox, Modal, ModalHeader, ModalBody, ModalFooter, FoodPhotoThumbnail, ThumbnailsList } from './Common.js';
import { parseQueryString, dictToQueryString, formatDate } from './Utils.js';

import './Diet.scss';

class ConnectedDietPage extends Component {
  constructor(props) {
    super(props);

    // If no date is provided, then set it to the current date
    var queryParams = parseQueryString(this.props.location.search);
    if (!queryParams['date']) {
      queryParams['date'] = formatDate(new Date());
    }
    if (!queryParams['uid']) {
      queryParams['uid'] = this.props.uid;
    }
    this.state = {
      params: queryParams
    }

    this.handleDateChange = this.handleDateChange.bind(this);
    this.prevDate = this.prevDate.bind(this);
    this.nextDate = this.nextDate.bind(this);
    this.handleEditEntry = this.handleEditEntry.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.location.search !== this.props.location.search) {
      var queryParams = parseQueryString(this.props.location.search);
      if (!queryParams['date']) {
        queryParams['date'] = formatDate(new Date());
      }
      if (!queryParams['uid']) {
        queryParams['uid'] = this.props.uid;
      }
      this.setState({
        params: queryParams
      });
    }
  }
  handleDateChange(date) {
    var params = this.state.params;
    params.date = formatDate(date);
    this.props.history.push(dictToQueryString(params, ['uid', 'date']));
  }
  prevDate() {
    var newDate = new Date(this.state.params.date);
    newDate.setDate(newDate.getDate());
    this.handleDateChange(newDate);
  }
  nextDate() {
    var newDate = new Date(this.state.params.date);
    newDate.setDate(newDate.getDate()+2);
    this.handleDateChange(newDate);
  }
  handleEditEntry(photoId, groupId) {
    let params = {date: this.state.params.date};
    if (photoId) {
      params['photo_id'] = photoId;
    } else if (groupId) {
      params['group_id'] = groupId;
    }
    this.props.history.push('/food/editor'+dictToQueryString(params));
  }
  render() {
    if (!this.state.params.date || !this.state.params.uid) {
      return null;
    }
    let links = (
      <>
        <Link to={'/food/table'+dictToQueryString(this.state.params, ['uid','date'])}>Table</Link>
        <Link to={'/food/photos'+dictToQueryString(this.state.params, ['uid','date'])}>Photos</Link>
        <Link to={'/food/editor'+dictToQueryString(this.state.params, ['uid','date'])}>Editor</Link>
      </>
    );
    //links = null;
    return (
      <main className='diet-page-container'>
        <div className='background'>
        </div>
        {links}
        <h2>Diet Log</h2>
        <h3 className='date'>
          <i className='material-icons action' onClick={this.prevDate}>navigate_before</i>
          <DatePicker 
            onChange={this.handleDateChange}
            customInput={<span>{this.state.params.date}</span>}/>
          <i className='material-icons action' onClick={this.nextDate}>navigate_next</i>
        </h3>
        <Switch>
          <Route path="/food/table" render={() => <FoodTable date={this.state.params.date} onDateChange={this.handleDateChange} />} />
          <Route path="/food/photos" render={() => <Gallery date={this.state.params.date} uid={this.state.params.uid} onEditEntry={this.handleEditEntry}/>} />
          <Route path="/food/editor" render={() => <EntryEditorForm date={this.state.params.date} uid={this.state.params.uid} id={this.state.params.id} photo_id={this.state.params.photo_id} group_id={this.state.params.group_id}/>} />
        </Switch>
      </main>
    );
  }
}
export const DietPage = connect(
  function(state, ownProps) {
    return {
      uid: state.session.uid
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: (uid) => dispatch(photoActions['fetchMultiple']({user_id: uid}))
    };
  }
)(ConnectedDietPage);

class ConnectedGallery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      selectedPhotoId: null,
      selectedGroupId: null
    };
    this.props.fetchPhotos(this.props.uid);
    this.props.fetchGroups();
    this.handleSelectPhoto = this.handleSelectPhoto.bind(this);
    this.handleSelectGroup = this.handleSelectGroup.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.createGroup = this.createGroup.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.editSelected = this.editSelected.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.date !== this.props.date) {
      this.props.fetchPhotos(this.props.uid);
      this.props.fetchGroups();
    }
  }
  handleSelectPhoto(photoId) {
    photoId = parseInt(photoId);
    if (this.state.selectedPhotoId === photoId) {
      this.setState({
        selectedPhotoId: null,
        selectedGroupId: null
      });
    } else {
      this.setState({
        selectedPhotoId: parseInt(photoId),
        selectedGroupId: null
      });
    }
  }
  handleSelectGroup(groupId) {
    if (this.state.selectedGroupId === groupId) {
      this.setState({
        selectedPhotoId: null,
        selectedGroupId: null
      });
    } else {
      this.setState({
        selectedPhotoId: null,
        selectedGroupId: parseInt(groupId)
      });
    }
  }
  handleDelete() {
    if (this.state.selectedPhotoId) {
      this.props.deletePhoto(this.state.selectedPhotoId);
    }
    if (this.state.selectedGroupId) {
      this.props.deletePhotoGroup(this.state.selectedGroupId);
    }
    this.setState({
      selectedPhotoId: null,
      selectedGroupId: null
    });
  }
  uploadFile(event) {
    let that = this;
    this.props.uploadPhoto(
      event.target.files
    ).then(function(response){
      that.props.fetchPhotos(false);
    });
  }
  createGroup() {
    this.props.createGroup();
    this.setState({
      groups: [...this.state.groups, []]
    });
  }
  handleDragOver(event) {
    event.preventDefault();
  }
  handleDrop(event, groupId) {
    event.stopPropagation();
    var photoId = event.dataTransfer.getData('photoId');
    this.props.updatePhoto({
      ...this.props.photos[photoId],
      group_id: groupId
    });
  }
  handleDragStart(event, photoId) {
    event.dataTransfer.setData('photoId', photoId);
  }
  editSelected() {
    this.props.onEditEntry(this.state.selectedPhotoId, this.state.selectedGroupId);
  }
  render() {
    const {
      selectedPhotoId = this.state.selectedPhotoId,
      selectedGroupId = this.state.selectedGroupId,
      onSelectPhoto = this.handleSelectPhoto,
      onSelectGroup = this.handleSelectGroup,
      disabledPhotos = new Set(),
      disabledGroups = new Set()
    } = this.props;
    var that = this;
    if (!this.props.photosLoadingStatus || !this.props.groupsLoadingStatus) {
      return (
        <div>
          Waiting to load
        </div>
      );
    } else if (this.props.photosLoadingStatus.status === 'loading' || this.props.groupsLoadingStatus.status === 'loading') {
      return (
        <div>
          LOADING...
        </div>
      );
    } else if (this.props.photosLoadingStatus.status === 'error' || this.props.groupsLoadingStatus.status === 'error') {
      return (
        <div className='error-message'>
          {this.props.photosLoadingStatus.error || this.props.groupsLoadingStatus.error}
        </div>
      );
    } else if (this.props.photosLoadingStatus.status === 'loaded' && this.props.groupsLoadingStatus.status === 'loaded') {
      if (Object.keys(this.props.photos).length > 0) {
        // Render controls
        let controls = (
          <>
            <label>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.uploadFile}/>
              <i className='material-icons action'>add_a_photo</i>
            </label>
            <label onClick={this.createGroup}>
              <i className='material-icons action'>create_new_folder</i>
            </label>
          </>
        );
        if (this.state.selectedPhotoId || this.state.selectedGroupId) {
          controls = (
            <>
              <i className='material-icons action' onClick={this.handleDelete}>delete</i>
              <i className='material-icons action' onClick={this.editSelected}>create</i>
            </>
          );
        }
        // Render thumbnails
        var thumbnails = {};
        for (var k in this.props.groups) {
          if (k === 'null') {
            thumbnails[k] = this.props.groups[k].map(function(photoId){
              if (disabledPhotos.has(photoId)) {
                return (
                  <div className='photo-viewer-thumbnail disabled'
                      key={photoId}
                      onClick={()=>onSelectPhoto(null)}
                      onDragStart={(e) => that.handleDragStart(e,photoId)}
                      draggable>
                    <FoodPhotoThumbnail photoId={photoId}
                        selected={selectedPhotoId === photoId}/>
                  </div>
                );
              } else {
                return (
                  <div className='photo-viewer-thumbnail'
                      key={photoId}
                      onClick={()=>onSelectPhoto(selectedPhotoId === photoId ? null : photoId)}
                      onDragStart={(e) => that.handleDragStart(e,photoId)}
                      draggable>
                    <FoodPhotoThumbnail photoId={photoId}
                        selected={selectedPhotoId === photoId}/>
                  </div>
                );
              }
            });
          } else {
            thumbnails[k] = this.props.groups[k].map(function(photoId){
              return (
                <div className='photo-viewer-thumbnail'
                    key={photoId}
                    onDragStart={(e) => that.handleDragStart(e,photoId)}
                    draggable>
                  <FoodPhotoThumbnail photoId={photoId} />
                </div>
              );
            });
          }
        }
        // Render groups
        let groups = null;
        if (this.props.groups) {
          let noThumbnails = <i className='material-icons'>folder</i>
          groups = Object.keys(this.props.groups).map(
            function(groupId){
              if (groupId === 'null') { // Object.keys() converts the null key to a string
                return null;
              }
              groupId = parseInt(groupId);
              var classNames = ['thumbnail', 'group'];
              if (selectedGroupId === groupId) {
                classNames.push('selected');
              }
              classNames = classNames.join(' ');
              let groupThumbnails = thumbnails[groupId];
              if (groupThumbnails.length === 0) {
                groupThumbnails = noThumbnails;
              }
              if (disabledGroups.has(groupId)) {
                return (
                  <div className={classNames+' disabled'}
                      key={groupId}
                      onClick={()=>onSelectGroup(null)}
                      onDragOver={that.handleDragOver}
                      onDrop={(e)=>that.handleDrop(e,groupId)}>
                    {groupThumbnails}
                  </div>
                );
              } else {
                return (
                  <div className={classNames}
                      key={groupId}
                      onClick={()=>onSelectGroup(selectedGroupId === groupId ? null : groupId)}
                      onDragOver={that.handleDragOver}
                      onDrop={(e)=>that.handleDrop(e,groupId)}>
                    {groupThumbnails}
                  </div>
                );
              }
            }
          );
        }
        return (
          <div className='gallery' onDragOver={that.handleDragOver} onDrop={(e)=>that.handleDrop(e,null)}>
            <div className='controls'>{controls}</div>
            <div className='thumbnails'>
              {thumbnails[null]}
              {groups}
            </div>
          </div>
        );
      } else {
        return (
          <div className='gallery empty-view'>
            <div>There are no photos to show.</div>
            <label>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.uploadFile}/>
              <div className='large-button'>
                <i className='material-icons'>add_a_photo</i>
                Upload Photo
              </div>
            </label>
          </div>
        );
      }
    }
  }
}
const Gallery = connect(
  function(state, ownProps) {
    let photos = {};
    let photoIdsByGroup = {};
    let photosLoadingStatus = getLoadingStatus(
      state.loadingStatus['PHOTOS'],
      {user_id: ownProps.uid, date: ownProps.date}
    );
    let groupsLoadingStatus = getLoadingStatus(
      state.loadingStatus['PHOTO_GROUPS'],
      {user_id: ownProps.uid, date: ownProps.date}
    );
    let photosReady = photosLoadingStatus && photosLoadingStatus.status === 'loaded';
    let groupsReady = groupsLoadingStatus && groupsLoadingStatus.status === 'loaded';
    if (photosReady && groupsReady) {
      // Get all photos for the given date
      let photoIds = Object.keys(
        state.photos.entities
      ).filter(function(id) {
        return state.photos.entities[id].date === ownProps.date;
      });
      // Get all photo groups for the given date
      let groupIds = Object.keys(
        state.photoGroups.entities
      ).filter(function(id){
        return state.photoGroups.entities[id].date === ownProps.date;
      });
      // Populate with groups
      groupIds.forEach(function(groupId){
        photoIdsByGroup[groupId] = [];
      });
      photoIdsByGroup[null] = [];
      // Populate photo by ID and photo ID by group
      photoIds.forEach(function(photoId){
        let photo = state.photos.entities[photoId];
        // Add photo ID to the appropriate group
        photoIdsByGroup[photo.group_id].push(parseInt(photoId));
        // Add photo to the dictionary of photos
        photos[photoId] = photo;
      });
    }
    return {
      photosLoadingStatus,
      groupsLoadingStatus,
      groups: photoIdsByGroup,
      photos: photos
    };
  },
  function(dispatch, ownProps) {
    return {
      fetchPhotos: (cache) => dispatch(
        photoActions['fetchMultiple']({user_id: ownProps.uid, date: ownProps.date}, cache)
      ),
      fetchGroups: () => dispatch(
        photoGroupActions['fetchMultiple']({user_id: ownProps.uid, date: ownProps.date})
      ),
      updatePhoto: (data) => dispatch(
        photoActions['update'](data)
      ),
      uploadPhoto: (files) => dispatch(
        photoActions['create'](files, ownProps.date)
      ),
      createGroup: () => dispatch(
        photoGroupActions['create']({date: ownProps.date})
      ),
      createFood: (data) => dispatch(
        foodActions['create'](data)
      ),
      deletePhoto: (id) => dispatch(
        photoActions['deleteSingle'](id)
      ),
      deletePhotoGroup: (id) => dispatch(
        photoGroupActions['deleteSingle'](id)
      )
    };
  }
)(ConnectedGallery);

class ConnectedFileUploadDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      predictions: []
    }
    this.ref = React.createRef();
    this.toggle = this.toggle.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.onUpload = props.onUpload;
    this.loadPrediction = this.loadPrediction.bind(this);
    this.getSelectPredictionHandler = this.getSelectPredictionHandler.bind(this);
  }
  uploadFile(event) {
    let that = this;
    let target = event.target;
    this.props.uploadPhoto(target.files)
    .then(function(response){
      target.value = "";
      that.onUpload([...that.props.files, response.data.id]);
      that.loadPrediction(response.data.id);
    });
  }
  loadPrediction(photoId) {
    return; //TODO
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/predict/"+photoId, {withCredentials: true})
        .then(function(response){
          that.setState({
            predictions: response.data
          });
        });
  }
  getSelectPredictionHandler(pred) {
    return function() {
      if (this.props.onSelectPrediction) {
        this.props.onSelectPrediction(pred);
      }
    }
  }
  toggle() {
    this.setState({
      modal: !this.state.modal
    });
  }
  render() {
    var that = this;
    return (
      <div className='file-upload-dialog'>
        <i className="material-icons action" onClick={this.toggle}>add_a_photo</i>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className="modal-sm">
          <ModalHeader toggle={this.toggle}>Upload Photo</ModalHeader>
          <ModalBody>
            <div className='thumbnails'>
              {
                this.props.files.map(function(file){
                  return <FoodPhotoThumbnail key={file} photoId={file}/>
                })
              }
            </div>
            <div className='predictions'>
              {
                this.state.predictions.map(function(s){
                  return <Link to='#' onClick={that.getSelectPredictionHandler(s)}>{s}</Link>
                })
              }
            </div>
            <form>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.uploadFile}/>
              <span color="muted">
                Select a photo to include with your entry.
              </span>
            </form>
          </ModalBody>
          <ModalFooter>
            <button className="primary" onClick={this.toggle}>Done</button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}
const FileUploadDialog = connect(
  function(state, ownProps) {
    return {};
  },
  function(dispatch, ownProps) {
    return {
      uploadPhoto: (files) => dispatch(
        photoActions['create'](files, ownProps.date)
      ),
    };
  }
)(ConnectedFileUploadDialog);

class FoodNameInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      suggestions: [],
      loading: false,
      focused: false,
      selected: -1
    }
    this.ref = React.createRef();
    this.loadSuggestions = this.loadSuggestions.bind(this);
    this.loadSuggestionsTimeout = null;
    this.handleSelect = this.handleSelect.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.focus = this.focus.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.value !== this.props.value) {
      clearTimeout(this.loadSuggestionsTimeout);
      this.loadSuggestionsTimeout = setTimeout(this.loadSuggestions, 500);
    }
    if (this.props.onHighlight && prevState.selected !== this.state.selected) {
      if (this.state.selected === -1) {
        this.props.onHighlight({});
      } else if (this.props.onHighlight) {
        this.props.onHighlight(this.state.suggestions[this.state.selected]);
      }
    }
  }
  handleSelect() {
    // Check if the selection is valid
    if (this.state.selected === -1) {
      return;
    }
    // Call event handlers
    if (this.props.onSelect) {
      this.props.onSelect(this.state.suggestions[this.state.selected]);
    }
    // Clear search results and selection
    this.setState({
      selected: -1,
      suggestions: []
    });
  }
  handleBlur() {
    this.setState({
      focused: false
    });
  }
  handleFocus() {
    this.setState({
      focused: true
    });
  }
  handleKeyDown(event) {
    var UP = 38;
    var DOWN = 40;
    if (event.keyCode === DOWN) {
      this.setState({
        selected: (this.state.selected+2)%(this.state.suggestions.length+1)-1
      });
    } else if (event.keyCode === UP) {
      this.setState({
        selected: (this.state.selected+this.state.suggestions.length+1)%(this.state.suggestions.length+1)-1
      });
    }
  }
  handleKeyPress(event) {
    var RETURN = 13;
    if ((event.keyCode || event.which || event.charCode) === RETURN && this.state.selected !== -1) {
      this.handleSelect();
      // Prevent the key press from affecting other things (e.g. form submission).
      event.stopPropagation();
    }
  }
  getMouseEnterHandler(index) {
    var that = this;
    return function(event) {
      that.setState({
        selected: index
      });
    }
  }
  handleMouseDown(event) {
    this.handleSelect();
  }
  loadSuggestions() {
    if (!this.props.value || this.props.value.length === 0) {
      this.setState({
        suggestions: [],
        loading: true
      });
      return;
    }
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/foods/search?q="+encodeURI(this.props.value), {withCredentials: true})
        .then(function(response){
          window.result = response;
          that.setState({
            suggestions: response.data.history,
            loading: false
          });
        })
        .catch(function(error){
          console.error(error);
        });
  }
  focus() {
    this.ref.current.focus();
  }
  render() {
    var that = this;
    var inputField = (<input
              autocomplate='off'
              type='text'
              value={this.props.value}
              onKeyDown={this.handleKeyDown}
              onKeyPress={this.handleKeyPress}
              onChange={this.props.onChange}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              name={this.props.name}
              placeholder={this.props.placeholder}
              ref={this.ref} />);
    var suggestions = (
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Cals</th>
            <th>Prot</th>
          </tr>
        </thead>
        <tbody onMouseDown={this.handleSelect}>
          {
            this.state.suggestions.map(function(item,index){
              var className = that.state.selected === index ? 'selected' : '';
              return (
                <tr className={className} key={index} onMouseEnter={that.getMouseEnterHandler(index)}>
                  <td className='name'>{item.name}</td>
                  <td className='numbers' data-label='qty'>{item.quantity}</td>
                  <td className='numbers' data-label='cals'>{item.calories}</td>
                  <td className='numbers' data-label='prot'>{item.protein}</td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    );
    var loadingSuggestions = (
      <table>
        <thead>
          <tr>
            <th>name</th>
            <th>cals</th>
            <th>prot</th>
          </tr>
        </thead>
        <tbody>
          <tr><td className='loading' colSpan='3'><div className='loader'></div></td></tr>
        </tbody>
      </table>
    );
    var s = null;
    if (this.props.value && this.props.value.length > 0 && this.state.focused) {
      if (this.state.loading) {
        s = loadingSuggestions;
      } else if (this.state.suggestions.length > 0) {
        s = suggestions;
      } else {
        s = null;
      }
    }
    return (
      <div className='food-name-input'>
        <form autocomplete='off' onSubmit={e => e.preventDefault()}>
        {inputField}
        </form>
        {s && <div className='table'> {s} </div>}
      </div>
    );
  }
}

class QuantityInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      focused: false,
      startingValue: this.props.value
    };
    this.scaleQuantity = this.scaleQuantity.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }
  scaleQuantity() {
    function splitUnits(str) {
      var val = parseFloat(str);
      var units = str.substring(val.toString().length).trim();
      return {val: val, units: units}
    }
    // Ignore empty strings
    if (this.props.value === null) {
      return;
    }
    if (this.props.value.length === 0) {
      return;
    }
    // Split numbers and units
    var oldVals = splitUnits(this.state.startingValue);
    var newVals = splitUnits(this.props.value);

    // Check if the quantities use the same units
    if (oldVals['units'] !== newVals['units']) {
      return;
    }

    var scale = newVals['val']/oldVals['val'];

    // Check if the number is valid
    if (!isFinite(scale) || scale === 1) {
      return;
    }

    // Callback
    if (this.props.onScale) {
      this.props.onScale(scale);
    }
  }
  handleBlur(e) {
    this.scaleQuantity();
    if (this.props.onBlur) {
      this.props.onBlur(e);
    }
  }
  handleFocus(e) {
    this.setState({
      startingValue: this.props.value
    });
    if (this.props.onFocus) {
      this.props.onFocus(e);
    }
  }
  render() {
    const {onScale, ...props} = this.props;
    return (
      <input
          type='text'
          name='quantity'
          {...props}
          onBlur={this.handleBlur}
          onFocus={this.handleFocus}
          />
    );
  }
}

class ConnectedFoodRowNewEntry extends Component {
  constructor(props) {
    super(props);
    this.state = {
      item: '',
      quantity: '',
      calories: '',
      protein: '',
      suggestion: {}
    };
    this.addEntry = this.addEntry.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleHighlight = this.handleHighlight.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleQuantityScale = this.handleQuantityScale.bind(this);
  }
  addEntry(e) {
    // Submit entry to server
    var that = this;
    this.props.onSubmit({
      date: this.props.date,
      name: this.state.item,
      quantity: this.state.quantity,
      calories: this.state.calories,
      protein: this.state.protein,
      photo_ids: []
    }).then(function(response){
      // Clear form
      that.setState({
        item: '',
        quantity: '',
        calories: '',
        protein: ''
      });
      // Place cursor
      that.nameRef.focus();
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
  handleHighlight(entry) {
    this.setState({
      suggestion: entry
    });
  }
  handleSelect(entry) {
    function foo(x) {
      return (x === null) ? x : x.toString();
    }
    this.setState({
      item: entry.name,
      quantity: foo(entry.quantity) || this.state.quantity,
      calories: foo(entry.calories) || this.state.calories,
      protein:  foo(entry.protein) || this.state.protein,
    });
  }
  handleQuantityScale(scale) {
    var cals = this.state.calories;
    if (isFinite(cals) && cals.length > 0) {
      cals = parseFloat(cals)*scale;
    }
    var prot = this.state.protein;
    if (isFinite(prot) && prot.length > 0) {
      prot = parseFloat(prot)*scale;
    }
    this.setState({
      calories: cals.toString(),
      protein: prot.toString()
    });
  }
  render() {
    return (
      <tr className='new-entry' onKeyPress={this.handleKeyPress}>
        <td></td>
        <td>
          <FoodNameInput 
              value={this.state.item} 
              onChange={this.onChange}
              onHighlight={this.handleHighlight}
              onSelect={this.handleSelect}
              name='item'
              placeholder='item'
              ref={x => this.nameRef = x} />
        </td>
        <td>
          <QuantityInput
              value={this.state.quantity}
              placeholder={this.state.suggestion.quantity || 'quantity'}
              onChange={this.onChange}
              onScale={this.handleQuantityScale}
              name='quantity' />
        </td>
        <td>
          <input
              type='text'
              value={this.state.calories}
              placeholder={this.state.suggestion.calories || 'calories'}
              onChange={this.onChange}
              name='calories' />
        </td>
        <td>
          <input 
              type='text'
              value={this.state.protein}
              placeholder={this.state.suggestion.protein || 'protein'}
              onChange={this.onChange}
              name='protein' />
        </td>
        <td className='submit'>
          <i className='material-icons action' onClick={this.addEntry}>save</i>
        </td>
      </tr>
    );
  }
}
const FoodRowNewEntry = connect(
  function(state, ownProps) {
    return {}
  },
  function(dispatch, ownProps) {
    return {
      onSubmit: data => dispatch(foodActions['create'](data))
    };
  }
)(ConnectedFoodRowNewEntry);

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
        <i className='material-icons action'>
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
    this.state = { // Keep a copy of the data
      expanded: false
    };

    this.getOnChangeHandler = this.getOnChangeHandler.bind(this);
    this.handleChildrenChange = this.handleChildrenChange.bind(this);
    this.dropdownCheckbox = React.createRef();
    this.toggleChildren = this.toggleChildren.bind(this);
    this.handleQuantityScale = this.handleQuantityScale.bind(this);
  }
  getOnChangeHandler(propName) {
    let that = this;
    let onChange = this.props.onChange || function(){console.error('No onChange callback defined.')};
    return function(e) {
      // Update entry values
      let updatedEntry = {
        ...that.props.data,
        [propName]: e.target.value
      }
      onChange(updatedEntry);
    }
  }
  handleChildrenChange(entry) {
    let that = this;
    let onChange = this.props.onChange || function(){console.error('No onChange callback defined.')};
    let otherChildren = that.props.data.children.filter(child => child.id !== entry.id);
    onChange({
      ...that.props.data,
      children: [
        ...otherChildren,
        entry
      ] 
    });
  }
  toggleChildren(visible) {
    this.setState({
      expanded: visible
    });
  }
  handleQuantityScale(scale) {
    var cals = this.state.data.calories;
    if (isFinite(cals)) {
      if (typeof cals === 'string' && cals.length > 0) {
        cals = parseFloat(cals)*scale;
        cals = cals.toString();
      } else {
        cals *= scale
      }
    } var prot = this.state.data.protein;
    if (isFinite(prot)) {
      if (typeof prot === 'string' && prot.length > 0) {
        prot = parseFloat(prot)*scale;
        prot = prot.toString();
      } else {
        prot *= scale
      }
    }
    this.setState({
      data: {
        ...this.state.data,
        calories: cals,
        protein: prot
      }
    });
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }
  render() {
    let selected = this.props.selected;
    let that = this;
    return (
      <>
        <tr className='entry'>
          <td>
            {
              this.props.data.children.length > 0 && 
              <DropdownCheckbox 
                ref={this.dropdownCheckbox}
                onChange={this.toggleChildren} />
            }
          </td>
          <FoodRowCell value={this.props.data.name} onChange={this.getOnChangeHandler('name')} />
          <td>
            <QuantityInput
                value={this.props.data.quantity}
                onChange={this.getOnChangeHandler('quantity')}
                onKeyPress={this.handleKeyPress}
                onScale={this.handleQuantityScale}/>
          </td>
          <FoodRowCell value={this.props.data.calories} onChange={this.getOnChangeHandler('calories')} />
          <FoodRowCell value={this.props.data.protein} onChange={this.getOnChangeHandler('protein')} />
          <td className='select'>
            <Checkbox checked={selected.has(this.props.data.id)}
              onChange={()=>this.props.onToggleSelected(this.props.data.id)} />
          </td>
        </tr>
        {this.state.expanded && this.props.data.children.length > 0 && 
          this.props.data.children.map(function(child){
            return (<FoodRow key={child.id} 
                data={child}
                selected={selected}
                onToggleSelected={that.props.onToggleSelected}
                onChange={that.handleChildrenChange}/>);
          })
        }
      </>
    );
  }
}

class FoodRowCell extends Component {
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }
  render() {
    return (
      <td>
        <input type='text' 
          value={this.props.value}
          onChange={this.props.onChange}
          onKeyPress={this.handleKeyPress}
          ref={x=>this.ref=x}/>
      </td>
    );
  }
}

class ConnectedFoodTable extends Component {
  constructor(props){
    super(props)
    this.state = {
      selected: new Set()
    };
    this.deleteSelectedEntries = this.deleteSelectedEntries.bind(this);
    this.handleToggleSelected = this.handleToggleSelected.bind(this);

    this.props.fetchData(this.props.date);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.date !== this.props.date) {
      this.props.fetchData(this.props.date);
    }
  }
  handleToggleSelected(entryId) {
    /* Callback to be triggered when an entry has been selected. */
    var setCopy = new Set(this.state.selected);
    if (this.state.selected.has(entryId)){
      setCopy.delete(entryId);
    } else {
      setCopy.add(entryId);
    }
    this.setState({
      selected: setCopy
    });
  }
  deleteSelectedEntries(event) {
    event.preventDefault();
    var that = this;
    this.props.deleteEntry(Array.from(this.state.selected).map(id => {return {id: id}}))
      .then(function(response) {
        that.setState({
          selected: new Set()
        });
        that.props.fetchData(that.props.date);
      });
  }
  render() {
    var that = this;
    let controls = null;
    if (this.state.selected.size === 1) {
      controls = (
        <>
          <Link to='#' onClick={this.deleteSelectedEntries}><i className="material-icons action">delete</i></Link>
          <FileUploadDialog onUpload={this.handlePhotoUpload} files={[/*TODO*/]}/>
          <i className='material-icons action'>date_range</i>
        </>
      );
    } else if (this.state.selected.size > 1) {
      controls = (
        <>
          <Link to='#' onClick={this.deleteSelectedEntries}><i className="material-icons action">delete</i></Link>
          <i className='material-icons action'>date_range</i>
        </>
      );
    }
    let status = null;
    if (this.props.loadingStatus) {
      switch (this.props.loadingStatus.status) {
        case 'loading':
          status = (
            <tr className='status'>
              <td colSpan='999'>LOADING</td>
            </tr>
          );
          break;
        case 'loaded':
          if (this.props.entries.length === 0) {
            status = (
              <tr className='status'>
                <td colSpan='999'>
                  <div>
                    You have not yet recorded any food for today.
                  </div>
                </td>
              </tr>
            );
          }
          break;
        case 'error':
          status = (
            <tr className='status'>
              <td colSpan='999'>Error: {this.props.loadingStatus.error}</td>
            </tr>
          );
          break;
        default:
          status = null;
          break;
      }
    }
    return (
      <div className='food-table'>
        <div className='controls'>
          <div className='table-controls'>
          </div>
          <div className='entry-controls'>
            {controls}
          </div>
        </div>
        <table className="Food cards">
          <colgroup>
            <col className='expand' />
            <col className='item'/>
            <col className='numbers'/>
            <col className='numbers'/>
            <col className='numbers'/>
            <col className='actions' />
          </colgroup>
          <thead>
          <tr>
            <td>{this.props.dirty ? <i className='material-icons spin' alt='Saving changes...'>autorenew</i> : <i className='material-icons' alt='Changes saved'>check</i>}</td>
            <th>Item</th>
            <th>Quantity</th>
            <th>Calories</th>
            <th>Protein</th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          <tr className='total'>
            <td></td>
            <th>Total</th>
            <td></td>
            <td data-label='Cals'>{this.props.total.calories}</td>
            <td data-label='Prot'>{this.props.total.protein}</td>
            <td></td>
          </tr>
          <FoodRowNewEntry date={this.props.date} />
          {
            this.props.entries.map(function(entry){
              return <FoodRow key={entry.id}
                          data={entry}
                          selected={that.state.selected}
                          onToggleSelected={that.handleToggleSelected}
                          onChange={that.props.updateData}/>
            })
          }
          { status }
          </tbody>
        </table>
      </div>
    );
  }
}
const FoodTable = connect(
  function(state, ownProps) {
    let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: ownProps.date});
    let entities = Object.values(state.food.entities).filter(
      entity => entity && entity.date === ownProps.date
    );
    let entitiesWithoutParent = entities.filter(entity => !entity.parent_id);
    function computeTotal(entities, property) {
      return entities.map(function(entity) {
        if (entity[property]) {
          return entity[property];
        } else {
          return computeTotal(entity.children, property);
        }
      }).filter(
        val => val && isFinite(val)
      ).reduce(
        (acc, val) => acc+parseFloat(val), 0
      );
    }
    return {
      loadingStatus,
      entries: entitiesWithoutParent,
      total: {
        calories: computeTotal(entitiesWithoutParent, 'calories'),
        protein: computeTotal(entitiesWithoutParent, 'protein'),
      },
      dirty: state.food.dirtyEntities.size > 0
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchData: date => dispatch(foodActions['fetchMultiple']({date: date})),
      updateData: entry => dispatch(foodActions['update'](entry)),
      deleteEntry: ids => dispatch(foodActions['deleteMultiple'](ids))
    };
  }
)(ConnectedFoodTable);

class ConnectedEntryEditorForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.selectedEntry || null,
      selectingPhoto: false,
      successMessage: null,
      errorMessage: null,
      searchString: '',
      searchLoading: false,
      searchResults: {},
      searchSelectedEntry: null
    };
    this.addEntry = this.addEntry.bind(this);
    this.onChange = this.onChange.bind(this);
    this.handleChildrenChange = this.handleChildrenChange.bind(this);
    this.handleNewChild = this.handleNewChild.bind(this);
    this.uploadFile = this.uploadFile.bind(this);

    this.renderMainEntry = this.renderMainEntry.bind(this);
    this.renderAutocompleteTable = this.renderAutocompleteTable.bind(this);
    this.renderChildEntries = this.renderChildEntries.bind(this);
    this.renderPhotos = this.renderPhotos.bind(this);
    this.renderPhotoSelector = this.renderPhotoSelector.bind(this);

    this.openAutocomplete = this.openAutocomplete.bind(this);
    this.closeAutocomplete = this.closeAutocomplete.bind(this);
    this.handleAutocompleteMainEntry = this.handleAutocompleteMainEntry.bind(this);
    this.handleAutocompleteChildren = this.handleAutocompleteChildren.bind(this);
    this.search = this.search.bind(this);
    this.handleSearchSelect = this.handleSearchSelect.bind(this);

    if (!this.selectedEntry) {
      this.props.fetchFoodByDate(this.props.date);
      this.props.fetchPhotosByDate(this.props.date);
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    let foodStatusChanged = prevProps.foodLoadingStatus !== this.props.foodLoadingStatus;
    let photoStatusChanged = prevProps.photoLoadingStatus !== this.props.photoLoadingStatus;
    let dateChanged = prevProps.date !== this.props.date;
    // Load food entry
    if (!this.state.data && prevProps.selectedEntry !== this.props.selectedEntry) {
      this.setState({
        data: {...this.props.selectedEntry}
      });
      return; // Prevent multiple setState calls in one update cycle
    }
    // Clear photos if the date changed
    if (dateChanged) {
      this.setState({
        data: {
          ...this.state.data,
          photo_id: null,
          photo_group_id: null
        }
      });
    }
    // Load food/photo data
    if (dateChanged) {
      this.props.fetchFoodByDate(this.props.date);
      this.props.fetchPhotosByDate(this.props.date);
    }
  }

  newEntryByPhotoId(photoId) {
    this.setState({
      data: {
        id: null,
        name: '',
        time: '',
        quantity: '',
        calories: '',
        protein: '',
        photo_ids: [photoId],
        photo_id: photoId,
        photo_group_id: null,
        children: [],
      }
    });
  }
  newEntryByGroupId(groupId) {
    groupId = parseInt(groupId);
    let photoIds = Object.keys(this.props.photos).filter(
      id => this.props.photos[id].group_id === groupId
    );
    this.setState({
      data: {
        id: null,
        name: '',
        time: '',
        quantity: '',
        calories: '',
        protein: '',
        photo_ids: photoIds,
        photo_id: null,
        photo_group_id: groupId,
        children: [],
      }
    });
  }

  addEntry(e) {
    e.preventDefault();
    // Submit entry to server
    let onSubmit = this.props.createFoodEntry;
    if (this.state.id) {
      onSubmit = this.props.updateFoodEntry;
    }
    let that = this;
    onSubmit({
      id: this.state.data.id,
      date: this.props.date,
      time: this.state.data.time,
      name: this.state.data.name,
      quantity: this.state.data.quantity,
      calories: this.state.data.calories,
      protein: this.state.data.protein,
      photo_id: this.state.data.photo_id,
      photo_group_id: this.state.data.photo_group_id,
      children: this.state.data.children
    }).then(function(response){
      // Clear form
      that.setState({
        data: {
          id: null,
          name: '',
          time: '',
          quantity: '',
          calories: '',
          protein: '',
          photo_id: null,
          photo_group_id: null,
          children: []
        },
        successMessage: 'Entry created successfully!'
      });
    }).catch(function(error){
      that.setState({
        errorMessage: error.repsonse.data.error
      });
    });
  }
  onChange(e) {
    this.setState({
      data: {
        ...this.state.data,
        [e.target.name]: e.target.value
      },
      successMessage: null,
      errorMessage: null
    });
  }
  handleChildrenChange(data) {
    this.setState({
      data: {
        ...this.state.data,
        children: data
      }
    });
  }
  handleNewChild() {
    let newEntry = {
      name: ''
    };
    this.setState({
      data: {
        ...this.state.data,
        children: [...this.state.data.children, newEntry]
      }
    });
  }
  uploadFile(event) {
    let that = this;
    let target = event.target;
    this.props.uploadPhoto(target.files)
    .then(function(response){
      target.value = "";
      that.setState({
        photo_ids: [...that.state.photo_ids, response.data.id]
      });
    });
  }

  openAutocomplete() {
    this.setState({
      showAutocompleteTable: true
    });
  }
  closeAutocomplete() {
    this.setState({
      showAutocompleteTable: false
    });
  }
  handleAutocompleteMainEntry(entryData) {
    this.setState({
      data: {
        ...this.state.data,
        ...entryData
      },
      showAutocompleteTable: false
    });
  }
  handleAutocompleteChildren() {
    let [key,index] = this.state.searchSelectedEntry;
    let entryData = this.state.searchResults[key][index];
    this.setState({
      data: {
        ...this.state.data,
        children: [
          ...this.state.data.children,
          entryData
        ]
      },
      showAutocompleteTable: false
    });
  }
  search() {
    if (!this.state.searchString || this.state.searchString.length === 0) {
      this.setState({
        searchLoading: true,
        searchResults: {}
      });
      return;
    }
    var that = this;
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/foods/search?q="+encodeURI(this.state.searchString),
      {withCredentials: true}
    ).then(function(response){
      that.setState({
        searchResults: response.data,
        searchLoading: false
      });
    }).catch(function(error){
      console.error(error);
    });
  }
  handleSearchSelect(key, index) {
    if (this.state.searchSelectedEntry) {
      if (this.state.searchSelectedEntry[0] === key && this.state.searchSelectedEntry[1] === index) {
        this.setState({
          searchSelectedEntry: null
        });
      } else {
        this.setState({
          searchSelectedEntry: [key, index]
        });
      }
    } else {
      this.setState({
        searchSelectedEntry: [key, index]
      });
    }
  }

  renderMainEntry() {
    if (this.state.data) {
      return (
        <div className='main-entry'>
          <h3>Entry Details</h3>
          <label>
            <span>Date</span>
            <input type='date' name='date' value={this.props.date} onChange={()=>null}/>
          </label>
          <label>
            <span>Time</span>
            <input type='time' name='time' value={this.state.data.time || undefined} onChange={this.onChange}/>
          </label>
          <label>
            <span>Item name</span>
            <FoodNameInput name='name' value={this.state.data.name || undefined} onChange={this.onChange} onSelect={this.handleAutocompleteMainEntry} />
          </label>
          <label>
            <span>Quantity</span>
            <input type='text' name='quantity' value={this.state.data.quantity || undefined} onChange={this.onChange}/>
          </label>
          <label>
            <span>Calories</span>
            <input type='text' name='calories' value={this.state.data.calories || undefined} onChange={this.onChange}/>
          </label>
          <label>
            <span>Protein</span>
            <input type='text' name='protein' value={this.state.data.protein || undefined} onChange={this.onChange}/>
          </label>
          <button onClick={this.addEntry}>{this.state.data.id ? "Save Changes" : "Create Entry"}</button>
        </div>
      );
    } else {
      return (
        <div className='main-entry'>
          <h3>Entry Details</h3>
          No data
        </div>
      );
    }
  }
  renderAutocompleteTable() {
    let loadingMessage = null;
    if (this.state.searchLoading) {
      loadingMessage = (<tr><td colSpan='999'>LOADING...</td></tr>);
    }
    let resultsBySection = {};
    let that = this;
    if (this.state.searchResults) {
      let entries = Object.entries(this.state.searchResults);
      console.log(entries);
      for (let [key,vals] of entries) {
        resultsBySection[key] = vals.map(function(val, index){
          let isSelected = (that.state.searchSelectedEntry &&
              that.state.searchSelectedEntry[0] === key &&
              that.state.searchSelectedEntry[1] === index);
          return (<tr key={index} onClick={() => that.handleSearchSelect(key,index)} className={isSelected ? 'selected' : ''}>
            <td>{val.date}</td>
            <td>{val.name}</td>
            <td>{val.quantity}</td>
            <td>{val.calories}</td>
            <td>{val.protein}</td>
          </tr>);
        });
      }
    }
    let results = null;
    if (resultsBySection['recent']) {
      results = (<>
        {results}
        <tr><td colSpan='999'>Recent</td></tr>
        {resultsBySection['recent']}
      </>);
    }
    if (resultsBySection['history']) {
      results = (<>
        {results}
        <tr><td colSpan='999'>History</td></tr>
        {resultsBySection['history']}
      </>);
    }
    return (
      <div className='autocomplete'>
        <div className='search'>
          <input type='text' value={this.state.searchString} onChange={(e)=>{this.setState({searchString: e.target.value})}} />
          <button onClick={this.search}>Search</button>
        </div>
        <div className='search-table'>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Calories</th>
                <th>Protein</th>
              </tr>
            </thead>
            <tbody>
              {loadingMessage}
              {results}
            </tbody>
          </table>
        </div>
        <button onClick={this.closeAutocomplete}>Cancel</button>
        {this.state.searchSelectedEntry ? <button onClick={this.handleAutocompleteChildren}>Add</button> : <button className='disabled'>Add</button>}
      </div>
    );
  }
  renderChildEntries() {
    if (this.state.data) {
      return (
        <div className='children-entries'>
          <h3>Children Entries</h3>
          <p> {"What is contained in this meal? Enter the components and we'll sum it up for you!"} </p>
          <SmallTable data={this.state.data.children} onChange={this.handleChildrenChange} />
          <button onClick={this.handleNewChild}>New Component</button>
          <button onClick={this.openAutocomplete}>Search</button>
        </div>
      );
    } else {
      return (
        <div className='children-entries'>
          <h3>Children Entries</h3>
          No data
        </div>
      );
    }
  }
  renderPhotos() {
    let photoLoadingStatus = this.props.photoLoadingStatus || {};
    if (photoLoadingStatus.status === 'loaded') {
      let photoIds = [];
      if (this.state.data.photo_id) {
        photoIds = [this.state.data.photo_id];
      } else if (this.state.data.photo_group_id) {
        photoIds = Object.keys(this.props.photos).filter(
          id => this.props.photos[id].group_id == this.state.data.photo_group_id
        );
      }
      return (
        <div className='photos'>
          <h3>Photos</h3>
          <ThumbnailsList ids={photoIds}/>
          <button onClick={()=>this.setState({selectingPhoto: true})}>{'Select photo'}</button>
        </div>
      );
    } else if (photoLoadingStatus.status === 'loading') {
      return (
        <div className='photos'>
          <h3>Photos</h3>
          LOADING...
        </div>
      );
    } else {
      return (
        <div className='photos'>
          <h3>Photos</h3>
          <div className='error-message'>Unknown status</div>
        </div>
      );
    }
  }
  renderPhotoSelector() {
    let disabledPhotos = new Set();
    let disabledGroups = new Set();
    for (let [id,entry] of Object.entries(this.props.food)) {
      if (parseInt(id) === this.state.data.id) {
        continue;
      }
      if (entry.photo_group_id) {
        disabledGroups.add(entry.photo_group_id);
      } else if (entry.photo_id) {
        disabledPhotos.add(entry.photo_id);
      }
    }
    return (
      <div className='photos'>
        <h3>Photos</h3>
        <Gallery date={this.props.date}
            uid={this.props.uid}
            disabledPhotos={disabledPhotos}
            disabledGroups={disabledGroups}
            selectedPhotoId={this.state.data.photo_id}
            selectedGroupId={this.state.data.photo_group_id}
            onSelectPhoto={id => this.setState({
              data: {...this.state.data, photo_id: id, photo_group_id: null}
            })}
            onSelectGroup={id => this.setState({
              data: {...this.state.data, photo_id: null, photo_group_id: id}
            })}/>
        <button onClick={()=>this.setState({selectingPhoto: false})}>{'< Back'}</button>
      </div>
    );
  }
  render() {
    if (this.state.data) {
      if (this.state.showAutocompleteTable) {
        return (
          <div className='entry-editor-form'>
            <div className='success-message'>{this.state.successMessage}</div>
            <div className='error-message'>{this.state.errorMessage}</div>
            {this.renderAutocompleteTable()}
          </div>
        );
      } else {
        return (
          <div className='entry-editor-form'>
            <div className='success-message'>{this.state.successMessage}</div>
            <div className='error-message'>{this.state.errorMessage}</div>
            {this.renderMainEntry()}
            <div>
              {this.renderChildEntries()}
              {this.state.selectingPhoto ? this.renderPhotoSelector() : this.renderPhotos()}
            </div>
          </div>
        );
      }
    } else {
      return (
        <div className='entry-editor-form'>
          ...
        </div>
      );
    }
  }
}
const EntryEditorForm = connect(
  function(state, ownProps) {
    let date = ownProps.date;
    // Diet
    let food= Object.keys(state.food.entities).filter(
      id => state.food.entities[id].date === date
    ).map(
      id => state.food.entities[id]
    ).reduce(
      (acc, entity) => ({...acc, [entity.id]: entity}),
      {}
    );
    let foodLoadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date})
    // Photos
    let photos = Object.keys(state.photos.entities).filter(
      id => state.photos.entities[id].date === date
    ).map(
      id => state.photos.entities[id]
    ).reduce(
      (acc, entity) => ({...acc, [entity.id]: entity}),
      {}
    );
    let photoLoadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date})
    // Loaded entry
    let selectedEntry = null;
    if (foodLoadingStatus && foodLoadingStatus.status === 'loaded') {
      if (ownProps.id) {
        selectedEntry = food[ownProps.id];
      } else if (ownProps.photo_id) {
        for(let [k,v] of Object.entries(food)) {
          if (v.photo_id === parseInt(ownProps.photo_id)) {
            selectedEntry = v;
            break;
          }
        }
        if (!selectedEntry) {
          selectedEntry = {
            id: null,
            name: '',
            time: '',
            quantity: '',
            calories: '',
            protein: '',
            photo_id: ownProps.photo_id,
            photo_group_id: null,
            children: [],
          };
        }
      } else if (ownProps.group_id) {
        for(let [k,v] of Object.entries(food)) {
          if (v.photo_group_id === parseInt(ownProps.group_id)) {
            selectedEntry = v;
            break;
          }
        }
        if (!selectedEntry) {
          selectedEntry = {
            id: null,
            name: '',
            time: '',
            quantity: '',
            calories: '',
            protein: '',
            photo_id: null,
            photo_group_id: ownProps.group_id,
            children: [],
          };
        }
      } else {
        selectedEntry = {
          id: null,
          name: '',
          time: '',
          quantity: '',
          calories: '',
          protein: '',
          photo_id: null,
          photo_group_id: null,
          children: [],
        };
      }
    }

    return {
      food,
      photos,
      foodLoadingStatus,
      photoLoadingStatus,
      selectedEntry
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchFoodByDate: date => dispatch(foodActions['fetchMultiple']({date})),
      fetchPhotosByDate: date => dispatch(photoActions['fetchMultiple']({date})),
      createFoodEntry: data => dispatch(foodActions['create'](data)),
      updateFoodEntry: data => dispatch(foodActions['updateNow'](data)),
      uploadPhoto: (files) => dispatch(
        photoActions['create'](files, ownProps.date)
      ),
    };
  }
)(ConnectedEntryEditorForm);

class SmallTable extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(data, index) {
    if (this.props.onChange) {
      let updatedData = [
        ...this.props.data,
      ];
      updatedData[index] = data;
      this.props.onChange(updatedData);
    }
  }
  render() {
    let that = this;
    let emptyRow = null;
    if (this.props.data.length === 0) {
      emptyRow = (
        <tr><td colSpan='999'>{'There are not child entries to show.'}</td></tr>
      );
    }
    return (
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Calories</th>
            <th>Protein</th>
          </tr>
        </thead>
        <tbody>
          {this.props.data.map(function(datum, index){
            return <SmallTableRow
              key={index}
              data={datum} 
              onChange={x => that.handleChange(x, index)} />
          })}
          {emptyRow}
        </tbody>
      </table>
    );
  }
}

class SmallTableRow extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(e) {
    if (this.props.onChange) {
      let data = {
        ...this.props.data,
        [e.target.name]: e.target.value
      };
      this.props.onChange(data);
    }
  }
  render() {
    return (
      <tr>
        <td><FoodNameInput onChange={this.handleChange} name='name' value={this.props.data.name} /></td>
        <td><input type='text' onChange={this.handleChange} name='quantity' value={this.props.data.quantity} /></td>
        <td><input type='text' onChange={this.handleChange} name='calories' value={this.props.data.calories} /></td>
        <td><input type='text' onChange={this.handleChange} name='protein' value={this.props.data.protein} /></td>
      </tr>
    );
  }
}
