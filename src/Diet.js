import React, { Component } from 'react';
import { Route, Link, Switch } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { connect } from "react-redux";

import { 
  getLoadingStatus,
  arrayToDict,
  clipFloat,
  computeDietEntryTotal,
  computeScale,
  splitUnits,
  fillEntry
} from './Utils.js';
import { 
  foodActions,
  photoActions,
  notify
} from './actions/Actions.js';

import {
  Checkbox, FoodPhotoThumbnail, ThumbnailsList, DropdownMenu, Accordion, BigButton,
  Modal, ModalHeader, ModalBody, ModalFooter
} from './Common.js';
import { parseQueryString, dictToQueryString, formatDate } from './Utils.js';

import './Diet.scss';

export class DietPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newEntryFormVisible: false,
      newEntry: {}
    };
    [
      'showNewEntryForm','onChangeNewEntry','onCreateNewEntry'
    ].forEach(x=>this[x]=this[x].bind(this));
    this.props.fetchData(this.props.date);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.date !== this.props.date) {
      this.props.fetchData(this.props.date);
      this.setState({
        selected: new Set()
      });
    }
  }
  showNewEntryForm() {
    this.setState({
      newEntryFormVisible: true,
      newEntry: {}
    });
  }
  onChangeNewEntry(e) {
    this.setState({
      newEntry: e
    });
  }
  onCreateNewEntry() {
    if (this.props.mainEntry) {
      this.props.createEntry({
        ...this.state.newEntry,
        parent_id: this.props.mainEntry.id
      });
    } else {
      this.props.createEntry(this.state.newEntry);
    }
    this.setState({
      newEntryFormVisible: false,
      newEntry: {}
    });
  }
  render() {
    let {
      mainEntry = null,
      entries = {},
    } = this.props;
    let mainEntryEditor = (
      <DateSelector />
    );
    let mainEntryControls = null;
    if (mainEntry !== null) {
      mainEntryEditor = (<>
        <h3>{mainEntry.name}</h3>
        <Accordion heading='Details'>
          <EntryEditorForm entry={mainEntry} onChange={this.props.updateData}/>
        </Accordion>
      </>);
      mainEntryControls = (<>
        <button>Save Changes</button>
        <button>Delete</button>
      </>);
    }
    return (<main className='diet-page-container'>
      {mainEntryEditor}
      <div className='food-table-container'>
      {
        Object.entries(entries).length > 0
        ? <FoodTable entries={entries} createNewEntry={this.showNewEntryForm} />
        : <BigButton icon='fastfood' onClick={this.showNewEntryForm} text='New Entry' />
      }
      <EntryEditorFormModal
          entry={this.state.newEntry}
          onChange={this.onChangeNewEntry}
          isOpen={this.state.newEntryFormVisible}
          toggle={x => this.setState({newEntryFormVisible: x})} 
          controls={[
            {text: 'Create Entry', callback: this.onCreateNewEntry}
          ]}/>
      </div>
      <Accordion heading='Suggestions'>
        Lorem ipsum
      </Accordion>
      <Accordion heading='Photos'>
        Lorem ipsum
      </Accordion>
      <Accordion heading='Advanced Details'>
        Lorem ipsum
      </Accordion>
      {mainEntryControls}
    </main>);
  }
}
export const ConnectedDietPage = connect(
  function(state, ownProps) {
    let uid = state.session.uid;
    // Parse Query String
    let queryParams = parseQueryString(ownProps.location.search);
    if (!queryParams['date']) {
      queryParams['date'] = formatDate(new Date());
    }
    if (!queryParams['uid']) {
      queryParams['uid'] = uid;
    }
    let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: ownProps.date});
    let allEntries = Object.values(state.food.entities).filter(
      entity => entity && entity.date === queryParams['date'] && (!entity.premade || entity.premade == null)
    );
    allEntries = arrayToDict(allEntries, 'id');
    // Add children to entries
    for (let id of Object.keys(allEntries)) {
      allEntries[id].children = allEntries[id].children_ids.map(id=>allEntries[id]).filter(entry=>entry);
    }
    // Main entry
    let mainEntry = null;
    if (queryParams['id']) {
      mainEntry = allEntries[queryParams['id']];
    }
    let subentries = null;
    if (mainEntry === null) {
      subentries = Object.values(allEntries).filter(entity => !entity.parent_id);
    } else {
      console.log(mainEntry);
      subentries = Object.values(allEntries).filter(entity => entity.parent_id === mainEntry.id);
    }
    subentries = arrayToDict(subentries, 'id');
    return {
      uid,
      date: queryParams['date'],
      params: queryParams,
      mainEntry: mainEntry,
      entries: subentries,
      dirty: state.food.dirtyEntities.size > 0
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchData: date => dispatch(foodActions['fetchMultiple']({date: date})),
      updateData: entry => dispatch(foodActions['update'](entry)),
      deleteEntry: ids => dispatch(foodActions['deleteMultiple'](ids)),
      createEntry: data => dispatch(foodActions['create'](data)),
      notify: x => dispatch(notify(x)),
    };
  }
)(DietPage);

export class DateSelector extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date()
    };
    [
      'onChange','prevDate','nextDate'
    ].forEach(x=>this[x]=this[x].bind(this));
  }
  onChange(date) {
    if (this.props.onChange) {
      this.props.onChange(date);
    }
    this.setState({
      date: date
    });
  }
  prevDate() {
    let {
      date = this.state.date,
    } = this.props;
    var newDate = new Date(date);
    newDate.setDate(newDate.getDate()-1);
    this.onChange(newDate);
  }
  nextDate() {
    let {
      date = this.state.date,
    } = this.props;
    var newDate = new Date(date);
    newDate.setDate(newDate.getDate()+1);
    this.onChange(newDate);
  }
  render() {
    let {
      date = this.state.date
    } = this.props;
    return (
      <h3 className='date'>
        <i className='material-icons action' onClick={this.prevDate}>navigate_before</i>
        <DatePicker 
          onChange={this.onChange}
          customInput={<span>{formatDate(date)}</span>}/>
        <i className='material-icons action' onClick={this.nextDate}>navigate_next</i>
      </h3>
    );
  }
}

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
  handleBlur(e) {
    this.setState({
      focused: false
    });
    if (this.props.onBlur) {
      this.props.onBlur(e);
    }
  }
  handleFocus(e) {
    this.setState({
      focused: true
    });
    if (this.props.onFocus) {
      this.props.onFocus(e);
    }
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
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/food/search?q="+encodeURI(this.props.value), {withCredentials: true})
        .then(function(response){
          window.result = response;
          that.setState({
            suggestions: response.data.frequent,
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
        <form autoComplete='off' onSubmit={e => e.preventDefault()}>
        {inputField}
        </form>
        {s && <div className='table'> {s} </div>}
      </div>
    );
  }
}

export class QuantityInput extends Component {
  constructor(props) {
    super(props);

    this.startingValue = this.props.value;
    this.focused = false;

    this.scaleQuantity = this.scaleQuantity.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.value !== this.props.value) {
      if (!this.focused) {
        this.scaleQuantity();
        this.startingValue = this.props.value;
      }
    }
  }
  scaleQuantity() {
    if (!this.props.onScale) {
      return;
    }

    let scale = computeScale(this.startingValue, this.props.value);
    // Check if the number is valid
    if (scale === null || !isFinite(scale) || scale === 1) {
      return;
    }

    // Scale values
    let scalableValues = null;
    if (this.props.scalablevalues) {
      scalableValues = {};
      for (let [k,v] of Object.entries(this.props.scalablevalues)) {
        if (v && isFinite(v)) {
          if (typeof v === 'string') {
            if (v.length > 0) {
              v = parseFloat(v)*scale;
              v = v.toString();
            }
          } else {
            v *= scale
          }
        }
        scalableValues[k] = v;
      }
    }

    let scalableQuantities = null;
    if (this.props.scalableQuantities) {
      scalableQuantities = {};
      for (let [k,v] of Object.entries(this.props.scalableQuantities)) {
        if (v && typeof v !== 'undefined') {
          let qty = splitUnits(v);
          scalableQuantities[k] = qty.val*scale+qty.units;
        }
      }
    }

    // Callback
    this.props.onScale(scale, scalableValues, scalableQuantities);
  }
  handleBlur(e) {
    this.focused = false;
    this.scaleQuantity();
    if (this.props.onBlur) {
      this.props.onBlur(e);
    }
  }
  handleFocus(e) {
    this.focused = true;
    this.startingValue = this.props.value;
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

//////////////////////////////////////////////////
// Photos
//////////////////////////////////////////////////

class ConnectedGallery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhotoIds: new Set(),
      uploadingProgress: {},
      errors: []
    };
    this.props.fetchPhotos(this.props.uid);
    this.handleSelectPhoto = this.handleSelectPhoto.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.editSelected = this.editSelected.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.date !== this.props.date) {
      this.props.fetchPhotos(this.props.uid);
    }
  }
  toggleSet(s,x) {
    if (s.has(x)) {
      s = new Set(s)
      s.delete(x);
      return s;
    } else {
      return new Set(s).add(x);
    }
  }
  handleSelectPhoto(photoIds) {
    this.setState({
      selectedPhotoIds: photoIds
    });
  }
  handleDelete() {
    if (!window.confirm('Are you sure you want to delete the '+this.state.selectedPhotoIds.size+' selected photos?')) {
      return;
    }
    Array.from(this.state.selectedPhotoIds).forEach(this.props.deletePhoto)
    this.setState({
      selectedPhotoIds: new Set()
    });
  }
  handleUpload(event) {
    this.uploadFile(event.target.files);
  }
  uploadFile(file) {
    let that = this;
    // Find first available index
    let index = 0;
    while (index in this.state.uploadingProgress) {
      index++;
    }
    this.setState({
      uploadingProgress: {
        ...this.state.uploadingProgress,
        [index]: 0
      }
    });
    this.props.uploadPhoto(
      file,
      function(progress) {
        that.setState({
          uploadingProgress: {
            ...that.state.uploadingProgress,
            [index]: progress.loaded/progress.total
          }
        });
      }
    ).then(function(response){
      //that.props.fetchPhotos(false);
      let progress = {...that.state.uploadingProgress};
      delete progress[index];
      that.setState({
        uploadingProgress: progress
      });
    }).catch(function(error){
      that.setState({
        uploadingCount: that.state.uploadingCount-1,
        errors: [...that.state.errors, 
          {
            error: error.response.data,
            file: file,
            retry: function() {
              that.setState({
                errors: that.state.errors.filter(e => e.file !== file)
              });
              that.uploadFile(file);
            }
          }
        ]
      });
    });
  }
  editSelected() {
    this.props.onEditEntry(this.state.selectedPhotoIds);
  }
  render() {
    const {
      selectedPhotoIds = this.state.selectedPhotoIds,
      onSelectPhoto = this.handleSelectPhoto,
      disabledPhotos = new Set(),
    } = this.props;
    let that = this;
    if (!this.props.photosLoadingStatus) {
      return (
        <div>
          Waiting to load
        </div>
      );
    } else if (this.props.photosLoadingStatus.status === 'loading') {
      return (
        <div>
          LOADING...
        </div>
      );
    } else if (this.props.photosLoadingStatus.status === 'error') {
      return (
        <div className='error-message'>
          {this.props.photosLoadingStatus.error || this.props.groupsLoadingStatus.error}
        </div>
      );
    } else if (this.props.photosLoadingStatus.status === 'loaded') {
      if (Object.keys(this.props.photos).length > 0 || this.state.errors.length > 0 || Object.keys(this.state.uploadingProgress).length > 0) {
        // Render controls
        let controls = (
          <>
            <label>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.handleUpload}/>
              <i className='material-icons action'>add_a_photo</i>
            </label>
          </>
        );
        if (selectedPhotoIds.size > 0) {
          // Compute editor URL
          let foodIds = new Set();
          let photoIds = Array.from(selectedPhotoIds);
          for (let pid of photoIds) {
            foodIds.add(this.props.photos[pid].food_id);
          }
          let queryString;
          if (foodIds.size > 1) {
            queryString = null;
          } else if (foodIds.size === 1 && !foodIds.has(null)) {
            queryString = 'id='+foodIds.values().next().value;
          } else {
            queryString = 'photo_ids='+photoIds.join(',');
          }
          controls = (
            <>
              <i className='material-icons action' onClick={this.handleDelete}>delete</i>
              {queryString && 
                <Link to={'/food/editor?date='+this.props.date+'&'+queryString}>
                  <i className='material-icons action'>create</i>
                </Link>
              }
            </>
          );
        }
        // Render thumbnails
        let thumbnails = Object.keys(this.props.photos).map(
          function(photoId){
            photoId = parseInt(photoId);
            if (disabledPhotos.has(photoId)) {
              return (
                <div className='photo-viewer-thumbnail disabled'
                    key={photoId} >
                  <FoodPhotoThumbnail photoId={photoId}
                      selected={selectedPhotoIds.has(photoId)}/>
                </div>
              );
            } else {
              return (
                <div className='photo-viewer-thumbnail'
                    key={photoId}
                    onClick={()=>onSelectPhoto(that.toggleSet(selectedPhotoIds,photoId))} >
                  <FoodPhotoThumbnail photoId={photoId}
                      selected={selectedPhotoIds.has(photoId)}/>
                </div>
              );
            }
          }
        );
        let uploadingThumbnails = null;
        for (let [k,v] of Object.entries(this.state.uploadingProgress)) {
          uploadingThumbnails = (<>
            {uploadingThumbnails}
            <div className='photo-viewer-thumbnail'
                key={'uploading-'+k}>
              <div className='thumbnail'>
                Uploading... ({Math.floor(v*100)}%)
              </div>
            </div>
          </>);
        }
        let errorThumbnails = this.state.errors.map(function(e,i){
          return (
            <div className='photo-viewer-thumbnail'
                key={'error-'+i}
                onClick={()=>null}>
              <div className='thumbnail error-message'>
                {e.error}
              </div>
            </div>
          );
        });
        return (
          <div className='gallery'>
            <div className='controls'>{controls}</div>
            <div className='thumbnails'>
              {thumbnails}
              {uploadingThumbnails}
              {errorThumbnails}
            </div>
          </div>
        );
      } else {
        return (
          <div className='gallery empty-view'>
            <div>There are no photos to show.</div>
            <label>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.handleUpload}/>
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
    let photosLoadingStatus = getLoadingStatus(
      state.loadingStatus['PHOTOS'],
      {user_id: ownProps.uid, date: ownProps.date}
    );
    let photosReady = photosLoadingStatus && photosLoadingStatus.status === 'loaded';
    if (photosReady) {
      // Get all photos for the given date
      let photoIds = Object.keys(
        state.photos.entities
      ).filter(function(id) {
        return state.photos.entities[id] && state.photos.entities[id].date === ownProps.date;
      });
      // Populate photo by ID and photo ID by group
      for (let photoId of photoIds) {
        photos[photoId] = state.photos.entities[photoId];
      }
    }
    return {
      photosLoadingStatus,
      photos
    };
  },
  function(dispatch, ownProps) {
    return {
      fetchPhotos: (cache) => dispatch(
        photoActions['fetchMultiple']({user_id: ownProps.uid, date: ownProps.date}, cache)
      ),
      updatePhoto: (data) => dispatch(
        photoActions['update'](data)
      ),
      uploadPhoto: (files, progressCallback) => dispatch(
        photoActions['create'](files, progressCallback, ownProps.date)
      ),
      createFood: (data) => dispatch(
        foodActions['create'](data)
      ),
      deletePhoto: (id) => dispatch(
        photoActions['deleteSingle'](id)
      ),
    };
  }
)(ConnectedGallery);

//////////////////////////////////////////////////
// Table
//////////////////////////////////////////////////

export class EntryEditorForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      entry: {
        name: '',
        date: '',
        time: '',
        quantity: '',
        calories: '',
        carbohydrate: '',
        fat: '',
        protein: '',
        micronutrients: []
      }
    };
    [
      'onChange','updateEntry','handleChange','handleCreateNewMicro'
    ].forEach(x=>this[x]=this[x].bind(this));
  }
  onChange(newEntry) {
    if (this.props.onChange) {
      this.props.onChange(newEntry);
    } else {
      this.setState({
        entry: newEntry
      });
    }
  }
  updateEntry(keys, newValue) {
    let {
      entry = this.state.entry,
    } = this.props;
    function helper(object, keys, newValue) {
      if (keys.length == 0) {
        return newValue;
      }
      if (Array.isArray(object)) {
        let copy = [...object];
        copy[keys[0]] = helper(object[keys[0]], keys.slice(1), newValue);
        return copy;
      } else {
        return {
          ...object,
          [keys[0]]: helper(object[keys[0]], keys.slice(1), newValue)
        };
      }
    }
    let newEntry = helper(entry, keys, newValue)
    this.onChange(newEntry);
  }
  handleChange(e) {
    let inputType = e.target.type;
    let changedField = e.target.name;
    let newValue = e.target.value;
    let keys = changedField.split('.');
    this.updateEntry(keys, newValue);
  }
  handleCreateNewMicro(e) {
    let {
      entry = this.state.entry
    } = this.props;
    let newEntry = {
      ...entry,
      micronutrients: [
        ...entry.micronutrients,
        {type: '', value: ''}
      ]
    }
    this.onChange(newEntry);
  }
  render() {
    let {
      entry = this.state.entry,
    } = this.props;
    let onChange = this.handleChange;
    let that = this;
    return (
      <form className='new-entry-form'>
        <label className='name'>
          <span>Name</span>
          <input type='text' name='name' value={entry.name || ''} onChange={onChange}/>
        </label>

        <label className='date'>
          <span>Date</span>
          <input type='date' name='date' value={entry.date} onChange={onChange} />
        </label>
        <label className='time'>
          <span>Time</span>
          <input type='time' name='time' value={entry.time} onChange={onChange}/>
        </label>
        <label className='quantity'>
          <span>Quantity</span>
          <input type='text' name='quantity' value={entry.quantity || ''} onChange={onChange}/>
        </label>

        <label className='calories'>
          <span>Calories</span>
          <input type='text' name='calories' value={entry.calories || ''} onChange={onChange}/>
        </label>
        <label className='carb'>
          <span>Carbs (g)</span>
          <input type='text' name='carbohydrate' value={entry.carbohydrate || ''} onChange={onChange}/>
        </label>
        <label className='fat'>
          <span>Fats (g)</span>
          <input type='text' name='fat' value={entry.fat || ''} onChange={onChange}/>
        </label>
        <label className='prot'>
          <span>Protein (g)</span>
          <input type='text' name='protein' value={entry.protein || ''} onChange={onChange}/>
        </label>
        <label className='micros'>
          <span>Micronutrients</span>
          <div>
            {
              entry.micronutrients &&
              entry.micronutrients.map(function(micro,index){
                return (<div className='micro' key={index}>
                  <DropdownMenu options={{
                    'zinc': 'Zinc',
                    'iron': 'Iron',
                    'vitamin-a': 'Vitamin A'
                  }} onChange={val => that.updateEntry(['micronutrients',index,'type'],val)}/>
                  <input type='text' name={'micronutrients.'+index+'.value'} onChange={onChange}/>
                </div>);
              })
            }
          </div>
        </label>
        <div className='add-micro' onClick={this.handleCreateNewMicro}>+ Add Micronutrients</div>
      </form>
    );
  }
}

export class FoodTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      entries: {}
    };
  }
  render() {
    let {
      entries = this.state.entries,
    } = this.props;
    let createNewEntry = () => console.error('Missing createNewEntry prop.');
    if (this.props.createNewEntry) {
      createNewEntry = this.props.createNewEntry;
    }
    function sum(entries, prop) {
      return Object.values(entries).reduce(function(acc, entry){
        let val = entry[prop];
        if (!val && entry.children) {
          val = sum(entry.children, prop);
        }
        if (!val) {
          return acc;
        }
        if (!acc) {
          return val;
        }
        return acc+val;
      }, null);
    }
    return (
      <table className='food-table'>
        <thead>
          <tr>
            <th>Name</th>
            <th>Qty</th>
            <th>Cal</th>
            <th>Carb</th>
            <th>Prot</th>
          </tr>
        </thead>
        <tbody>
          {
            Object.entries(entries).map(function([id,entry]){
              let children_count = '';
              if (entry.children && Object.keys(entry.children).length > 0) {
                children_count = '('+Object.keys(entry.children).length+')';
              }
              return (
                <tr>
                  <td>{entry.name} {children_count} <Link to={'/food?id='+id}><i className='material-icons'>create</i></Link></td>
                  <td>{entry.quantity || '-'}</td>
                  <td>{entry.calories || '-'}</td>
                  <td>{entry.carb || '-'}</td>
                  <td>{entry.protein || '-'}</td>
                </tr>
              );
            })
          }
          <tr className='total'>
            <td className='new-entry-container' onClick={createNewEntry}>
              + New Entry
            </td>
            <td>-</td>
            <td>{sum(entries,'calories') || '-'}</td>
            <td>{sum(entries,'carb') || '-'}</td>
            <td>{sum(entries,'protein') || '-'}</td>
          </tr>
        </tbody>
      </table>
    );
  }
}

export class EntryEditorFormModal extends Component {
  render() {
    let {
      toggle,
      isOpen,
      entry,
      onChange,
      controls = []
    } = this.props;
    return (
      <Modal toggle={toggle} isOpen={isOpen}>
        <ModalHeader>New Entry</ModalHeader>
        <ModalBody>
          <EntryEditorForm entry={entry} onChange={onChange} />
        </ModalBody>
        <ModalFooter>
          {
            controls.map(function(x){
              return (
                <button onClick={x.callback}>{x.text}</button>
              );
            })
          }
        </ModalFooter>
      </Modal>
    );
  }
}

//////////////////////////////////////////////////
// Editor
//////////////////////////////////////////////////

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
    if (!this.props.data) {
      emptyRow = (
        <tr><td colSpan='999'>{'...'}</td></tr>
      );
    } else if (this.props.data.length === 0) {
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
          {emptyRow || this.props.data.map(function(datum, index){
            if (datum) {
              return <SmallTableRow
                key={index}
                data={datum} 
                onChange={x => that.handleChange(x, index)} />
            } else {
              return (<tr key={index}><td colSpan='999'>...</td></tr>);
            }
          })}
        </tbody>
      </table>
    );
  }
}

class SmallTableRow extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleScale = this.handleScale.bind(this);
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
  handleScale(scale, val) {
    this.props.onChange({
      ...this.props.data,
      calories: val['calories'],
      protein: val['protein']
    });
  }
  render() {
    return (
      <tr>
        <td><input type='text' onChange={this.handleChange} name='name' value={this.props.data.name || ''} /></td>
        <td><QuantityInput onChange={this.handleChange} name='quantity' value={this.props.data.quantity || ''} onScale={this.handleScale} scalablevalues={{calories: this.props.data.calories, protein: this.props.data.protein}}/></td>
        <td><input type='text' onChange={this.handleChange} name='calories' value={this.props.data.calories || ''} /></td>
        <td><input type='text' onChange={this.handleChange} name='protein' value={this.props.data.protein || ''} /></td>
      </tr>
    );
  }
}

//////////////////////////////////////////////////
// Search Table
//////////////////////////////////////////////////

class SearchTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      loading: false,
      results: {},
      selectedEntry: null
    };

    this.renderControls = this.renderControls.bind(this);
    this.renderAutocompleteTable = this.renderAutocompleteTable.bind(this);

    this.search = this.search.bind(this);
    this.handleSearchSelect = this.handleSearchSelect.bind(this);

    this.handleKeyPress = this.handleKeyPress.bind(this);

    // Start off with some default suggestions
    this.search();
  }

  search() {
    var that = this;
    this.setState({
      loading: true, // Not resetting results here. Makes the page jump.
    });
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/search?q="+encodeURI(this.state.query),
      {withCredentials: true}
    ).then(function(response){
      that.setState({
        results: response.data,
        loading: false
      });
    }).catch(function(error){
      console.error(error);
      that.setState({
        errorMessage: error.response.data.error,
        loading: false
      });
    });
  }
  handleSearchSelect(key, index) {
    if (this.state.selectedEntry) {
      if (this.state.selectedEntry[0] === key && this.state.selectedEntry[1] === index) {
        this.setState({
          selectedEntry: null
        });
      } else {
        this.setState({
          selectedEntry: [key, index]
        });
      }
    } else {
      this.setState({
        selectedEntry: [key, index]
      });
    }
  }
  getSelectedEntry() {
    let [key,index] = this.state.selectedEntry;
    return this.state.results[key][index];
  }
  getSelectedEntryCopy() {
    if (!this.state.selectedEntry) {
      return null;
    }
    let {date, id, ...entry} = this.getSelectedEntry();
    function clean(e) {
      delete e.id;
      delete e.date;
      delete e.parent_id;
      e.premade = false;
      if (e.children) {
        for (let c of e.children) {
          clean(c);
        }
      }
    }
    clean(entry);
    entry.copied_from = id;
    return entry;
  }

  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.search();
    }
  }

  renderAutocompleteTable() {
    let loadingMessage = null;
    if (this.state.loading) {
      loadingMessage = (<tr><td colSpan='999'>LOADING...</td></tr>);
    }
    let overlayControls = (
      <div className='overlay-controls'>
        {this.renderControls()}
      </div>
    );
    let resultsBySection = {};
    let that = this;
    if (this.state.results) {
      let entries = Object.entries(this.state.results);
      for (let [key,vals] of entries) {
        resultsBySection[key] = vals.map(function(val, index){
          let isSelected = (that.state.selectedEntry &&
              that.state.selectedEntry[0] === key &&
              that.state.selectedEntry[1] === index);
          return (<tr key={index} onClick={() => that.handleSearchSelect(key,index)} className={isSelected ? 'selected' : ''}>
            <td>{isSelected && overlayControls}{val.date}</td>
            <td>{val.name}</td>
            <td>{val.quantity}</td>
            <td>{val.calories}</td>
            <td>{val.protein}</td>
          </tr>);
        });
      }
    }
    let results = null;
    if (resultsBySection['premade']) {
      results = (<>
        {results}
        <tr><td colSpan='999'>Premade Food</td></tr>
        {resultsBySection['premade']}
      </>);
    }
    if (resultsBySection['recent']) {
      results = (<>
        {results}
        <tr><td colSpan='999'>Recently Logged</td></tr>
        {resultsBySection['recent']}
      </>);
    }
    if (resultsBySection['frequent']) {
      results = (<>
        {results}
        <tr><td colSpan='999'>Frequently Logged</td></tr>
        {resultsBySection['frequent']}
      </>);
    }
    return (
      <div className='autocomplete'>
        <div className='search'>
          <i className='material-icons'>search</i>
          <input type='text' value={this.state.query} onChange={(e)=>{this.setState({query: e.target.value})}} onKeyPress={this.handleKeyPress}/>
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
      </div>
    );
  }
  renderControls() {
    let controls = this.props.controls || [];
    let that = this;
    controls = controls.map(function(control){
      let disabled = !that.state.selectedEntry && control['requiresSelected'];
      let className = disabled ? 'disabled' : '';
      let onClick = disabled ? ()=>null : ()=>control['callback'](that.getSelectedEntryCopy())
      return (
        <button key={control['value']} 
            className={className}
            onClick={onClick}>
          {control['value']}
        </button>
      );
    });
    // Add edit button
    if (this.props.editable && this.state.selectedEntry) {
      let selectedEntry = this.getSelectedEntry();
      if (selectedEntry.id) {
        controls.push(
          <Link to={'/food/editor?id='+selectedEntry.id} key='Edit'>
            <button>Edit</button>
          </Link>
        );
      }
    }
    return controls;
  }
  render() {
    let successMessage = null;
    if (this.state.successMessage) {
      successMessage = (<div className='success-message'>
        {this.state.successMessage}
      </div>);
    }
    let errorMessage = null;
    if (this.state.errorMessage) {
      errorMessage = (
        <div className='error-message'>{this.state.errorMessage}</div>
      );
    }
    return (
      <div className='search-table-container'>
        {errorMessage}
        {successMessage}
        {this.renderAutocompleteTable()}
        {this.renderControls()}
      </div>
    );
  }
}
