import React, { Component } from 'react';
import { Route, Link, Switch } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { connect } from "react-redux";

import { 
  getLoadingStatus,
  arrayToDict,
  clipFloat
} from './Utils.js';
import { 
  foodActions,
  photoActions,
  notify
} from './actions/Actions.js';

import { Checkbox, FoodPhotoThumbnail, ThumbnailsList } from './Common.js';
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
    if (!this.props.onScale) {
      return;
    }

    function splitUnits(str) {
      var val = parseFloat(str);
      var units = str.substring(val.toString().length).trim();
      return {val: val, units: units}
    }
    // Ignore empty strings
    if (!this.props.value) {
      return;
    }
    if (this.props.value.length === 0) {
      return;
    }
    // Split numbers and units
    var oldVals = splitUnits(this.state.startingValue || '');
    var newVals = splitUnits(this.props.value || '');

    // Check if the quantities use the same units
    if (oldVals['units'] !== newVals['units']) {
      return;
    }

    var scale = newVals['val']/oldVals['val'];

    // Check if the number is valid
    if (!isFinite(scale) || scale === 1) {
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

    // Callback
    this.props.onScale(scale, scalableValues);
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

//////////////////////////////////////////////////
// Photos
//////////////////////////////////////////////////

class ConnectedGallery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhotoIds: new Set(),
      uploadingCount: 0,
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
    if (!window.confirm('Are you sure you want to delete the '+this.state.selectedPhotoId.size+' selected photos?')) {
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
    this.setState({
      uploadingCount: this.state.uploadingCount+1
    });
    this.props.uploadPhoto(
      file
    ).then(function(response){
      that.props.fetchPhotos(false);
      that.setState({
        uploadingCount: that.state.uploadingCount-1
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
      if (Object.keys(this.props.photos).length > 0 || this.state.errors.length > 0 || this.state.uploadingCount > 0) {
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
        for (let i = 0; i < this.state.uploadingCount; i++) {
          uploadingThumbnails = (<>
            {uploadingThumbnails}
            <div className='photo-viewer-thumbnail'
                key={'uploading-'+i}>
              <div className='thumbnail'>
                Uploading...
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
        return state.photos.entities[id].date === ownProps.date;
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
      uploadPhoto: (files) => dispatch(
        photoActions['create'](files, ownProps.date)
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

class ConnectedFoodTable extends Component {
  constructor(props){
    super(props)
    this.state = {
      selected: new Set()
    };
    this.deleteSelectedEntries = this.deleteSelectedEntries.bind(this);
    this.deleteOneEntry = this.deleteOneEntry.bind(this);
    this.handleToggleSelected = this.handleToggleSelected.bind(this);
    this.getSelectedTopLevel = this.getSelectedTopLevel.bind(this);
    this.handleChangeDate = this.handleChangeDate.bind(this);

    this.renderMobile = this.renderMobile.bind(this);
    this.renderDesktop = this.renderDesktop.bind(this);

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
  handleToggleSelected(entry) {
    /* Callback to be triggered when an entry has been selected. */
    let setCopy = new Set(this.state.selected);
    let that = this;
    if (this.state.selected.has(entry.id)){
      function unselect(entry) {
        setCopy.delete(entry.id);
        // Unselect children
        entry.children.forEach(unselect);
        // Unselect all parents if they're selected
        while (entry) {
          setCopy.delete(entry.id);
          entry = that.props.allEntries[entry.parent_id];
        }
      }
      unselect(entry);
    } else {
      function select(entry) {
        setCopy.add(entry.id);
        entry.children.forEach(select);
      }
      select(entry);
    }
    this.setState({
      selected: setCopy
    });
  }
  getSelectedTopLevel() {
    /* Return a set of selected entries that do not have parent entries or whose parents are not selected. */
    let entries = this.props.allEntries;
    let selected = this.state.selected;
    let newVals = Array.from(this.state.selected).filter(
      function(id) {
        if (!entries[id]) {
          return false;
        }
        let parentId = entries[id].parent_id;
        let parentEntry = entries[parentId];
        return !parentId || !selected.has(parentEntry.id);
      }
    );
    return new Set(newVals);
  }
  deleteSelectedEntries(event) {
    event.preventDefault();
    let count = this.state.selected.size;
    let confirmDelete = window.confirm('Are you sure you want to delete the '+count+' selected entries?');
    if (!confirmDelete) {
      return;
    }
    var that = this;
    this.props.deleteEntry(Array.from(this.state.selected).map(id => {return {id: id}}))
      .then(function(response) {
        that.setState({
          selected: new Set()
        });
        that.props.fetchData(that.props.date);
      });
  }
  deleteOneEntry(id) {
    let selected = new Set(this.state.selected);
    if (selected.has(id)) {
      selected.delete(id);
      this.setState({
        selected
      });
    }
    this.props.deleteEntry([{id: id}]);
  }
  handleChangeDate(e) {
    let newDate = e.target.value;
    let confirmMove = window.confirm('Are you sure you want to move the selected entry to '+newDate+'?');
    if (confirmMove) {
      let that = this;
      Array.from(this.state.selected).forEach(function(id){
        for (var entry of Object.values(that.props.entries)) {
          if (entry.id === id) {
            break;
          }
        }
        that.props.updateData({
          ...entry,
          date: newDate
        });
      });
      this.setState({
        selected: new Set()
      });
    }
  }
  renderMobile() {
    var that = this;
    let status = null;
    if (this.props.loadingStatus) {
      switch (this.props.loadingStatus.status) {
        case 'loading':
          status = (
            <div className='empty-view'>
              LOADING
            </div>
          );
          break;
        case 'loaded':
          if (Object.values(this.props.entries).length === 0) {
            status = (
              <div className='empty-view'>
                You have not yet recorded any food for today.
              </div>
            );
          }
          break;
        case 'error':
          status = (
            <div className='empty-view error-message'>
              Error: {this.props.loadingStatus.error}
            </div>
          );
          break;
        default:
          status = null;
          break;
      }
    }
    let controls = null;
    if (this.state.selected.size > 0) {
      controls = (
        <div className='controls'>
          <i className='material-icons' onClick={this.deleteSelectedEntries}>
            delete
          </i>
        </div>
      );
    }
    let searchTableControls = [
      {
        value: 'Add', 
        callback: (x) => this.props.createEntry(
          {date: this.props.date, ...x}
        ).then(function(){
          that.props.notify({
            content: 'Successfully copied entry'
          });
        }),
        requiresSelected: true
      }
    ];
    return (
      <div className='mobile-food-table'>
        { status ||
        <div className='total'>
          Total: {this.props.total.calories} Calories, {this.props.total.protein}g protein
        </div>
        }
        <div className='entries'>
          {
            Object.values(this.props.entries).map(function(entry){
              return (
                <FoodRowMobile key={entry.id} 
                    allEntries={that.props.allEntries}
                    entry={entry} 
                    selected={that.state.selected}
                    onToggleSelected={that.handleToggleSelected} 
                    deleteEntry={that.deleteOneEntry}
                    createEntry={that.props.createEntry}/>
              );
            })
          }
        </div>
        <Link to={'/food/editor?date='+this.props.date}>
          <button>New Entry</button>
        </Link>
        <Link to={'/food/photos?date='+this.props.date}>
          <button>Photos</button>
        </Link>
        {controls}
        <h2>Search</h2>
        Search past entries and quickly add them to today's log.
        <SearchTable 
          controls={searchTableControls}/>
      </div>
    );
  }
  renderDesktop() {
    var that = this;
    let controls = null;
    let selected = this.getSelectedTopLevel();
    if (selected.size === 1) {
      let selectedId = this.state.selected.values().next().value;
      controls = (
        <>
          <Link to='#' onClick={this.deleteSelectedEntries}><i className="material-icons action">delete</i></Link>
          <Link to={'/food/editor?id='+selectedId}><i className="material-icons action">create</i></Link>
          <label>
            <i className='material-icons action'>date_range</i>
            <input type='date' value={this.props.date} onChange={this.handleChangeDate} />
          </label>
        </>
      );
    } else if (selected.size > 1) {
      controls = (
        <>
          <Link to='#' onClick={this.deleteSelectedEntries}><i className="material-icons action">delete</i></Link>
          <label>
            <i className='material-icons action'>date_range</i>
            <input type='date' value={this.props.date} onChange={this.handleChangeDate} />
          </label>
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
          if (Object.values(this.props.entries).length === 0) {
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
    let searchTableControls = [
      {
        value: 'Add', 
        callback: (x) => this.props.createEntry(
          {date: this.props.date, ...x}
        ).then(function(response){
          let url = '/food/editor?id='+response.data.ids[0];
          that.props.notify({
            content: <span>Successfully copied entry <Link to={url}>Edit</Link></span>
          });
        }),
        requiresSelected: true
      }
    ];
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
            Object.values(this.props.entries).map(function(entry){
              return <FoodRow key={entry.id}
                          data={entry}
                          selected={that.state.selected}
                          onToggleSelected={that.handleToggleSelected}
                          onSelect={that.handleSelect}
                          onUnselect={that.handleUnselect}
                          onChange={that.props.updateData}/>
            })
          }
          { status }
          </tbody>
        </table>
        <h2>Search</h2>
        Search past entries and quickly add them to today's log.
        <SearchTable 
          controls={searchTableControls}/>
      </div>
    );
  }
  render() {
    return (<>
      {this.renderMobile()}
      {this.renderDesktop()}
    </>);
  }
}
const FoodTable = connect(
  function(state, ownProps) {
    let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: ownProps.date});

    let allEntries = Object.values(state.food.entities).filter(
      entity => entity && entity.date === ownProps.date && (!entity.premade || entity.premade == null)
    );
    let entitiesWithoutParent = allEntries.filter(entity => !entity.parent_id);
    allEntries = arrayToDict(allEntries, 'id');
    entitiesWithoutParent = arrayToDict(entitiesWithoutParent, 'id');
    // Add children to entries
    for (let id of Object.keys(allEntries)) {
      allEntries[id].children = allEntries[id].children_ids.map(id=>allEntries[id]).filter(entry=>entry);
    }

    function computeTotal(entries, property) {
      let total = Object.values(entries).map(function(entry) {
        if (entry[property]) {
          return entry[property];
        } else {
          return computeTotal(
            entry.children_ids.map(id => allEntries[id]).filter(entry => entry),
            property
          );
        }
      }).filter(
        val => val && isFinite(val)
      ).reduce(
        (acc, val) => acc+parseFloat(val), 0
      );
      total = clipFloat(total, 1);
      return total;
    }

    return {
      loadingStatus,
      entries: entitiesWithoutParent,
      allEntries,
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
      deleteEntry: ids => dispatch(foodActions['deleteMultiple'](ids)),
      createEntry: data => dispatch(foodActions['create'](data)),
      notify: x => dispatch(notify(x)),
    };
  }
)(ConnectedFoodTable);

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
  handleQuantityScale(scale, vals) {
    this.setState({
      calories: vals['calories'],
      protein: vals['protein'] 
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
              scalablevalues={{
                calories: this.state.calories,
                protein: this.state.protein
              }}
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
      <label className={this.state.checked ? 'dropdown-checkbox checked' : 'dropdown-checkbox'}>
        <i className='material-icons action'>
          arrow_right
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
      expanded: true
    };

    this.getOnChangeHandler = this.getOnChangeHandler.bind(this);
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
  toggleChildren(visible) {
    this.setState({
      expanded: visible
    });
  }
  handleQuantityScale(scale, vals) {
    let onChange = this.props.onChange || function(){console.error('No onChange callback defined.')};
    onChange({
      ...this.props.data,
      calories: vals['calories'],
      protein: vals['protein']
    });
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }
  render() {
    let {
      selected,
      depth = 0
    } = this.props;
    let childrenCalories = this.props.data.children.map(
      child => child.calories
    ).reduce(
      (a, b) => a+b, 0
    );
    let childrenProtein = this.props.data.children.map(
      child => child.protein
    ).reduce(
      (a, b) => a+b, 0
    );
    let expandCheckbox = null;
    //if (this.props.data.children.length > 0) {
    //  expandCheckbox = (
    //    <DropdownCheckbox 
    //      ref={this.dropdownCheckbox}
    //      onChange={this.toggleChildren}
    //      checked={this.state.expanded}/>
    //  );
    //}
    let indentation = null;
    for (let i = 0; i < depth; i++) {
      indentation = (
        <>{indentation}<div className='indentation'/></>
      );
    }
    indentation = (<div className='indentations'>{indentation}</div>);
    let that = this;
    return (
      <>
        <tr className='entry'>
          <td>
          </td>
          <td>
            <div>
            {indentation}
            {expandCheckbox}
            <input type='text' value={this.props.data.name} onChange={this.getOnChangeHandler('name')} onKeyPress={this.handleKeyPress} />
            </div>
          </td>
          <td>
            <QuantityInput
                value={this.props.data.quantity || ''}
                onChange={this.getOnChangeHandler('quantity')}
                onKeyPress={this.handleKeyPress}
                onScale={this.handleQuantityScale}
                scalablevalues={{
                  calories: this.props.data.calories,
                  protein: this.props.data.protein
                }} />
          </td>
          <FoodRowCell value={this.props.data.calories || ''}
            onChange={this.getOnChangeHandler('calories')}
            placeholder={childrenCalories || ''}/>
          <FoodRowCell value={this.props.data.protein || ''}
            onChange={this.getOnChangeHandler('protein')}
            placeholder={childrenProtein || ''}/>
          <td className='select'>
            <Checkbox checked={selected.has(this.props.data.id)}
              onChange={()=>this.props.onToggleSelected(this.props.data)} />
          </td>
        </tr>
        {this.state.expanded && this.props.data.children.length > 0 && 
          this.props.data.children.map(function(child){
            return (<FoodRow key={child.id} 
                data={child}
                selected={selected}
                onToggleSelected={that.props.onToggleSelected}
                onChange={that.props.onChange}
                depth={depth+1}/>);
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
          onKeyPress={this.handleKeyPress}
          {...this.props} />
      </td>
    );
  }
}

class FoodRowMobile extends Component {
  constructor(props){
    super(props);
    [
      'handleClick', 'handleDuplicate', 'duplicate'
    ].forEach(x=>this[x].bind(this));
    this.duplicate = this.duplicate.bind(this);
  }
  handleClick() {
    let {
      selected,
      entry,
      onToggleSelected
    } = this.props;
    onToggleSelected(entry);
  }
  handleDuplicate(entry) {
    let newEntry = this.duplicate(entry);
    newEntry['date'] = formatDate(new Date());
    this.props.createEntry(newEntry);
  }
  duplicate(entry) {
    let {id, parent_id, ...newEntry} = {...entry};
    newEntry['photo_ids'] = [];
    newEntry['children'] = entry.children.map(this.duplicate);
    return newEntry;
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
    // Selected overlay
    let selectedOverlay = null;
    if (selected.has(entry.id)) {
      selectedOverlay = (
        <div className='selected-overlay'>
          <i className='material-icons action'
              onClick={()=>onToggleSelected(entry)}>
            check_box
          </i>
          <i className='material-icons action'
                onClick={()=>null}>
            <Link to={'/food/editor?id='+entry.id}>
              create
            </Link>
          </i>
          <i className='material-icons action'
              onClick={()=>deleteEntry(entry.id)}>
            delete
          </i>
          <i className='material-icons action'
              onClick={()=>this.handleDuplicate(entry)}>
            file_copy
          </i>
        </div>
      );
    }
    // Indentation
    let indentation = null;
    for (let i = 0; i < depth; i++) {
      indentation = (
        <>{indentation}<div className='indentation'/></>
      );
    }
    indentation = (<div className='indentations'>{indentation}</div>)
    return (<>
      <div key={entry.id} className='entry'
        onClick={()=>this.handleClick(entry)} >
      {indentation}
      <div className='row-body'>
        <div className={entry.name ? 'name' : 'name empty'}>
          {entry.name || 'Unnamed entry'}
        </div>
        <div className='values'>
          {entry.quantity && <span>{entry.quantity}</span>}
          {entry.calories && <span>Calories: {clipFloat(entry.calories,1)}</span>}
          {entry.protein && <span>Protein: {clipFloat(entry.protein,1)}</span>}
          {!entry.quantity && !entry.calories && !entry.protein && <span>No nutritional information</span>}
        </div>
      </div>
      <Link to={'/food/editor?id='+entry.id}>
        <i className='material-icons'>chevron_right</i>
      </Link>
      {selectedOverlay}
    </div>
    {entry.children.map(function(child){
      return (
        <FoodRowMobile 
            key={child.id}
            {...that.props}
            entry={child} 
            depth={depth+1} />
      );
    })}
    </>);
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
      errorMessage: null,
      searchString: '',
      searchLoading: false,
      searchResults: {},
      searchSelectedEntry: null
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
      premade: this.state.data.premade
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
      data: {
        ...this.state.data,
        ...entryData
      },
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
      {value: 'Cancel', callback: this.closeAutocomplete, requiresSelected: true},
      {value: 'Add', callback: this.handleAutocompleteChildren, requiresSelected: true},
    ];
    return (
        <SearchTable 
          controls={searchTableControls}/>
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
    let children = null;
    if (ownProps.id) {
      selectedEntry = state.food.entities[ownProps.id];
      if (selectedEntry) { // If the data is loaded
        children = selectedEntry.children_ids.map(id => state.food.entities[id]);
      }
    } else if (ownProps.photo_ids) {
      selectedEntry = {
        id: null,
        date: date,
        name: '',
        time: '',
        quantity: '',
        calories: '',
        protein: '',
        photo_ids: JSON.parse('['+ownProps.photo_ids+']'),
        children: [],
        premade: false
      };
    } else {
      selectedEntry = {
        id: null,
        date: date,
        name: '',
        time: '',
        quantity: '',
        calories: '',
        protein: '',
        photo_ids: [],
        children: [],
        premade: false
      };
    }

    return {
      photos,
      photoLoadingStatus,
      selectedEntry,
      children,
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchFood: id => dispatch(foodActions['fetchSingle'](id)),
      fetchFoodByDate: date => dispatch(foodActions['fetchMultiple']({date: date})),
      fetchPhotosByDate: date => dispatch(photoActions['fetchMultiple']({date})),
      createFoodEntry: data => dispatch(foodActions['create'](data)),
      updateFoodEntry: data => dispatch(foodActions['updateNow'](data)),
      deleteFoodEntry: id => dispatch(foodActions['deleteSingle'](id)),
      uploadPhoto: (files) => dispatch(
        photoActions['create'](files, ownProps.date)
      ),
      notify: x => dispatch(notify(x)),
    };
  }
)(ConnectedEntryEditorForm);

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
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/foods/search?q="+encodeURI(this.state.query),
      {withCredentials: true}
    ).then(function(response){
      that.setState({
        results: response.data,
        loading: false
      });
    }).catch(function(error){
      console.error(error);
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
    let {date, id, ...entry} = this.getSelectedEntry();
    function clean(e) {
      delete e.id;
      delete e.date;
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
    if (resultsBySection['premade']) {
      results = (<>
        {results}
        <tr><td colSpan='999'>Premade Foods</td></tr>
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
      return (
        <button key={control['value']} className={disabled ? 'disabled' : ''} onClick={()=>control['callback'](that.getSelectedEntryCopy())}>{control['value']}</button>
      );
    });
    // Add edit button
    if (this.state.selectedEntry) {
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
        <td><FoodNameInput onChange={this.handleChange} name='name' value={this.props.data.name || ''} /></td>
        <td><QuantityInput onChange={this.handleChange} name='quantity' value={this.props.data.quantity || ''} onScale={this.handleScale} scalablevalues={{calories: this.props.data.calories, protein: this.props.data.protein}}/></td>
        <td><input type='text' onChange={this.handleChange} name='calories' value={this.props.data.calories || ''} /></td>
        <td><input type='text' onChange={this.handleChange} name='protein' value={this.props.data.protein || ''} /></td>
      </tr>
    );
  }
}
