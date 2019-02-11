import React, { Component } from 'react';
import { Route, Link, Switch } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { connect } from "react-redux";

import { 
  getLoadingStatus
} from './Utils.js';
import { 
  foodActions,
  photoActions,
  photoGroupActions
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
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.location.search !== this.props.location.search) {
      var queryParams = parseQueryString(this.props.location.search);
      if (!queryParams['date']) {
        queryParams['date'] = formatDate(new Date());
        this.props.history.push(dictToQueryString(queryParams));
      }
      this.setState({
        params: queryParams
      });
    }
  }
  handleDateChange(date) {
    var params = this.state.params;
    params.date = formatDate(date);
    this.props.history.push(dictToQueryString(params));
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
  render() {
    if (!this.state.params.date || !this.state.params.uid) {
      return null;
    }
    return (
      <main className='diet-page-container'>
        <div className='background'>
        </div>
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
          <Route path="/food/photos" render={() => <Gallery date={this.state.params.date} uid={this.state.params.uid}/>} />
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
    this.newEntry = this.newEntry.bind(this);
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
    this.props.uploadPhoto(event.target.files);
  }
  createGroup() {
    this.props.createGroup();
    this.setState({
      groups: [...this.state.groups, []]
    });
  }
  handleDragOver(event) {
    event.preventDefault();
    console.log('drag over');
  }
  handleDrop(event, groupId) {
    event.stopPropagation();
    var photoId = event.dataTransfer.getData('photoId');
    this.props.updatePhoto({
      ...this.props.photos[photoId],
      group_id: groupId
    });
    console.log('drop '+photoId+' '+groupId);
  }
  handleDragStart(event, photoId) {
    console.log('drag start');
    event.dataTransfer.setData('photoId', photoId);
  }
  newEntry() {
    if (this.state.selectedPhotoId) {
      this.props.createFood({
        name: 'Food',
        date: this.props.date,
        photo_id: this.state.selectedPhotoId
      });
    } else if (this.state.selectedGroupId) {
      this.props.createFood({
        name: 'Food 2',
        date: this.props.date,
        photo_group_id: this.state.selectedGroupId
      });
    }
  }
  render() {
    var that = this;
    if (this.props.groups) {
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
            <i className='material-icons action' onClick={this.newEntry}>playlist_add</i>
          </>
        );
      }
      // Render thumbnails
      var thumbnails = {};
      for (var k in this.props.groups) {
        if (k === 'null') {
          thumbnails[k] = this.props.groups[k].map(function(photoId){
            return (
              <div className='photo-viewer-thumbnail'
                  key={photoId}
                  onClick={()=>that.handleSelectPhoto(photoId)}
                  onDragStart={(e) => that.handleDragStart(e,photoId)}
                  draggable>
                <FoodPhotoThumbnail fileid={photoId}
                    selected={that.state.selectedPhotoId === photoId}/>
              </div>
            );
          });
        } else {
          thumbnails[k] = this.props.groups[k].map(function(photoId){
            return (
              <div className='photo-viewer-thumbnail'
                  key={photoId}
                  onDragStart={(e) => that.handleDragStart(e,photoId)}
                  draggable>
                <FoodPhotoThumbnail fileid={photoId} />
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
            var classNames = ['thumbnail', 'group'];
            if (that.state.selectedGroupId === groupId) {
              classNames.push('selected');
            }
            classNames = classNames.join(' ');
            let groupThumbnails = thumbnails[groupId];
            if (groupThumbnails.length === 0) {
              groupThumbnails = noThumbnails;
            }
            return (
              <div className={classNames}
                  onClick={()=>that.handleSelectGroup(groupId)}
                  onDragOver={that.handleDragOver}
                  onDrop={(e)=>that.handleDrop(e,groupId)}>
                {groupThumbnails}
              </div>
            );
          }
        );
      }
      // Render nutrition table for selected group or photo
      let nutritionTable = null;
      if (this.state.selectedPhotoId) {
        nutritionTable = (
          <GalleryNutritionTable
              date={this.props.date}
              photoId={this.state.selectedPhotoId}/>
        );
      } else if (this.state.selectedGroupId) {
        nutritionTable = (
          <GalleryNutritionTable
              date={this.props.date}
              groupId={this.state.selectedGroupId}/>
        );
      }
      return (
        <div className='gallery' onDragOver={that.handleDragOver} onDrop={(e)=>that.handleDrop(e,null)}>
          <div className='controls'>{controls}</div>
          <div className='thumbnails'>
            {thumbnails[null]}
            {groups}
          </div>
          {nutritionTable}
        </div>
      );
    } else {
      return (
        <div>
          <div className='thumbnail loading'></div>
          <div className='thumbnail group loading'>
            <div className='thumbnail loading'></div>
            <div className='thumbnail loading'></div>
            <div className='thumbnail loading'></div>
          </div>
          <div className='thumbnail loading'></div>
          <div className='thumbnail loading'></div>
          <div className='thumbnail new-thumbnail loading'>
            <label>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.uploadFile}/>
              <i className='material-icons action'>add_a_photo</i>
            </label>
          </div>
          <GalleryNutritionTable date={this.props.date} photoId={null}/>
        </div>
      );
    }
  }
}
const Gallery = connect(
  function(state, ownProps) {
    console.log(state.photoGroups.entities);
    if (ownProps.date) {
      var groupIds = Object.keys(state.photoGroups.entities)
        .filter(function(id) {
          return state.photoGroups.entities[id].date === ownProps.date;
        });
      let photoIdsByGroup = null;
      if (groupIds) {
        // Init photo IDs by photo group
        photoIdsByGroup = groupIds.reduce(function(acc,id) {
          acc[id] = [];
          return acc;
        }, {null: []});
        // Populate with photo IDs
        var photoIds = Object.keys(state.photos.entities)
          .filter(function(id) {
            return state.photos.entities[id].date === ownProps.date;
          });
        var photos = {};
        photoIds.forEach(function(photoId){
          // Add photo ID to the appropriate group
          var photo = state.photos.entities[photoId];
          photoIdsByGroup[photo.group_id].push(parseInt(photoId));
          // Add photo to the dictionary of photos
          photos[photoId] = state.photos.entities[photoId];
        });
      }
      return {
        groups: photoIdsByGroup,
        photos: photos
      };
    }
    return {
      groups: {},
      photos: {}
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchPhotos: (uid) => dispatch(
        photoActions['fetchMultiple']({user_id: uid, date: ownProps.date})
      ),
      fetchGroups: () => dispatch(
        photoGroupActions['fetchMultiple']({date: ownProps.date})
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

class ConnectedGalleryNutritionTable extends Component {
  constructor(props) {
    super(props);
    // TODO: Check if data is already loaded
    this.props.fetchFood();

    this.newEntry = this.newEntry.bind(this);
    this.renderLoading = this.renderLoading.bind(this);
    this.renderData = this.renderData.bind(this);
  }
  newEntry() {
    if (this.props.photoId) {
      this.props.createFood({
        name: 'Food',
        date: this.props.date,
        photo_id: this.props.photoId
      });
    } else if (this.props.groupId) {
      this.props.createFood({
        name: 'Food 2',
        date: this.props.date,
        photo_group_id: this.props.groupId
      });
    }
  }
  render() {
    if (this.props.entries) {
      return this.renderData();
    } else {
      return this.renderLoading();
    }
  }
  renderData() {
    var entries = this.props.entries.map(function(entry){
      return (
        <div className='entry' key={entry.id}>
          <div className='values'>
            <div>{entry.name}</div>
            <div><span>QTY:</span> {entry.quantity}</div>
            <div><span>CALS:</span> {entry.calories}</div>
            <div><span>PROT:</span> {entry.protein}</div>
          </div>
        </div>
      );
    })
    return (
      <div className='gallery-nutrition-table-container'>
        <div className='table'>
          {entries}
          <div className='new-entry' onClick={this.newEntry}>
            New Entry
          </div>
        </div>
      </div>
    );
  }
  renderLoading() {
    return (
      <div className='gallery-nutrition-table-container'>
        {this.props.entries}
        <div className='table loading'>
          <div className='entry'>
            <div className='values'>
              <div>Example item</div>
              <div><span>QTY:</span> 100g</div>
              <div><span>CALS:</span> 500</div>
              <div><span>PROT:</span> 15</div>
            </div>
          </div>
          <div className='entry'>
            <div className='values'>
              <div>Another example</div>
              <div><span>QTY:</span> 1 cup</div>
              <div><span>CALS:</span> 150</div>
              <div><span>PROT:</span> 0</div>
            </div>
          </div>
          <div className='entry'>
            <div className='values'>
              <div>Parent entry</div>
              <div><span>QTY:</span> -</div>
              <div><span>CALS:</span> 500</div>
              <div><span>PROT:</span> 15</div>
            </div>
            <div className='entry'>
              <div className='values'>
              <div>Child entry</div>
              <div><span>QTY:</span> 2</div>
              <div><span>CALS:</span> 50</div>
              <div><span>PROT:</span> 1</div>
              </div>
            </div>
            <div className='entry'>
              <div className='values'>
              <div>Child entry</div>
              <div><span>QTY:</span> 2</div>
              <div><span>CALS:</span> 50</div>
              <div><span>PROT:</span> 1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
const GalleryNutritionTable = connect(
  function(state, ownProps) {
    var photoId = ownProps.photoId;
    var groupId = ownProps.groupId;
    var date = ownProps.date;
    var entriesByDate = state.food.by.date || {};
    entriesByDate = entriesByDate[date];
    if (!entriesByDate) {
      return {
        entries: null
      };
    }

    var entries;
    if (photoId) {
      entries = entriesByDate
        .filter(id => parseInt(state.food.entities[id].photo_id) === parseInt(photoId))
        .map(id => state.food.entities[id]);
    } else if (groupId) {
      entries = entriesByDate
        .filter(function(id) {
          let food = state.food.entities[id];
          // Check if the entry is associated with the current group
          if (parseInt(food.photo_group_id) === parseInt(groupId)) {
            return true;
          }
          // Check if the entry is associated with a photo in the current group
          var photo = state.photos.entities[food.photo_id];
          if (photo && parseInt(photo.group_id) === parseInt(groupId)) {
            return true;
          }
          return false;
        })
        .map(id => state.food.entities[id]);
    }
    return {
      entries: entries
    };
  },
  function(dispatch, ownProps) {
    return {
      fetchFood: () => dispatch(foodActions['fetchMultiple']({date: ownProps.date})),
      createFood: (data) => dispatch(foodActions['create'](data))
    };
  }
)(ConnectedGalleryNutritionTable);

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
                  return <FoodPhotoThumbnail key={file} fileid={file}/>
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
    if (prevState.selected !== this.state.selected) {
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
    if (this.props.value.length === 0) {
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
            suggestions: response.data,
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
    if (this.props.value.length > 0 && this.state.focused) {
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
        {inputField}
        {s}
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
    console.log('File uploaded');
    console.log(photoIds);
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

class ConnectedFoodRow extends Component {
  constructor(props) {
    super(props);
    this.state = { // Keep a copy of the data
      data: {
        ...props.data
      },
      dirty: false,
      expanded: false
    };

    if (this.props.data.photo_group_id) {
      this.props.fetchPhotos(this.props.data.photo_group_id);
    }

    this.dropdownCheckbox = React.createRef();
    this.toggleChildren = this.toggleChildren.bind(this);
    this.handleQuantityScale = this.handleQuantityScale.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.data !== this.props.data) {
      // Find the places where it changed. and update the state.
      // If the value in the state is different from the previous props, it means it was edited by the user, and they probably want to keep the new value.
      let data = {
        ...this.state.data
      };
      let newProps = this.props.data;
      Object.keys(this.props.data).forEach(function(key){
        if (data[key] === prevProps[key]) {
          data[key] = newProps[key];
        }
      });
      this.setState({data: data});
    }
  }
  getOnUpdateHandler(propName) {
    var that = this;
    return function(e) {
      // Update entry values
      var updatedEntry = {
        ...that.state.data,
        [propName]: e.target.value
      }
      that.setState({
        data: updatedEntry
      });
      that.props.updateEntry(that.props.id, updatedEntry);
    }
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
    }
    var prot = this.state.data.protein;
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
              this.state.data.children.length > 0 && 
              <DropdownCheckbox 
                ref={this.dropdownCheckbox}
                onChange={this.toggleChildren} />
            }
          </td>
          <FoodRowCell value={this.state.data.name} onChange={this.getOnUpdateHandler('name')} />
          <td>
            <QuantityInput
                value={this.state.data.quantity}
                onChange={this.getOnUpdateHandler('quantity')}
                onKeyPress={this.handleKeyPress}
                onScale={this.handleQuantityScale}/>
          </td>
          <FoodRowCell value={this.state.data.calories} onChange={this.getOnUpdateHandler('calories')} />
          <FoodRowCell value={this.state.data.protein} onChange={this.getOnUpdateHandler('protein')} />
          <td className='select'>
            <Checkbox checked={selected.has(that.props.id)}
              onChange={()=>this.props.onToggleSelected(this.props.id)} />
          </td>
        </tr>
        {this.state.expanded && this.state.data.children.length > 0 && 
          this.state.data.children.map(function(child){
            return (<FoodRow data={child} id={child.id} selected={selected} />);
          })
        }
      </>
    );
  }
}
const FoodRow = connect(
  function(state, ownProps) {
    if (ownProps.data) {
      return {};
    }

    var entry = state.food.entities[ownProps.id];
    let photo_ids = [];
    if (entry.photo_group_id) {
      let byGroupId = state.photos.by.group_id || {};
      photo_ids = byGroupId[entry.photo_group_id];
    } else if (entry.photo_id) {
      photo_ids = [entry.photo_id];
    }
    return {
      data: {
        id: entry.id,
        date: entry.date || '',
        name: entry.name || '',
        quantity: entry.quantity || '',
        calories: entry.calories || '',
        protein: entry.protein || '',
        photo_id: entry.photo_id || null,
        photo_group_id: entry.photo_group_id || null,
        photo_ids: photo_ids,
        children: entry.children || []
      }
    }
  },
  function(dispatch, ownProps) {
    return {
      updateEntry: (id, data) => dispatch(foodActions['update'](data)),
      fetchPhotos: (group_id) => dispatch(photoActions['fetchMultiple']({group_id}))
    };
  }
)(ConnectedFoodRow);

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
    //this.state.children = [
    //  {"id":1,"date":"2018-08-26","name":"asdf","quantity":"","calories":1,"protein":9,"photos":[]},
    //  {"id":2,"date":"2018-08-26","name":"asdf","quantity":"","calories":1,"protein":9,"photos":[], "children": 
    //    [{"id":3,"date":"2018-08-26","name":"child item","quantity":"","calories":1,"protein":9,"photos":[]},
    //    {"id":4,"date":"2018-08-26","name":"child item 2","quantity":"","calories":1,"protein":9,"photos":[]}],
    //  }
    //];
    this.deleteSelectedEntries = this.deleteSelectedEntries.bind(this);
    this.handleToggleSelected = this.handleToggleSelected.bind(this);
    this.handlePhotoUpload = this.handlePhotoUpload.bind(this);

    this.props.updateData(this.props.date);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.date !== this.props.date) {
      this.props.updateData(this.props.date);
    }
  }
  handleToggleSelected(entryId) {
    /* Callback to be triggered when an entry has been selected. */
    console.log(entryId);
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
        that.props.updateData(that.props.date);
      });
  }
  handlePhotoUpload(photoId) {
    console.log('Photo Uploaded');
    console.log(photoId);
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
          if (this.props.ids.length === 0) {
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
            this.props.ids.map(function(id){
              return <FoodRow key={id}
                          id={id}
                          selected={that.state.selected}
                          onToggleSelected={that.handleToggleSelected}/>
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
    let byDate = state.food.by['date'] || {};
    let ids = byDate[ownProps.date] || [];
    ids = ids.filter(id => state.food.entities[id]); // Filter out deleted entries
    let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: ownProps.date});
    let entities = ids.map(id => state.food.entities[id]).filter(x => x);
    return {
      loadingStatus,
      ids: ids,
      total: {
        calories: entities.map(
            entity => entity.calories
          ).filter(
            val => val && isFinite(val)
          ).reduce(
            (acc, val) => acc+parseFloat(val), 0
          ),
        protein: entities.map(
            entity => entity.protein
          ).filter(
            val => val && isFinite(val)
          ).reduce(
            (acc, val) => acc+parseFloat(val), 0
          )
      },
      dirty: state.food.dirtyEntities.size > 0
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: date => dispatch(foodActions['fetchMultiple']({date: date})),
      deleteEntry: ids => dispatch(foodActions['deleteMultiple'](ids))
    };
  }
)(ConnectedFoodTable);

class ConnectedEntryEditorForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: null,
      name: '',
      date: this.props.date,
      time: '',
      quantity: '',
      calories: '',
      protein: '',
      photo_ids: [],
      childEntries: [],
      suggestion: {},
    };
    this.loadEntryById = this.loadEntryById.bind(this);
    this.loadEntryByPhotoId = this.loadEntryByPhotoId.bind(this);
    this.loadEntryByGroupId = this.loadEntryByGroupId.bind(this);
    this.addEntry = this.addEntry.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);
    this.handleChildrenChange = this.handleChildrenChange.bind(this);
    this.handleNewChild = this.handleNewChild.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleHighlight = this.handleHighlight.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleQuantityScale = this.handleQuantityScale.bind(this);
    this.uploadFile = this.uploadFile.bind(this);

    if (this.props.id) {
      this.loadEntryById(this.props.id);
    } else if (this.props.photo_id) {
      this.loadEntryByPhotoId(this.props.photo_id);
    } else if (this.props.group_id) {
      this.loadEntryByGroupId(this.props.group_id);
    }
  }

  loadEntryById(id) {
    const that = this;
    this.props.fetchFood(id).then(function(response){
      console.log('loadEntryById');
      console.log(response.data);
      let entry = response.data;
      that.setState({
        ...entry,
        childEntries: null
      });
    });
  }
  loadEntryByPhotoId(photoId) {
    const that = this;
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+'/data/photos/'+photoId+'/food',
      { withCredentials: true }
    ).then(function(response){
      console.log('loadEntryByPhotoId');
      console.log(response.data);
      let entries = response.data;
      if (entries.length === 0) {
        return;
      }
      let mainEntry = entries.filter(x => x.parent_id === null)[0];
      let childEntries = entries.filter(x => x.parent_id !== null);
      that.setState({
        ...mainEntry,
        childEntries
      });
    });
  }
  loadEntryByGroupId(groupId) {
  }

  addEntry(e) {
    e.preventDefault();
    // Submit entry to server
    var that = this;
    this.props.onSubmit({
      date: this.props.date,
      name: this.state.name,
      quantity: this.state.quantity,
      calories: this.state.calories,
      protein: this.state.protein,
      photo_ids: this.state.photo_ids,
      children: this.state.childEntries
    }).then(function(response){
      // Clear form
      that.setState({
        name: '',
        time: '',
        quantity: '',
        calories: '',
        protein: '',
        photo_ids: [],
        childEntries: []
      });
    });
  }
  onChange(e) {
    var x = {}
    x[e.target.name] = e.target.value;
    this.setState(x);
  }
  onFileUpload(photoIds) {
    console.log('File uploaded');
    console.log(photoIds);
    this.setState({
      photos: photoIds
    });
  }
  handleChildrenChange(data) {
    this.setState({
      childEntries: data
    })
  }
  handleNewChild() {
    let newEntry = {
      name: ''
    };
    this.setState({
      childEntries: [...this.state.childEntries, newEntry]
    })
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
      name: entry.name,
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
  render() {
    let mainEntry = (
      <div className='main-entry'>
        <h3>Entry Details</h3>
        <label>
          <span>Date</span>
          <input type='date' name='date' value={this.state.date}/>
        </label>
        <label>
          <span>Time</span>
          <input type='time' name='date' value={this.state.time} onChange={this.onChange}/>
        </label>
        <label>
          <span>Item name</span>
          <input type='text' name='name' value={this.state.name} onChange={this.onChange}/>
        </label>
        <label>
          <span>Quantity</span>
          <input type='text' name='quantity' value={this.state.quantity} onChange={this.onChange}/>
        </label>
        <label>
          <span>Calories</span>
          <input type='text' name='calories' value={this.state.calories} onChange={this.onChange}/>
        </label>
        <label>
          <span>Protein</span>
          <input type='text' name='protein' value={this.state.protein} onChange={this.onChange}/>
        </label>
        <button onClick={this.addEntry}>{this.state.id ? "Save Entry" : "Create Entry"}</button>
      </div>
    );
    let childEntries = (
      <div className='children-entries'>
        <h3>Children Entries</h3>
        <p> {"What is contained in this meal? Enter the components and we'll sum it up for you!"} </p>
        <SmallTable data={this.state.childEntries} onChange={this.handleChildrenChange} />
        <button onClick={this.handleNewChild}>New Component</button>
        <button>Sum</button>
      </div>
    );
    let photos = (
      <div className='photos'>
        <h3>Photos</h3>
        <ThumbnailsList ids={this.state.photo_ids}/>
        <input type='file' onChange={this.uploadFile} />
      </div>
    );
    return (
      <div className='entry-editor-form'>
        {mainEntry}
        <div>
          {childEntries}
          {photos}
        </div>
      </div>
    );
  }
}
const EntryEditorForm = connect(
  function(state, ownProps) {
    if (ownProps.id) {
      // Load entry and associated photo ids
      return {
        data: state.food.entities[ownProps.id]
      };
    } else if (ownProps.photo_id) {
      // Check if there's a food entry associated with that photo.
      // If there is, then load that entry.
      // If not, then we create a new entry.
      let byPhotoId = state.food.by.photo_id || {};
    } else if (ownProps.groupId) {
      // Check if there's a food entry associated with that photo group.
      // If there is, then load that entry.
      // If not, then we create a new entry.
    } else {
      // We're just creating a new entry with no preset values.
    }
    return {
      data: null
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchFood: id => dispatch(foodActions['fetchSingle'](id)),
      onSubmit: data => dispatch(foodActions['create'](data)),
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
        <tr><td colspan='999'>{'There are not child entries to show.'}</td></tr>
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
        <td><input type='text' onChange={this.handleChange} name='name' value={this.props.data.name} /></td>
        <td><input type='text' onChange={this.handleChange} name='quantity' value={this.props.data.quantity} /></td>
        <td><input type='text' onChange={this.handleChange} name='calories' value={this.props.data.calories} /></td>
        <td><input type='text' onChange={this.handleChange} name='protein' value={this.props.data.protein} /></td>
      </tr>
    );
  }
}
