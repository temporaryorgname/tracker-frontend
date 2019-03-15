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
  photoActions
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
            customInput={<span>{this.props.params.date}</span>}/>
          <i className='material-icons action' onClick={this.nextDate}>navigate_next</i>
        </h3>
        <Switch>
          <Route path="/food/table" render={() => <FoodTable date={this.props.params.date} onDateChange={this.handleDateChange} />} />
          <Route path="/food/photos" render={() => <Gallery date={this.props.params.date} uid={this.props.params.uid} />} />
          <Route path="/food/editor" render={() => <EntryEditorForm date={this.props.params.date} uid={this.props.params.uid} id={this.props.params.id} photo_ids={this.props.params.photo_ids}/>} />
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

//////////////////////////////////////////////////
// Photos
//////////////////////////////////////////////////

class ConnectedGallery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhotoIds: new Set()
    };
    this.props.fetchPhotos(this.props.uid);
    this.handleSelectPhoto = this.handleSelectPhoto.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
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
  uploadFile(event) {
    let that = this;
    this.props.uploadPhoto(
      event.target.files
    ).then(function(response){
      that.props.fetchPhotos(false);
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
      if (Object.keys(this.props.photos).length > 0) {
        // Render controls
        let controls = (
          <>
            <label>
              <input type="file" name="file" accept="image/*" capture="camera" onChange={this.uploadFile}/>
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
        return (
          <div className='gallery'>
            <div className='controls'>{controls}</div>
            <div className='thumbnails'>
              {thumbnails}
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
    }
  }
  handleToggleSelected(entry) {
    /* Callback to be triggered when an entry has been selected. */
    var setCopy = new Set(this.state.selected);
    if (this.state.selected.has(entry.id)){
      function unselect(entry) {
        setCopy.delete(entry.id);
        entry.children.forEach(unselect);
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
    let entries = this.props.entries;
    let selected = this.state.selected;
    let newVals = Array.from(this.state.selected).filter(
      function(id) {
        for (let entry of entries) {
          if (entry.id === id) {
            return !selected.has(entry.parent_id);
          }
        }
        console.error('Could not find entry with ID '+id);
        return null;
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
  handleChangeDate(e) {
    let newDate = e.target.value;
    let confirmMove = window.confirm('Are you sure you want to move the selected entry to '+newDate+'?');
    if (confirmMove) {
      let that = this;
      Array.from(this.state.selected).forEach(function(id){
        for (var entry of that.props.entries) {
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
    let controls = null;
    let topLevelSelected = this.getSelectedTopLevel();
    if (topLevelSelected.size === 1) {
      let selectedId = topLevelSelected.values().next().value;
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
    } else if (topLevelSelected.size > 1) {
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
      <div className='mobile-food-table'>
        <div className='controls'>
          <div className='table-controls'>
          </div>
          <div className='entry-controls'>
            {controls}
          </div>
        </div>
        <div className='total'>
          Total: {this.props.total.calories} Calories, {this.props.total.protein}g protein
        </div>
        <div className='entries'>
          {
            this.props.entries.map(function(entry){
              return (<div key={entry.id} className='entry'>
                <div className='name'>
                  {entry.name}
                </div>
                <div className='values'>
                  {entry.quantity && <span>{entry.quantity}</span>}
                  {entry.calories && <span>Calories: {entry.calories}</span>}
                  {entry.protein && <span>Protein: {entry.protein}</span>}
                  {!entry.quantity && !entry.calories && !entry.protein && <span>No nutritional information</span>}
                </div>
                <Link to={'/food/editor?id='+entry.id}>
                  <i className='material-icons'>chevron_right</i>
                </Link>
              </div>);
            })
          }
          { status }
        </div>
        <Link to={'/food/editor?date='+this.props.date}>
          <button>New Entry</button>
        </Link>
      </div>
    );
  }
  renderDesktop() {
    var that = this;
    let controls = null;
    let topLevelSelected = this.getSelectedTopLevel();
    if (topLevelSelected.size === 1) {
      let selectedId = topLevelSelected.values().next().value;
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
    } else if (topLevelSelected.size > 1) {
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
                          onSelect={that.handleSelect}
                          onUnselect={that.handleUnselect}
                          onChange={that.props.updateData}/>
            })
          }
          { status }
          </tbody>
        </table>
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
    let onChange = this.props.onChange || function(){console.error('No onChange callback defined.')};
    var cals = this.props.data.calories;
    if (isFinite(cals)) {
      if (typeof cals === 'string' && cals.length > 0) {
        cals = parseFloat(cals)*scale;
        cals = cals.toString();
      } else {
        cals *= scale
      }
    }
    var prot = this.props.data.protein;
    if (isFinite(prot)) {
      if (typeof prot === 'string' && prot.length > 0) {
        prot = parseFloat(prot)*scale;
        prot = prot.toString();
      } else {
        prot *= scale
      }
    }
    onChange({
      ...this.props.data,
      calories: cals,
      protein: prot
    });
  }
  handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }
  render() {
    let selected = this.props.selected;
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
    let indentation = null;
    for (let i = 0; i < (this.props.depth || 0); i++) {
      indentation = (
        <><div className='indentation'/></>
      );
    }
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
          <td>
            {indentation}
            <input type='text' value={this.props.data.name} onChange={this.getOnChangeHandler('name')} onKeyPress={this.handleKeyPress} />
          </td>
          <td>
            <QuantityInput
                value={this.props.data.quantity || ''}
                onChange={this.getOnChangeHandler('quantity')}
                onKeyPress={this.handleKeyPress}
                onScale={this.handleQuantityScale}/>
          </td>
          <FoodRowCell value={this.props.data.calories}
            onChange={this.getOnChangeHandler('calories')}
            placeholder={childrenCalories || ''}/>
          <FoodRowCell value={this.props.data.protein}
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
                onChange={that.handleChildrenChange}
                depth={1}/>);
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

//////////////////////////////////////////////////
// Editor
//////////////////////////////////////////////////

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
    if (dateChanged) {
      // Clear photos if the date changed
      this.setState({
        data: {
          ...this.state.data,
          photo_ids: [],
        }
      });
      // Load food/photo data
      if (this.state.data.date) {
        this.props.fetchPhotosByDate(this.state.data.date);
      }
    }
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
      date: this.state.data.date,
      time: this.state.data.time,
      name: this.state.data.name,
      quantity: this.state.data.quantity,
      calories: this.state.data.calories,
      protein: this.state.data.protein,
      photo_ids: this.state.data.photo_ids,
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
      that.props.fetchPhotosByDate(that.state.data.date);
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
            <input type='date' name='date' value={this.state.data.date} onChange={this.onChange}/>
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
    if (ownProps.id) {
      selectedEntry = state.food.entities[ownProps.id];
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
      };
    }

    return {
      photos,
      photoLoadingStatus,
      selectedEntry
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchFood: id => dispatch(foodActions['fetchSingle'](id)),
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
            return <SmallTableRow
              key={index}
              data={datum} 
              onChange={x => that.handleChange(x, index)} />
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
  handleScale(scale) {
    this.props.onChange({
      ...this.props.data,
      calories: this.props.data.calories*scale,
      protein: this.props.data.protein*scale
    })
  }
  render() {
    return (
      <tr>
        <td><FoodNameInput onChange={this.handleChange} name='name' value={this.props.data.name || ''} /></td>
        <td><QuantityInput onChange={this.handleChange} name='quantity' value={this.props.data.quantity || ''} onScale={this.handleScale}/></td>
        <td><input type='text' onChange={this.handleChange} name='calories' value={this.props.data.calories || ''} /></td>
        <td><input type='text' onChange={this.handleChange} name='protein' value={this.props.data.protein || ''} /></td>
      </tr>
    );
  }
}
