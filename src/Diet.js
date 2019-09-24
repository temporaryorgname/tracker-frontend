import React, { Component, useState, useEffect, Fragment } from 'react';
import { Route, Link, Switch } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { connect, shallowEqual, useSelector } from "react-redux";

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
  Checkbox, FoodPhotoThumbnail, ThumbnailsList, DropdownMenu, Accordion,
  BigButton, Button,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Breadcrumbs
} from './Common.js';
import { parseQueryString, dictToQueryString, formatDate } from './Utils.js';

import './Diet.scss';

function toggleSet(s,x) {
  if (s.has(x)) {
    s = new Set(s)
    s.delete(x);
    return s;
  } else {
    return new Set(s).add(x);
  }
}

function getFoodEntrySelectorById(id) {
  return (state) => {
    let status = getLoadingStatus(state.loadingStatus['FOOD'], {id: id});
    //let entities = state.food.entries || {};
    //let entity = entities[id];
    let entity = null;
    console.log('getFoodEntrySelectorById');
    console.log(entity);
    return {entity, status};
  }
}

export class DietPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newEntryFormVisible: false,
      newEntry: {},
      dupEntryFormVisible: false,
      dupEntry: {}
    };
    [
      'onDateChange',
      'showNewEntryForm','onChangeNewEntry','onCreateNewEntry',
      'onDeleteEntry',
      'onDuplicateEntry','onChangeDupEntry','onCreateDupEntry',
      'renderAutocompleteTable','renderBreadcrumbs'
    ].forEach(x=>this[x]=this[x].bind(this));
    if (this.props.id) {
      this.props.fetchEntry(this.props.id);
    } else {
      this.props.fetchEntries(this.props.date);
    }
  }
  componentDidUpdate(prevProps) {
    if (prevProps.date !== this.props.date) {
      this.props.fetchEntries(this.props.date);
      this.setState({
        selected: new Set()
      });
    }
  }
  onDateChange(date) {
    let {
      params = {}
    } = this.props;
    params.date = formatDate(date);
    this.props.history.push(dictToQueryString(params, ['uid', 'date']));
    this.setState({
      newEntry: {
        ...this.state.newEntry,
        date: date
      }
    });
  }
  showNewEntryForm() {
    let {
      date = formatDate(new Date())
    } = this.props;
    this.setState({
      newEntryFormVisible: true,
      newEntry: {
        date: date
      }
    });
  }
  onChangeNewEntry(e) {
    this.setState({
      newEntry: e
    });
  }
  onChangeDupEntry(e) {
    this.setState({
      dupEntry: e
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
  onCreateDupEntry() {
    this.props.createEntry({
      ...this.state.dupEntry,
      parent_id: null
    });
    this.setState({
      dupEntryFormVisible: false,
      dupEntry: {}
    });
  }
  onDeleteEntry() {
    let {
      mainEntry
    } = this.props;
    if (window.confirm('Delete entry "'+mainEntry.name+'"?')) {
      this.props.deleteEntries([{id: mainEntry.id}]);
      if (mainEntry.parent_id === null) {
        this.props.history.push('/food?date='+formatDate(mainEntry.date));
      } else {
        this.props.history.push('/food?id='+mainEntry.parent_id);
      }
    }
  }
  onDuplicateEntry() {
    if (this.props.mainEntry) {
      function clean(entry) {
        let cleanedEntry = {...entry};
        delete cleanedEntry.id;
        delete cleanedEntry.parent_id;
        cleanedEntry.children = cleanedEntry.children.map(clean);
        return cleanedEntry;
      }
      let dupEntry = clean(this.props.mainEntry);
      dupEntry.copied_from = this.props.mainEntry.id;
      this.setState({
        dupEntryFormVisible: true,
        dupEntry: dupEntry
      });
    }
  }
  renderAutocompleteTable() {
    let {
      id,
      date,
      mainEntry,
      createEntry,
      updateEntry,
      notify
    } = this.props
    let searchTableControls = null;
    if (id) {
      searchTableControls = [{
        value: 'Add', 
        callback: (x) => createEntry(
          {date: date, parent_id: id, ...x}
        ).then(function(response){
          let newEntry = Object.values(response.data.entities.food)[0];
          let url = '/food?id='+newEntry.id;
          notify({
            content: <span>Successfully copied entry <Link to={url}>Edit</Link></span>
          });
        }),
        requiresSelected: true
      },{
        value: 'Fill Entry', 
        callback: (x) => updateEntry(
          fillEntry(mainEntry,{date: date, ...x})
        ),
        requiresSelected: true
      }];
    } else {
      searchTableControls = [
        {
          value: 'Add', 
          callback: (x) => createEntry(
            {date: date, ...x, photo_ids: [], parent_id: null}
          ).then(function(response){
            let newEntry = Object.values(response.data.entities.food)[0];
            let url = '/food?id='+newEntry.id;
            notify({
              content: <span>Successfully copied entry <Link to={url}>Edit</Link></span>
            });
          }),
          requiresSelected: true
        }
      ];
    }
    return (
      <SearchTable controls={searchTableControls} editable={true} />
    );
  }
  renderBreadcrumbs() {
    let {
      mainEntry,
      allEntries = {},
    } = this.props;
    if (mainEntry) {
      let path = [];
      let entry = mainEntry;
      while (entry.parent_id) {
        entry = allEntries[entry.parent_id];
        if (entry) {
          path.push({
            text: entry.name || '(Unnamed Entry)',
            url: '/food?id='+entry.id
          });
        } else {
          path.push({
            text: '...',
            url: '#'
          });
          break;
        }
      }
      path.push({
        text: mainEntry.date,
        url: 'food?date='+mainEntry.date
      });
      return (
        <Breadcrumbs data={path.reverse()} />
      );
    } else {
      return null;
    }
  }
  render() {
    let {
      mainEntry = null,
      entries = {},
      date = formatDate(new Date()),
      uid,
      id,
      updateEntry,
    } = this.props;
    let mainEntryEditor = null;
    let mainEntryControls = null;
    if (id) {
      if (mainEntry) {
        mainEntryEditor = (<>
          <h3>{mainEntry.name}</h3>
          <Accordion heading='Details'>
            <EntryEditorForm entry={mainEntry} onChange={this.props.updateEntry}/>
          </Accordion>
        </>);
        mainEntryControls = (<>
          <button onClick={this.onDuplicateEntry}>Duplicate</button>
          <button onClick={this.onDeleteEntry}>Delete</button>
        </>);
      } else {
        mainEntryEditor = 'Loading...';
      }
    } else {
      mainEntryEditor = (
        <DateSelector date={date} onChange={this.onDateChange} />
      );
    }
    return (<main className='diet-page-container'>
      {this.renderBreadcrumbs()}
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
          onSubmit={this.onCreateNewEntry}
          controls={[
            {text: 'Create Entry', callback: this.onCreateNewEntry}
          ]}/>
      <EntryEditorFormModal
          entry={this.state.dupEntry}
          onChange={this.onChangeDupEntry}
          isOpen={this.state.dupEntryFormVisible}
          toggle={x => this.setState({dupEntryFormVisible: x})} 
          onSubmit={this.onCreateDupEntry}
          controls={[
            {text: 'Create Entry', callback: this.onCreateDupEntry}
          ]}/>
      </div>
      <Accordion heading='Suggestions'>
        <Suggestions date={date}
            parent={mainEntry ? mainEntry.name : null}
            siblings={Object.entries(entries).map(e => e.name).filter(x => x)}
            onSelect={name => this.props.createEntry({
              date, name,
              parent_id: mainEntry ? mainEntry.id : null
            })}/>
      </Accordion>
      <Accordion heading='Photos'>
        <ConnectedGallery uid={uid} date={date} foodId={id}/>
      </Accordion>
      <Accordion heading='Search Past Entries'>
        {this.renderAutocompleteTable()}
      </Accordion>
      { mainEntry &&
        <Accordion heading='Nutrition Search'>
          <NutritionSearch name={mainEntry.name}
            units={splitUnits(mainEntry.quantity).units} 
            onSelect={(x) => updateEntry(
              fillEntry(mainEntry,x)
            )}/>
        </Accordion>
      }
      { mainEntry &&
        <Accordion heading='Advanced Details'>
          <AdvancedDetailsForm entry={mainEntry} onChange={this.props.updateEntry} />
        </Accordion>
      }
      {mainEntryControls}
    </main>);
  }
}
export const ConnectedDietPage = connect(
  function(state, ownProps) {
    // Parse Query String
    let queryParams = parseQueryString(ownProps.location.search);
    let uid = queryParams['uid'] || state.session.uid;
    let id = queryParams['id'];
    let date = id ? null : (queryParams['date'] || formatDate(new Date()));

    // Get data from state
    if (id) {
      let mainEntry = state.food.entities[id];
      let mainEntryLoadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {id: id});
      if (!mainEntry) {
        return {
          uid,
          date,
          params: queryParams,
          mainEntry: mainEntry,
          entries: [],
          dirty: state.food.dirtyEntities.size > 0,
          id
        }
      }

      let allEntries = Object.values(state.food.entities).filter(
        entity => entity && entity.date === mainEntry.date && (!entity.premade || entity.premade == null)
      );
      for (let id of Object.keys(allEntries)) {
        allEntries[id].children = allEntries[id].children_ids.map(id=>allEntries[id]).filter(entry=>entry);
      }
      let subentries = Object.values(allEntries)
          .filter(e => e.parent_id == mainEntry.id);
      mainEntry.children = subentries;
      let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: mainEntry.date});
      return {
        uid,
        date: mainEntry.date,
        params: queryParams,
        mainEntry: mainEntry,
        entries: arrayToDict(subentries, 'id'),
        allEntries: arrayToDict(allEntries, 'id'),
        dirty: state.food.dirtyEntities.size > 0,
        id
      }
    } else {
      let loadingStatus = getLoadingStatus(state.loadingStatus['FOOD'], {date: date});
      let allEntries = Object.values(state.food.entities).filter(
        entity => entity && entity.date === date && (!entity.premade || entity.premade == null)
      );
      let entriesWithoutParents = allEntries.filter(e => !e.parent_id);
      allEntries = arrayToDict(allEntries, 'id');
      entriesWithoutParents = arrayToDict(entriesWithoutParents, 'id');
      // Add children to entries
      for (let id of Object.keys(allEntries)) {
        allEntries[id].children = allEntries[id].children_ids.map(id=>allEntries[id]).filter(entry=>entry);
      }
      return {
        uid,
        date,
        params: queryParams,
        entries: entriesWithoutParents,
        allEntries: allEntries,
        dirty: state.food.dirtyEntities.size > 0
      }
    }
  },
  function(dispatch, ownProps) {
    return {
      // Diet entries
      fetchEntries: date => dispatch(foodActions['fetchMultiple']({date: date})),
      fetchEntry: id => dispatch(foodActions['fetchSingle'](id)),
      updateEntry: entry => dispatch(foodActions['update'](entry)),
      deleteEntries: ids => dispatch(foodActions['deleteMultiple'](ids)),
      createEntry: data => dispatch(foodActions['create'](data)),
      // Photos
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
      // Misc
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
    newDate.setDate(newDate.getDate());
    this.onChange(newDate);
  }
  nextDate() {
    let {
      date = this.state.date,
    } = this.props;
    var newDate = new Date(date);
    newDate.setDate(newDate.getDate()+2);
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

export class Gallery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhotoIds: new Set(),
      uploadingProgress: {},
      errors: [],
      editorVisible: false
    };
    [
      'handleUpload','uploadFile','handleSelectPhoto','handleDelete',
      'renderEmptyView',
      'renderThumbnails','renderUploadingThumbnails','renderErrorThumbnails'
    ].forEach(x=>this[x]=this[x].bind(this));
    this.props.fetchPhotos(this.props.uid);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.date !== this.props.date) {
      this.props.fetchPhotos(this.props.uid);
    }
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
  handleCreateEntryFromPhotos() {
  }
  render() {
    let {
      photosLoadingStatus,
      selectedPhotoIds = this.state.selectedPhotoIds,
      photos,
      date
    } = this.props;
    if (!photosLoadingStatus) {
      return (
        <div>
          Waiting to load
        </div>
      );
    } else if (photosLoadingStatus.status === 'loading') {
      return (
        <div>
          LOADING...
        </div>
      );
    } else if (photosLoadingStatus.status === 'error') {
      return (
        <div className='error-message'>
          {photosLoadingStatus.error}
        </div>
      );
    } else if (photosLoadingStatus.status === 'loaded') {
      // Check if there's any data to render
      let photosAvail = Object.keys(this.props.photos).length > 0;
      let errorsAvail = this.state.errors.length > 0;
      let uploadAvail = Object.keys(this.state.uploadingProgress).length > 0;
      if (photosAvail || errorsAvail || uploadAvail) {
        // Render controls
        let controls = [];
        controls.push(
          <label key='upload'>
            <input type="file" name="file" accept="image/*" capture="camera" onChange={this.handleUpload}/>
            <Button>Upload</Button>
          </label>
        );
        controls.push(
          <button key='select'>Select Photos</button>
        );
        if (selectedPhotoIds.size > 0) {
          controls.push(
            <button key='delete' onClick={this.handleDelete}>Delete</button>
          );
          // Compute editor URL
          let foodIds = new Set();
          let photoIds = Array.from(selectedPhotoIds);
          for (let pid of photoIds) {
            foodIds.add(this.props.photos[pid].food_id);
          }
          if (foodIds.size > 1) {
            //queryString = null;
          } else if (foodIds.size === 1 && !foodIds.has(null)) {
            let queryString = 'id='+foodIds.values().next().value;
            controls.push(
              <Link to={'/food/editor?'+queryString} key='edit'>
                <button>Edit Entry</button>
              </Link>
            );
          } else {
            let openForm = function() {
              this.setState({
                newEntry: {
                  date: date,
                  photo_ids: photoIds
                },
                editorVisible: true
              });
            }.bind(this);
            let toggleForm = function(x) {
              this.setState({
                editorVisible: x
              });
            }.bind(this);
            let createEntry = function() {
              this.setState({
                editorVisible: false,
                selectedPhotoIds: new Set()
              });
              this.props.createFood(this.state.newEntry);
            }.bind(this);
            controls.push(
              <Fragment key='new'>
              <button onClick={openForm}>New Entry</button>
              <EntryEditorFormModal
                  isOpen={this.state.editorVisible}
                  entry={this.state.newEntry}
                  onChange={e => this.setState({newEntry: e})} 
                  toggle={toggleForm}
                  onSubmit={createEntry}
                  controls={[
                    {text: 'Create', callback: createEntry}
                  ]}/>
              </Fragment>
            );
          }
        }
        // Render thumbnails
        let thumbnails = this.renderThumbnails();
        let uploadingThumbnails = this.renderUploadingThumbnails();
        let errorThumbnails = this.renderErrorThumbnails();
        return (
          <div className='gallery small'>
            <div className='thumbnails'>
              {thumbnails}
              {uploadingThumbnails}
              {errorThumbnails}
            </div>
            <div className='controls'>{controls}</div>
          </div>
        );
      } else {
        return this.renderEmptyView();
      }
    }
  }
  renderEmptyView() {
    return (
      <div className='gallery empty-view'>
        <div>There are no photos to show.</div>
        <label>
          <input type="file" name="file" accept="image/*" capture="camera" onChange={this.handleUpload}/>
          <BigButton icon='add_a_photo' text='Upload Photo' />
        </label>
      </div>
    );
  }
  renderThumbnails() {
    let {
      photos,
      selectedPhotoIds = this.state.selectedPhotoIds,
      disabledPhotos = new Set(),
      onSelectPhoto = this.handleSelectPhoto,
    } = this.props;
    let that = this;
    return Object.entries(photos).map(
      function([photoId,photo]){
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
                onClick={()=>onSelectPhoto(toggleSet(selectedPhotoIds,photoId))} >
              <FoodPhotoThumbnail photoId={photoId}
                  url={photo.url}
                  selected={selectedPhotoIds.has(photoId)}/>
            </div>
          );
        }
      }
    );
  }
  renderUploadingThumbnails() {
    return Object.entries(this.state.uploadingProgress).map(function([k,v]) {
      return (
        <div className='photo-viewer-thumbnail'
            key={'uploading-'+k}>
          <div className='thumbnail'>
            Uploading... ({Math.floor(v*100)}%)
          </div>
        </div>
      );
    });
  }
  renderErrorThumbnails() {
    return this.state.errors.map(function(e,i){
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
  }
}
const ConnectedGallery = connect(
  function(state, ownProps) {
    let {
      date,
      uid,
      foodId
    } = ownProps;
    let photos = {};
    let photosLoadingStatus = getLoadingStatus(
      state.loadingStatus['PHOTOS'],
      {user_id: uid, date: date}
    );
    let photosReady = photosLoadingStatus && photosLoadingStatus.status === 'loaded';
    if (photosReady) {
      // Get all photos for the given date
      photos = Object.values(
        state.photos.entities
      ).filter(function(photo) {
        return photo && photo.date === date;
      });
      if (foodId) {
        function check(id) {
          if (id === null) {
            return false;
          }
          if (id === parseInt(foodId)) {
            return true;
          }
          if (!state.food.entities[id]) {
            return false;
          }
          return check(state.food.entities[id].parent_id);
        }
        photos = photos.filter(photo => check(photo.food_id));
      }
      photos = arrayToDict(photos, 'id');
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
)(Gallery);

//////////////////////////////////////////////////
// Table
//////////////////////////////////////////////////

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
              let total = computeDietEntryTotal([entry]);
              function createRow(entryVal, computedVal, missingVal) {
                if (entryVal) {
                  return <td>{clipFloat(entryVal,0)}</td>;
                } else if (computedVal) {
                  return <td className='empty'>{clipFloat(computedVal,0)}</td>;
                } else {
                  return <td className='empty'>-</td>;
                }
              }
              return (
                <tr key={entry.id}>
                  <td>{entry.name} {children_count} <Link to={'/food?id='+id}><i className='material-icons'>create</i></Link></td>
                  <td>{entry.quantity || '-'}</td>
                  {createRow(entry.calories,total.calories)}
                  {createRow(entry.carb,total.carb)}
                  {createRow(entry.protein,total.protein)}
                </tr>
              );
            })
          }
          <tr className='total'>
            <td className='new-entry-container' onClick={createNewEntry}>
              + New Entry
            </td>
            <td>-</td>
            <td>{clipFloat(sum(entries,'calories'),0) || '-'}</td>
            <td>{clipFloat(sum(entries,'carb'),0) || '-'}</td>
            <td>{clipFloat(sum(entries,'protein'),0) || '-'}</td>
          </tr>
        </tbody>
      </table>
    );
  }
}

//////////////////////////////////////////////////
// Editor
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
      'onChange','updateEntry','handleChange','handleKeyPress',
      'handleCreateNewMicro','handleScale'
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
  handleKeyPress(e) {
    let {
      onSubmit = () => {},
      entry = this.state.entry,
    } = this.props;
    if (e.key === 'Enter') {
      onSubmit(entry);
    }
  }
  handleCreateNewMicro(e) {
    let {
      entry = this.state.entry
    } = this.props;
    let newEntry = null;
    if (entry.micronutrients) {
      newEntry = {
        ...entry,
        micronutrients: [
          ...entry.micronutrients,
          {type: '', value: ''}
        ]
      };
    } else {
      newEntry = {
        ...entry,
        micronutrients: [
          {type: '', value: ''}
        ]
      };
    }
    this.onChange(newEntry);
  }
  handleScale(scale, val) {
    let {
      entry = this.state.entry
    } = this.props;
    this.onChange({
      ...entry,
      calories: val['calories'],
      carbohydrate: val['carbohydrate'],
      fat: val['fat'],
      protein: val['protein']
    });
  }
  render() {
    let {
      entry = this.state.entry,
    } = this.props;
    let onChange = this.handleChange;
    let onKeyPress = this.handleKeyPress;
    let that = this;
    return (
      <form className='new-entry-form'>
        <label className='name'>
          <span>Name</span>
          <input type='text' name='name'
              value={entry.name || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>

        <label className='date'>
          <span>Date</span>
          <input type='date' name='date'
              value={entry.date || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>
        <label className='time'>
          <span>Time</span>
          <input type='time' name='time'
              value={entry.time || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>
        <label className='quantity'>
          <span>Quantity</span>
          <QuantityInput name='quantity' value={entry.quantity || ''}
              onChange={onChange}
              onScale={this.handleScale}
              scalablevalues={{
                calories: entry.calories,
                carbohydrate: entry.carbohydrate,
                fat: entry.fat,
                protein: entry.protein
              }}/>
        </label>

        <label className='calories'>
          <span>Calories</span>
          <input type='text' name='calories'
              value={entry.calories || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>
        <label className='carb'>
          <span>Carbs (g)</span>
          <input type='text' name='carbohydrate'
              value={entry.carbohydrate || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>
        <label className='fat'>
          <span>Fats (g)</span>
          <input type='text' name='fat'
              value={entry.fat || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>
        <label className='prot'>
          <span>Protein (g)</span>
          <input type='text' name='protein'
              value={entry.protein || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
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

export class EntryEditorFormModal extends Component {
  render() {
    let {
      toggle,
      isOpen,
      entry,
      onChange,
      controls = [],
      onSubmit = () => {}
    } = this.props;
    return (
      <Modal toggle={toggle} isOpen={isOpen}>
        <ModalHeader>New Entry</ModalHeader>
        <ModalBody>
          <EntryEditorForm entry={entry}
              onChange={onChange}
              onSubmit={onSubmit}/>
        </ModalBody>
        <ModalFooter>
          {
            controls.map(function(x){
              return (
                <button key={x.text} onClick={x.callback}>{x.text}</button>
              );
            })
          }
        </ModalFooter>
      </Modal>
    );
  }
}

export class AdvancedDetailsForm extends Component {
  constructor(props) {
    super(props);
    [
      'onChange','handleChange'
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
  handleChange(e) {
    let inputType = e.target.type;
    let changedField = e.target.name;
    let newValue = inputType === 'checkbox' ? e.target.checked : e.target.value;
    this.onChange({
      ...this.props.entry,
      [changedField]: newValue
    });
  }
  render() {
    let {
      entry = this.state.entry,
    } = this.props;
    let onChange = this.handleChange;
    let that = this;
    return (
      <form className='adv-details-form'>
        <label className='premade'>
          <span>Premade</span>
          <input type='checkbox' name='premade' checked={entry.premade || false} onChange={onChange}/>
        </label>
        {
          entry.premade &&
          <label className='finished'>
            <span>Finished</span>
            <input type='checkbox' name='finished' checked={entry.finished|| false} onChange={onChange}/>
          </label>
        }
      </form>
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

//////////////////////////////////////////////////
// Suggestions
//////////////////////////////////////////////////

function Suggestions(props){
  const [suggestions, setSuggestions] = useState([
    {name: 'Thing', score: 1},
    {name: 'Thing 2', score: 1},
    {name: 'Thing 3', score: 1},
  ]);
  const [loading, setLoading] = useState(false);
  const [numDisplayed, setNumDisplayed] = useState(5);
  let {
    date,
    parent = null,
    siblings = [],
    onSelect = console.log
  } = props;
  useEffect(() => {
    let params = {}
    if (parent) {
      params.parent = parent;
    }
    if (siblings.length > 0) {
      params.siblings = siblings.join(',');
    }
    setLoading(true);
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/predict"+dictToQueryString(params), {withCredentials: true}
    ).then(function(response){
      setSuggestions(response.data.data);
      setLoading(false);
      setNumDisplayed(5);
    }).catch(function(error){
      console.error(error);
      setLoading(false);
    });
  }, [parent, ...siblings]);
  if (loading) {
    return (
      <div className='suggestions-container'>
        Loading...
      </div>
    );
  } else {
    return (
      <div className='suggestions-container'>
        {
          suggestions.slice(0,numDisplayed).map(suggestion => {
            return (
              <div className='suggestion'>
                <i className='material-icons'
                    onClick={()=>onSelect(suggestion.name)}>add</i>
                <span>{suggestion.name}</span>
              </div>
            );
          })
        }
        <button onClick={()=>setNumDisplayed(numDisplayed+5)}>
          Show More
        </button>
      </div>
    );
  }
}

//////////////////////////////////////////////////
// Nutrition Search
//////////////////////////////////////////////////

function NutritionSearch(props){
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [numDisplayed, setNumDisplayed] = useState(5);
  let {
    name,
    units,
    onSelect = console.log
  } = props;
  // Load data
  useEffect(() => {
    // Load results
    let params = {
      name: name,
      units: units
    }
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/nutrition/search"+dictToQueryString(params), {withCredentials: true}
    ).then(function(response){
      setResults(response.data.history.all);
      setLoading(false);
      setNumDisplayed(5);
    }).catch(function(error){
      console.error(error);
      setLoading(false);
    });
  }, [props.name, props.units]);
  // Callback for key presses
  function getKeyPressHandler(entry) {
    return e => {
      if (e.keyCode || e.which === 13) {
        onSelect(entry);
      }
    }
  }
  // Render
  if (loading) {
    return (
      <div className='suggestions-container'>
        Loading...
      </div>
    );
  } else {
    return (
      <div className='nutrition-search-container'>
        {
          results.slice(0,numDisplayed).map(result => {
            return (
              <div className='nutrition' key={result.id}
                  onClick={()=>onSelect(result)}
                  onKeyPress={getKeyPressHandler(result)}
                  tabIndex={0}>
                <span className='name'>{result.name}</span>
                <span>{result.date}</span>
                {result.quantity && <span>{result.quantity}</span>}
                {result.calories && <span>{clipFloat(result.calories,1)} kCals</span>}
                {result.protein && <span>{clipFloat(result.protein,1)}g protein</span>}
              </div>
            );
          })
        }
        {
          numDisplayed < results.length &&
          <button onClick={()=>setNumDisplayed(numDisplayed+5)}>
            Show More
          </button>
        }
      </div>
    );
  }
}
