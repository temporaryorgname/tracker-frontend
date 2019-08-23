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

import { Checkbox, FoodPhotoThumbnail, ThumbnailsList, DropdownMenu } from './Common.js';
import { parseQueryString, dictToQueryString, formatDate } from './Utils.js';

import './Diet.scss';

class ConnectedDietPage extends Component {
  constructor(props) {
    super(props);

    this.handleDateChange = this.handleDateChange.bind(this);
    this.prevDate = this.prevDate.bind(this);
    this.nextDate = this.nextDate.bind(this);
  }
  handleDateChange(date) {
    var params = this.props.params;
    params.date = formatDate(date);
    this.props.history.push(dictToQueryString(params, ['uid', 'date']));
  }
  prevDate() {
    var newDate = new Date(this.props.params.date);
    newDate.setDate(newDate.getDate());
    this.handleDateChange(newDate);
  }
  nextDate() {
    var newDate = new Date(this.props.params.date);
    newDate.setDate(newDate.getDate()+2);
    this.handleDateChange(newDate);
  }
  render() {
    console.log(this.props);
    if (!this.props.params.date || !this.props.params.uid) {
      return null;
    }
    let links = (
      <>
        <Link to={'/food/table'+dictToQueryString(this.props.params, ['uid','date'])}>Table</Link>
        <Link to={'/food/photos'+dictToQueryString(this.props.params, ['uid','date'])}>Photos</Link>
        <Link to={'/food/editor'+dictToQueryString(this.props.params, ['uid','date'])}>Editor</Link>
      </>
    );
    links = null;
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
            customInput={<span>{this.props.params.date}</span>}/>
          <i className='material-icons action' onClick={this.nextDate}>navigate_next</i>
        </h3>
        <Switch>
          <Route path="/food/table" render={() => <FoodTable date={this.props.params.date} onDateChange={this.handleDateChange} />} />
          <Route path="/food/photos" render={() => <Gallery date={this.props.params.date} uid={this.props.params.uid} />} />
          <Route path="/food/editor" render={() => <EntryEditorForm date={this.props.params.date} uid={this.props.params.uid} id={this.props.params.id} photo_ids={this.props.params.photo_ids} history={this.props.history}/>} />
        </Switch>
      </main>
    );
  }
}
export const DietPage = connect(
  function(state, ownProps) {
    let uid = state.session.uid;
    let queryParams = parseQueryString(ownProps.location.search);
    if (!queryParams['date']) {
      queryParams['date'] = formatDate(new Date());
    }
    if (!queryParams['uid']) {
      queryParams['uid'] = uid;
    }
    return {
      uid,
      params: queryParams
    }
  },
  function(dispatch, ownProps) {
    return {};
  }
)(ConnectedDietPage);

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

//class ConnectedFoodTable extends Component {
//  constructor(props){
//    super(props)
//    this.state = {
//      selected: new Set()
//    };
//    [
//      'handleToggleSelected', 'createMainEntry', 'createChildEntry',
//      'handleChangeDate'
//    ].forEach(x=>this[x]=this[x].bind(this));
//
//    this.props.fetchData(this.props.date);
//  }
//  componentDidUpdate(prevProps) {
//    if (prevProps.date !== this.props.date) {
//      this.props.fetchData(this.props.date);
//      this.setState({
//        selected: new Set()
//      });
//    }
//  }
//
//  handleToggleSelected(entry) {
//    /* Callback to be triggered when an entry has been selected. */
//    let setCopy = new Set(this.state.selected);
//    let that = this;
//    if (this.state.selected.has(entry.id)){
//      function unselect(entry) {
//        setCopy.delete(entry.id);
//        // Unselect children
//        entry.children.forEach(unselect);
//        // Unselect all parents if they're selected
//        while (entry) {
//          setCopy.delete(entry.id);
//          entry = that.props.allEntries[entry.parent_id];
//        }
//      }
//      unselect(entry);
//    } else {
//      function select(entry) {
//        setCopy.add(entry.id);
//        entry.children.forEach(select);
//      }
//      select(entry);
//    }
//    this.setState({
//      selected: setCopy
//    });
//  }
//  createMainEntry(entry) {
//    return this.props.createEntry(entry);
//  }
//  createChildEntry(entry) {
//    let selected = this.getSelectedTopLevel();
//    console.log(selected);
//    if (selected.size > 1) {
//      console.error('More than one entry selected. Cannot add child.');
//      return;
//    }
//    if (selected.size === 0) {
//      console.error('No entry selected. Cannot add child.');
//      return;
//    }
//    selected = Array.from(selected)[0];
//    entry.parent_id = selected;
//    return this.props.createEntry(entry);
//  }
//
//  handleChangeDate(e) {
//    let newDate = e.target.value;
//    let confirmMove = window.confirm('Are you sure you want to move the selected entry to '+newDate+'?');
//    if (confirmMove) {
//      let that = this;
//      Array.from(this.state.selected).forEach(function(id){
//        for (var entry of Object.values(that.props.entries)) {
//          if (entry.id === id) {
//            break;
//          }
//        }
//        that.props.updateData({
//          ...entry,
//          date: newDate
//        });
//      });
//      this.setState({
//        selected: new Set()
//      });
//    }
//  }
//
//  render() {
//    let that = this;
//    if (Object.values(this.props.entries).length == 0) {
//      return (<div>
//        No data
//        <NewEntryForm />
//        <button>Create Entry</button>
//      </div>);
//    }
//    return (<>
//      <table className='food-table'>
//        <div className='entries'>
//          {
//            Object.values(this.props.entries).map(function(entry){
//              return (
//                <FoodRow key={entry.id} 
//                    allEntries={that.props.allEntries}
//                    entry={entry} 
//                    selected={that.state.selected}
//                    onToggleSelected={that.handleToggleSelected} 
//                    deleteEntry={that.deleteOneEntry}
//                    createEntry={that.props.createEntry}/>
//              );
//            })
//          }
//        </div>
//      </table>
//    </>);
//  }
//}
//const FoodTable = connect(
//  function(state, ownProps) {
//    let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: ownProps.date});
//
//    let allEntries = Object.values(state.food.entities).filter(
//      entity => entity && entity.date === ownProps.date && (!entity.premade || entity.premade == null)
//    );
//    let entitiesWithoutParent = allEntries.filter(entity => !entity.parent_id);
//    allEntries = arrayToDict(allEntries, 'id');
//    entitiesWithoutParent = arrayToDict(entitiesWithoutParent, 'id');
//    // Add children to entries
//    for (let id of Object.keys(allEntries)) {
//      allEntries[id].children = allEntries[id].children_ids.map(id=>allEntries[id]).filter(entry=>entry);
//    }
//
//    return {
//      loadingStatus,
//      entries: entitiesWithoutParent,
//      allEntries,
//      total: {
//        calories: computeDietEntryTotal(entitiesWithoutParent, 'calories', allEntries),
//        protein: computeDietEntryTotal(entitiesWithoutParent, 'protein', allEntries),
//      },
//      dirty: state.food.dirtyEntities.size > 0
//    }
//  },
//  function(dispatch, ownProps) {
//    return {
//      fetchData: date => dispatch(foodActions['fetchMultiple']({date: date})),
//      updateData: entry => dispatch(foodActions['update'](entry)),
//      deleteEntry: ids => dispatch(foodActions['deleteMultiple'](ids)),
//      createEntry: data => dispatch(foodActions['create'](data)),
//      notify: x => dispatch(notify(x)),
//    };
//  }
//)(ConnectedFoodTable);

class FoodRow extends Component {
  constructor(props){
    super(props);
    [].forEach(x=>this[x].bind(this));
  }
  render() {
    let {
      selected = new Set(),
      entry = {},
      onToggleSelected,
      depth = 0,
      deleteEntry = ()=>null,
      allEntries
    } = this.props;
    let that = this;
    let hasName = entry.name && entry.name.trim().length > 0;
    return (<tr>
      <td className={hasName ? 'name' : 'name empty'}>
        {hasName ? entry.name : 'Unnamed entry'}
      </td>
      <td>{entry.calories && clipFloat(entry.calories,1)}</td>
      <td>{entry.carb && clipFloat(entry.carb,1)}</td>
      <td>{entry.fat && clipFloat(entry.fat,1)}</td>
      <td>{entry.protein && clipFloat(entry.protein,1)}</td>
    </tr>);
  }
}

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
    }
    this.setState({
      entry: newEntry
    });
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
    console.log(entry);
    return (
      <form className='new-entry-form'>
        <label className='name'>
          <span>Name</span>
          <input type='text' name='name' value={entry.name} onChange={onChange}/>
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
          <input type='text' name='quantity' value={entry.quantity} onChange={onChange}/>
        </label>

        <label className='calories'>
          <span>Calories</span>
          <input type='text' name='calories' value={entry.calories} onChange={onChange}/>
        </label>
        <label className='carb'>
          <span>Carbs (g)</span>
          <input type='text' name='carbohydrate' value={entry.carbohydrate} onChange={onChange}/>
        </label>
        <label className='fat'>
          <span>Fats (g)</span>
          <input type='text' name='fat' value={entry.fat} onChange={onChange}/>
        </label>
        <label className='prot'>
          <span>Protein (g)</span>
          <input type='text' name='protein' value={entry.protein} onChange={onChange}/>
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
  }
  render() {
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
          <tr>
            <td>Breakfast (2) <i className='material-icons'>create</i></td>
            <td>-</td>
            <td>440</td>
            <td>-</td>
            <td>21</td>
          </tr>
          <tr>
            <td>Lunch <i className='material-icons'>create</i></td>
            <td>-</td>
            <td>600</td>
            <td>-</td>
            <td>30</td>
          </tr>
          <tr>
            <td>Dinner (3) <i className='material-icons'>create</i></td>
            <td>-</td>
            <td>700</td>
            <td>-</td>
            <td>30</td>
          </tr>
          <tr className='total'>
            <td className='new-entry-container'>
              + New Entry
            </td>
            <td></td>
            <td>1740</td>
            <td>-</td>
            <td>81</td>
          </tr>
        </tbody>
      </table>
    );
  }
}

//////////////////////////////////////////////////
// Editor
//////////////////////////////////////////////////

class ConnectedEntryEditorForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.selectedEntry || null,
      children: null,
      selectingPhoto: false,
      successMessage: null,
      errorMessage: null
    };
    this.addEntry = this.addEntry.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.onChange = this.onChange.bind(this);
    this.handleChildrenChange = this.handleChildrenChange.bind(this);
    this.handleNewChild = this.handleNewChild.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.handleScale = this.handleScale.bind(this);

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
      if (this.props.id) {
        this.props.fetchFood(this.props.id);
      }
    } else {
      if (this.state.data.date) {
        this.props.fetchPhotosByDate(this.state.data.date);
      }
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    let dateChanged = prevState.data && this.state.data && prevState.data.date !== this.state.data.date;
    // Load food entry
    if (!this.state.data && this.props.selectedEntry) {
      this.setState({
        data: {...this.props.selectedEntry}
      });
      this.props.fetchPhotosByDate(this.props.selectedEntry.date);
      return; // Prevent multiple setState calls in one update cycle
    }

    // Load children
    if (this.state.data && (!this.state.children || this.state.children.filter(x=>!x).length > 0)) {
      this.props.fetchFoodByDate(this.state.data.date);
    }
  }

  addEntry(e) {
    e.preventDefault();
    // Save for callback
    let date = this.state.data.date;
    let id = this.state.id;
    // Submit entry to server
    let onSubmit = this.props.createFoodEntry;
    if (id) {
      onSubmit = this.props.updateFoodEntry;
    }
    let that = this;
    onSubmit({
      id: this.state.data.id,
      date: this.state.data.date,
      time: this.state.data.time,
      name: this.state.data.name,
      quantity: this.state.data.quantity,
      calories: this.state.data.calories,
      protein: this.state.data.protein,
      photo_ids: this.state.data.photo_ids,
      children: this.state.children || this.props.children,
      premade: this.state.data.premade,
      finished: this.state.data.finished
    }).then(function(response){
      // Clear form
      let message = null;
      if (id) {
        message = 'Entry created successfully';
      } else {
        message = 'Entry updated successfully';
      }
      that.setState({
        data: null,
        successMessage: message
      });
      that.props.notify({
        content: message
      });
      that.props.fetchPhotosByDate(that.state.data.date);
      that.props.history.push('/food/table?date='+date);
    }).catch(function(error){
      that.setState({
        errorMessage: error.repsonse.data.error
      });
    });
  }
  deleteEntry(e) {
    e.preventDefault();
    //Confirm deletion
    let confirmation = window.confirm('Are you sure you want to delete this entry?');
    if (!confirmation) {
      return;
    }
    // Save for callback
    let date = this.state.data.date;
    // Submit entry to server
    let onDelete = this.props.deleteFoodEntry;
    let that = this;
    onDelete(
      this.state.data.id
    ).then(function(response){
      // Clear form
      that.setState({
        data: null,
        successMessage: 'Entry deleted successfully!'
      });
      that.props.notify({
        content: 'Entry deleted successfully'
      });
      that.props.history.push('/food/table?date='+date);
    }).catch(function(error){
      that.setState({
        errorMessage: error.repsonse.data.error
      });
      that.props.notify({
        content: 'Failed to delete: '+error.repsonse.data.error
      });
    });
  }
  onChange(e) {
    let inputType = e.target.type;
    let changedField = e.target.name;
    let newValue = null;
    if (inputType === 'checkbox') {
      newValue = e.target.checked;
    } else {
      newValue = e.target.value;
    }
    let updatedState = {
      data: {
        ...this.state.data,
        [changedField]: newValue
      },
      successMessage: null,
      errorMessage: null
    };
    if (changedField === 'date') {
      updatedState.data.photo_ids = [];
      this.props.fetchPhotosByDate(newValue);
    }
    this.setState(updatedState);
  }
  handleChildrenChange(data) {
    this.setState({
      children: data
    });
  }
  handleNewChild() {
    let children = this.state.children || this.props.children;
    let newEntry = {
      name: ''
    };
    this.setState({
      children: [...children, newEntry]
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
  handleScale(scale, vals) {
    this.setState({
      data: {
        ...this.state.data,
        calories: vals['calories'],
        protein: vals['protein']
      }
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
      data: fillEntry(this.state.data, entryData),
      showAutocompleteTable: false
    });
  }
  handleAutocompleteChildren(entryData) {
    let children = this.state.children || this.props.children;
    this.setState({
      children: [
        ...children,
        entryData
      ],
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
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/search?q="+encodeURI(this.state.searchString),
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
            <input type='date' name='date' value={this.state.data.date} onChange={this.onChange} readOnly={this.state.data.parent_id}/>
          </label>
          <label>
            <span>Time</span>
            <input type='time' name='time' value={this.state.data.time || undefined} onChange={this.onChange} readOnly={this.state.data.parent_id}/>
          </label>
          <label className='resize'>
            <span>Item name</span>
            <FoodNameInput name='name' value={this.state.data.name || undefined} onChange={this.onChange} onSelect={this.handleAutocompleteMainEntry} />
          </label>
          <label>
            <span>Quantity</span>
            <QuantityInput name='quantity' 
                value={this.state.data.quantity || undefined}
                onChange={this.onChange}
                onScale={this.handleScale}
                scalablevalues={{
                  calories: this.state.data.calories,
                  protein: this.state.data.protein
                }}/>
          </label>
          <label>
            <span>Calories</span>
            <input type='text' name='calories' value={this.state.data.calories || undefined} onChange={this.onChange}/>
          </label>
          <label>
            <span>Protein</span>
            <input type='text' name='protein' value={this.state.data.protein || undefined} onChange={this.onChange}/>
          </label>
          {
          !this.state.data.parent_id &&
          <label className='checkbox'>
            <span>Premade</span>
            <Checkbox name='premade' checked={this.state.data.premade || undefined} onChange={this.onChange}/>
          </label>
          }
          {
          this.state.data.premade &&
          <label className='checkbox'>
            <span>Finished</span>
            <Checkbox name='finished' checked={this.state.data.finished || undefined} onChange={this.onChange}/>
          </label>
          }
          <button onClick={this.addEntry}>{this.state.data.id ? "Save Changes" : "Create Entry"}</button>
          {this.state.data.id && <button className='negative' onClick={this.deleteEntry}>Delete</button>}
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
    let searchTableControls = [
      {value: 'Cancel', callback: this.closeAutocomplete, requiresSelected: false},
      {value: 'Add Child', callback: this.handleAutocompleteChildren, requiresSelected: true},
      {value: 'Fill Main Entry', callback: this.handleAutocompleteMainEntry, requiresSelected: true},
    ];
    return (
        <SearchTable 
          controls={searchTableControls}
          editable={false}/>
    )
  }
  renderChildEntries() {
    let children = this.state.children || this.props.children;
    if (children) {
      return (
        <div className='children-entries'>
          <h3>Children Entries</h3>
          <p> {"What is contained in this meal? Enter the components and we'll sum it up for you!"} </p>
          <SmallTable data={children} onChange={this.handleChildrenChange} />
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
    let photoIds = this.state.data.photo_ids;
    return (
      <div className='photos'>
        <h3>Photos</h3>
        <ThumbnailsList ids={photoIds}/>
        <button onClick={()=>this.setState({selectingPhoto: true})}>{'Select photo'}</button>
      </div>
    );
  }
  renderPhotoSelector() {
    let foodId = this.state.data.id;
    let disabledPhotos = new Set(
      Object.values(this.props.photos).filter(
        p => p.food_id !== null && p.food_id !== foodId
      ).map(
        p => p.id
      )
    );
    return (
      <div className='photos'>
        <h3>Photos</h3>
        <Gallery date={this.state.data.date}
            uid={this.props.uid}
            disabledPhotos={disabledPhotos}
            selectedPhotoIds={new Set(this.state.data.photo_ids)}
            onSelectPhoto={ids => this.setState({
              data: {...this.state.data, photo_ids: Array.from(ids)}
            })}
            />
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
            {this.renderAutocompleteTable()}
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
//const EntryEditorForm = connect(
//  function(state, ownProps) {
//    let date = ownProps.date;
//    // Photos
//    let photos = Object.keys(state.photos.entities).filter(
//      id => state.photos.entities[id].date === date
//    ).map(
//      id => state.photos.entities[id]
//    ).reduce(
//      (acc, entity) => ({...acc, [entity.id]: entity}),
//      {}
//    );
//    let photoLoadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date})
//    // Loaded entry
//    let selectedEntry = null;
//    let children = null;
//    if (ownProps.id) {
//      selectedEntry = state.food.entities[ownProps.id];
//      if (selectedEntry) { // If the data is loaded
//        children = selectedEntry.children_ids.map(id => state.food.entities[id]);
//      }
//    } else if (ownProps.photo_ids) {
//      selectedEntry = {
//        id: null,
//        date: date,
//        name: '',
//        time: '',
//        quantity: '',
//        calories: '',
//        protein: '',
//        photo_ids: JSON.parse('['+ownProps.photo_ids+']'),
//        children: [],
//        premade: false
//      };
//    } else {
//      selectedEntry = {
//        id: null,
//        date: date,
//        name: '',
//        time: '',
//        quantity: '',
//        calories: '',
//        protein: '',
//        photo_ids: [],
//        children: [],
//        premade: false
//      };
//    }
//
//    return {
//      photos,
//      photoLoadingStatus,
//      selectedEntry,
//      children,
//    }
//  },
//  function(dispatch, ownProps) {
//    return {
//      fetchFood: id => dispatch(foodActions['fetchSingle'](id)),
//      fetchFoodByDate: date => dispatch(foodActions['fetchMultiple']({date: date})),
//      fetchPhotosByDate: date => dispatch(photoActions['fetchMultiple']({date})),
//      createFoodEntry: data => dispatch(foodActions['create'](data)),
//      updateFoodEntry: data => dispatch(foodActions['updateNow'](data)),
//      deleteFoodEntry: id => dispatch(foodActions['deleteSingle'](id)),
//      uploadPhoto: (files) => dispatch(
//        photoActions['create'](files, ownProps.date)
//      ),
//      notify: x => dispatch(notify(x)),
//    };
//  }
//)(ConnectedEntryEditorForm);

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
