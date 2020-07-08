import React, { 
  Component, useState, useEffect, useRef
} from 'react';
import { Link, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import axios from 'axios';

import { useDispatch, useSelector } from "react-redux";

import { 
  getLoadingStatus,
  arrayToDict,
  clipFloat,
  computeDietEntryTotal,
  computeScale,
  splitUnits,
} from './Utils.js';
import { 
  foodActions,
  //photoActions,
} from './actions/Actions.js';

import {
  Checkbox, FoodPhotoThumbnail, DropdownMenu,
  Button,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Breadcrumbs
} from './Common.js';
import {
  parseQueryString, dictToQueryString, formatDate,
  entryToEntryString, entryStringToEntry, extractNameFromEntryString,
  foodEntriesToTrees
} from './Utils.js';
import { usePhotos, usePhotoUploader, FoodPhotosGallery } from './Photos.js';

import './Diet.scss';

function useFoodEntries(id,date) {
  const dispatch = useDispatch();
  const fetchEntry = id => dispatch(foodActions['fetchSingle'](id));
  const fetchEntries = date => dispatch(foodActions['fetchMultiple']({date}));

  const loadingStatuses = useSelector(state => state.loadingStatus['FOOD']);
  const entries = useSelector(state => state.food.entities);

  let [mainEntry,setMainEntry] = useState(null);
  let [children, setChildren] = useState({});
  let [allEntries, setAllEntries] = useState({});
  let [loadingStatus, setLoadingStatus] = useState({});

  // Load entries
  useEffect(() => {
    if (id === null) {
      return;
    }
    if (mainEntry) {
      return;
    }
    fetchEntry(id);
  }, [id]);
  useEffect(() => {
    if (loadingStatus.status === 'loading' ||
        loadingStatus.status === 'loaded') {
      return;
    } 
    fetchEntries(date);
  }, [date, loadingStatus]);

  // Compute values
  useEffect(() => {
    let e = Object.values(
      entries
    ).filter(entity => {
      if (!entity) {
        return false;
      }
      if (id) {
        if (entries[id]) {
          if (entity.date !== entries[id].date) {
            return false;
          }
        } else {
          return false;
        }
      } else {
        if (entity.date !== date) {
          return false;
        }
      }
      if (entity.premade === true) {
        return false;
      }
      return true;
    });
    let tree = foodEntriesToTrees(e,false);
    let nodes = foodEntriesToTrees(e,true);
    tree = arrayToDict(tree,'id');
    nodes = arrayToDict(nodes,'id');
    if (id) {
      setMainEntry(nodes[id]);
      if (nodes[id]) {
        setChildren(arrayToDict(nodes[id].children,'id'));
      } else {
        setChildren({});
      }
    } else {
      setMainEntry(null);
      setChildren(tree);
    }
    setAllEntries(nodes);
  }, [id, date, entries]);
  useEffect(() => {
    let status = {};
    if (id === null) {
      status = getLoadingStatus(loadingStatuses, {date});
    } else {
      status = getLoadingStatus(loadingStatuses, {id});
    }
    setLoadingStatus(status || {});
  }, [id, date, loadingStatuses]);

  return [mainEntry, children, allEntries, loadingStatus];
}

export function ConnectedDietPage(props) {
  const dispatch = useDispatch();
  const updateEntry = e => dispatch(foodActions['update'](e));
  const location = useLocation();
  const currentUid = useSelector(state => state.session.uid);
  const [uid, setUid] = useState(currentUid);
  const [date, setDate] = useState(formatDate(new Date()));
  const [mainEntryId, setMainEntryId] = useState(null);
  const [
    mainEntry, visibleEntries, allEntries, loadingStatus
  ] = useFoodEntries(mainEntryId,date);

  // Callbacks
  function setDateWithHistory(date) {
    let params = parseQueryString(location.search);
    params.date = formatDate(date);
    props.history.push(dictToQueryString(params, ['uid', 'date']));
  }

  // Query string change
  useEffect(() => {
    let queryParams = parseQueryString(location.search);
    setUid(parseInt(queryParams['uid']) || currentUid);
    setMainEntryId(parseInt(queryParams['id']) || null);
    setDate(queryParams['date'] || formatDate(new Date()));
  }, [location, currentUid]);

  // Set date to match the selected entry
  useEffect(() => {
    if (mainEntry && mainEntry.date !== date) {
      setDate(mainEntry.date);
    }
  }, [mainEntry, date]);

  // Compute path for breadcrumbs
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  useEffect(() => {
    let path = [];
    let e0 = allEntries[mainEntryId];
    let e = e0;
    while (e) {
      path.push({
        text: e.name,
        url: 'food?id='+e.id
      });
      e = allEntries[e.parent_id];
    }
    let d = (e0 || {}).date || date;
    path.push({
      text: d,
      url: 'food?date='+d
    });
    setBreadcrumbPath(path.reverse());
  }, [mainEntryId, allEntries, date]);

  let entryEditorForm = null;
  if (mainEntryId) {
    function deleteEntry() {
      if (window.confirm('Are you sure you want to delete this entry?')) {
        dispatch(foodActions['deleteSingle'](mainEntryId));
      }
    }
    entryEditorForm = (
      <div className='card col-12'>
        <EntryEditorForm entry={mainEntry || {}} onChange={updateEntry} />
        <button onClick={deleteEntry}>Delete</button>
      </div>
    );
  }
  return (
    <main className='diet-page-container'>
      <div className='card col-12 header'>
        <Breadcrumbs data={breadcrumbPath} />
        <DateSelector date={date} onChange={setDateWithHistory} />
      </div>
      <div className='main-card col-12'>
        <div className='card'>
          <h2>New Entry</h2>
          <span>Record your what you ate today:</span>
          <NewEntryField date={date} parentId={mainEntryId}/>
        </div>
      </div>
      <div className='card col-12'>
        <h3>Log</h3>
        <FoodTable entries={visibleEntries} />
      </div>
      <div className='card col-12'>
        <FoodPhotosGallery uid={uid} foodId={mainEntryId} date={date}/>
      </div>
      {entryEditorForm}
    </main>
  );
}

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
    this.onChange(formatDate(newDate));
  }
  nextDate() {
    let {
      date = this.state.date,
    } = this.props;
    var newDate = new Date(date);
    newDate.setDate(newDate.getDate()+2);
    this.onChange(formatDate(newDate));
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

export function useFoodPhotos(uid,id,date) {
  const photos = usePhotos(uid);
  const food = useSelector(state => state.food.entities);
  //const [, , allEntries, ] = useFoodEntries(id,date);
  const [filtered,setFiltered] = useState([]);
  useEffect(() => {
    if (id) {
      if (typeof(id) !== 'number') {
        console.error( 'Provided ID is not a number. Found type '+typeof(id)+'.'); }
      setFiltered(
        (photos[date]||[]).filter(p => {
          let fid = p.food_id;
          while (true) {
            if (fid === id) {
              return true;
            }
            if (!fid) {
              return false;
            }
            fid = food[fid].parent_id;
          }
        })
      );
    } else if (date) {
      setFiltered(photos[date] || []);
    } else {
      console.error('No id or date provided');
    }
  }, [id, date, photos, food]);
  return filtered;
}

function Gallery(props) {
  const {
    uid,
    id,
    date
  } = props;
  const photos = useFoodPhotos(uid, id, date);
  const [ulProgress,ulErrors,upload] = usePhotoUploader(date,id);
  let photosDom = photos.map((photo) => {
    return (<FoodPhotoThumbnail photoId={photo.id}
        selected={false}
        key={photo.id}/>);
  });
  return (<>
    <div className='gallery'>
      {photosDom}
    </div>
    <div className='controls'>
      <label>
        <input type="file" name="file" accept="image/*" capture="camera"
            onChange={upload}/>
        <Button>Upload Photo</Button>
      </label>
    </div>
  </>);
}

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
    let rows = null;
    if (Object.entries(entries).length === 0) {
      rows = (
        <tr><td colSpan='999'>No entries to show</td></tr>
      )
    } else {
      rows = Object.entries(entries).map(function([id,entry]){
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
            <td>{entry.name} {children_count} <Link to={'/food?id='+entry.id}><i className='material-icons'>create</i></Link></td>
            <td>{entry.quantity || '-'}</td>
            {createRow(entry.calories,total.calories)}
            {createRow(entry.carb,total.carb)}
            {createRow(entry.protein,total.protein)}
          </tr>
        );
      });
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
          {rows}
          <tr className='total'>
            <th>Total</th>
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
      if (keys.length === 0) {
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
              tabIndex='-1'
              value={entry.date || ''}
              onChange={onChange}
              onKeyPress={onKeyPress}/>
        </label>
        <label className='time'>
          <span>Time</span>
          <input type='time' name='time'
              tabIndex='-1'
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
            <Checkbox name='finished' checked={entry.finished|| false} onChange={onChange}/>
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
      window.error = error;
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
          suggestions.slice(0,numDisplayed).map((suggestion,i) => {
            return (
              <div className='suggestion' key={suggestion.name+i}>
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
  }, [name, units]);
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

//////////////////////////////////////////////////
// Simple New Entry Field
//////////////////////////////////////////////////

function NewEntryField(props) {
  const dispatch = useDispatch();
  const createEntry = entry => dispatch(foodActions['create'](entry));
  const [entryString, setEntryString] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [error, setError] = useState(null);
  let inputRef = useRef(null);
  let suggestionsRef = useRef(null);

  // Toggle visibility based on props
  useEffect(()=>{
    if (!inputRef.current) {
      return;
    }
    if (props.visible) {
      inputRef.current.focus();
    }
  }, [props.visible]);
  // Update suggestions when entry changes
  useEffect(()=>{
    setLoadingSuggestions(true);
    setSelectedSuggestion(null);
    let entryName = extractNameFromEntryString(entryString).trim();
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/search?q="+encodeURI(entryName),
      {withCredentials: true}
    ).then(response => {
      setSuggestions(response.data.frequent);
      setLoadingSuggestions(false);
      setSelectedSuggestion(null);
      console.log(response.data);
    }).catch(error => {
      console.error(error);
      window.error = error;
      setError(error.response.data.error);
      setLoadingSuggestions(false);
      setSelectedSuggestion(null);
    });
  }, [entryString]);

  // onBlur callback
  let blurTimeout = useRef(null);
  function onBlur(e) {
    if (blurTimeout.current) {
      return;
    }
    blurTimeout.current = window.setTimeout(() => {
      if (props.onBlur) {
        props.onBlur();
      }
    }, 50);
  }
  function onFocus(e) {
    if (blurTimeout.current) {
      window.clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
  }
  useEffect(() => {
    clearTimeout(blurTimeout.current);
    blurTimeout.current = null;
  }, [props.visible]);
  // Keydown callback
  function onKeyDown(e) {
    const kbEnter = 13;
    const kbUp = 38;
    const kbDown = 40;
    if (!suggestions) {
      return;
    }
    switch (e.keyCode) {
      case kbUp:
        if (selectedSuggestion === null) {
          setSelectedSuggestion(suggestions.length-1);
        } else {
          let selected = selectedSuggestion-1;
          if (selected < 0) {
            selected = null;
          }
          setSelectedSuggestion(selected);
        }
        e.preventDefault();
        break;
      case kbDown:
        if (selectedSuggestion === null) {
          setSelectedSuggestion(0);
        } else {
          let selected = selectedSuggestion+1;
          if (selected >= suggestions.length) {
            selected = null;
          }
          setSelectedSuggestion(selected);
        }
        e.preventDefault();
        break;
      case kbEnter:
        if (selectedSuggestion === null) {
          e.preventDefault();
          // Parse string for entry details
          let entry = entryStringToEntry(entryString);
          entry.date = props.date;
          if (props.parentId) {
            entry.parent_id = props.parentId;
          }
          createEntry(
            entry
          ).then(response => {
            setEntryString('');
          });
        } else {
          let entry = suggestions[selectedSuggestion];
          setSelectedSuggestion(null);
          setEntryString(entryToEntryString(entry));
        }
        break;
      default:
        break;
    }
  }

  // Render DOM
  let suggestionsDom = null;
  if (suggestions) {
    const details = [{
      key: 'quantity',
      label: 'qty:'
    },{
      key: 'calories',
      label: 'kCals:'
    },{
      key: 'protein',
      label: 'prot:'
    }];
    suggestionsDom = suggestions.map((s,i) => {
      let classNames = 'suggestion';
      if (selectedSuggestion === i) {
        classNames += ' selected';
      }
      return (
        <div className={classNames} key={i}>
          {s.name}
          <ul className='details'>
            {details.map(d => {
              if (!s[d.key]) {
                return null;
              }
              return (<li key={d.key}>
                <span className='label'>{d.label}</span>
                <span className='value'>{clipFloat(s[d.key],1)}</span>
              </li>);
            })}
          </ul>
        </div>
      );
    });
  } else if (loadingSuggestions) {
    suggestionsDom = 'Loading...';
  }
  suggestionsDom = null;
  return (
    <div className='new-entry-field-container'>
      {
        error &&
        <div className='error-message'>{error}</div>
      }
      <input type='text'
          placeholder='e.g. Banana'
          value={entryString}
          onChange={e => setEntryString(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur} />
      <div className='suggestions' ref={suggestionsRef}>
        { suggestionsDom }
      </div>
    </div>
  );
}
