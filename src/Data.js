import React, { Component } from 'react';

import { connect } from "react-redux";

import './Data.scss';
import { ThumbnailsList, AutocompleteInput } from './Common.js';
import { parseQueryString } from './Utils.js';
import { 
  fetchPhotos,
  fetchPhotoData,
  fetchTags,
  createTag,
  fetchLabels,
  createLabel,
  updateLabel,
  deleteLabel
} from './actions/Data.js';

export class DataPage extends Component {
  render() {
    var queryParams = parseQueryString(this.props.location.search);
    return (
      <div className='data-page-container'>
        <PhotoViewer uid={queryParams['uid']} />
      </div>
    );
  }
}

export class TagsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: null
    }
    this.handleTagSelect = this.handleTagSelect.bind(this);
  }
  handleTagSelect(tag) {
    this.setState({
      selected: tag
    });
  }
  render() {
    return (
      <div className='tag-page-container'>
        <h2>Tags</h2>
        <div>
          <h3>New Tag</h3>
          <NewTagForm />
          <h3>Select Tag</h3>
          <TagList onSelect={this.handleTagSelect}/>
        </div>
        <div>
          <h3>Editor</h3>
          {JSON.stringify(this.state.selected)}
        </div>
      </div>
    );
  }
}

class ConnectedPhotoViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhotoId: null
    };
    props.updateData(props.uid);
    this.handleChangePhoto = this.handleChangePhoto.bind(this);
  }
  handleChangePhoto(photoId) {
    if (photoId === this.state.selectedPhotoId) {
      return;
    }
    this.setState({
      selectedPhotoId: photoId
    });
  }
  render() {
    return (
      <div>
        <h2>Data</h2>
        <ThumbnailsList selectedId={this.state.selectedPhotoId}
          onChange={this.handleChangePhoto}
          uid={this.props.uid}/>
        {
          this.state.selectedPhotoId &&
          <LabelEditor photoId={this.state.selectedPhotoId} />
        }
      </div>
    );
  }
}
const PhotoViewer = connect(
  function(state, ownProps) {
    return {
      ids: state.data.photoIds
    };
  },
  function(dispatch, ownProps) {
    return {
      updateData: (id) => dispatch(fetchPhotos(id)),
      createLabel: (label) => dispatch(createLabel(label))
    };
  }
)(ConnectedPhotoViewer);

class ConnectedLabelEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLabelId: null,
      selectedTagId: [],
      box: null,
      draggingBox: null, 
      polygon: [],
      mode: 'box'
    };
    props.updateData(props.photoId);

    this.handleTagChange = this.handleTagChange.bind(this);
    this.handlePhotoClick = this.handlePhotoClick.bind(this);
    this.handlePhotoDragging = this.handlePhotoDragging.bind(this);
    this.handlePhotoDragged = this.handlePhotoDragged.bind(this);
    this.handleSelectLabel = this.handleSelectLabel.bind(this);
    this.handleRemoveLabel = this.handleRemoveLabel.bind(this);
    this.getLabel = this.getLabel.bind(this);
    this.createLabel = this.createLabel.bind(this);
    this.updateLabel = this.updateLabel.bind(this);
    this.clearBox = this.clearBox.bind(this);
    this.clearPolygon = this.clearPolygon.bind(this);
    this.discardChanges = this.discardChanges.bind(this);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.photoId !== this.props.photoId) {
      this.props.updateData(this.props.photoId);
    }
  }
  handleTagChange(tagIds) {
    this.setState({
      selectedTagId: tagIds
    });
  }
  handlePhotoClick(coord) {
    if (this.state.mode === 'polygon') {
      this.setState({
        polygon: this.state.polygon.concat([coord])
      });
    }
  }
  handlePhotoDragging(startCoord, endCoord) {
    if (this.state.mode === 'box') {
      this.setState({
        draggingBox: [startCoord, endCoord]
      });
    }
  }
  handlePhotoDragged(startCoord, endCoord) {
    if (this.state.mode === 'box') {
      this.setState({
        box: [startCoord, endCoord],
        draggingBox: null
      });
    }
  }
  handleSelectLabel(tag,index) {
    var label = this.props.labels[index]
    this.setState({
      selectedLabelId: label['id'],
      selectedTagId: [label['tag_id']],
      box: label['bounding_box'],
      polygon: label['bounding_polygon'] || []
    });
  }
  handleRemoveLabel(tag,index) {
    var label = this.props.labels[index]
    this.props.deleteLabel(label);
    if (this.selectedLabelId === label['id']) {
      this.discardChanges();
    }
  }
  getLabel() {
    var label = {}
    if (isFinite(this.props.photoId)) {
      label['photo_id'] = this.props.photoId;
    } else {
      console.error('No photo selected');
      return null;
    }
    if (this.state.selectedLabelId) {
      label['id'] = this.state.selectedLabelId;
    }
    if (this.state.selectedTagId.length !== 1) {
      console.error('No tag selected');
      return null;
    } else {
      label['tag_id'] = this.state.selectedTagId[0];
    }
    if (this.state.box !== null) {
      label['bounding_box'] = this.state.box;
    }
    if (this.state.polygon.length > 0) {
      label['bounding_polygon'] = this.state.polygon;
    }
    return label;
  }
  createLabel() {
    var label = this.getLabel();
    if (label === null) {
      return;
    }
    this.props.createLabel(label);
    this.setState({
      selectedTagId: [],
      box: null,
      polygon: []
    });
  }
  updateLabel() {
    var label = this.getLabel();
    if (label === null) {
      return;
    }
    this.props.updateLabel(label);
    this.setState({
      selectedTagId: [],
      box: null,
      polygon: []
    });
  }
  clearBox() {
    this.setState({
      box: null
    });
  }
  clearPolygon() {
    this.setState({
      polygon: []
    });
  }
  discardChanges() {
    this.setState({
      selectedLabelId: null,
      selectedTagId: [],
      box: null,
      polygon: []
    });
  }
  render() {
    var button = null;
    if (this.state.selectedLabelId) {
      button = (
        <div className='buttons-container'>
          <input type='button' value='Save Changes' onClick={this.updateLabel} />
          <input type='button' value='Discard Changes' onClick={this.discardChanges} />
        </div>
      );
    } else {
      button = (
        <div className='buttons-container'>
          <input type='button' value='Create Label' onClick={this.createLabel} />
        </div>
      );
    }
    return (
      <div>
        {
          this.props.photoId &&
          <LabelledFoodPhoto 
              fileid={this.props.photoId} 
              boxes={[this.state.box, this.state.draggingBox].filter((x)=>x)} 
              polygons={[this.state.polygon]}
              onClick={this.handlePhotoClick}
              onDragging={this.handlePhotoDragging}
              onDragged={this.handlePhotoDragged}/>
        }
        <div className='labeller-controls-container'>
          <h3>Photo Labels</h3>
          <label>
            Add label:
            <TagSelector 
              value={this.state.selectedTagId}
              onChange={(v) => {this.handleTagChange(v)}}
              limit={1}/>
          </label>
          <div>
            Mode:
            <label>
              <input type='radio' name='mode' value='box' 
                checked={this.state.mode === 'box'}
                onChange={(e) => this.setState({mode: e.target.value})}/>
              Box
            </label>
            <label>
              <input type='radio' name='mode' value='polygon'
                checked={this.state.mode === 'polygon'}
                onChange={(e) => this.setState({mode: e.target.value})}/>
              Polygon
            </label>
            <div className='buttons-container'>
              <input type='button' value='Clear Box' onClick={this.clearBox} />
              <input type='button' value='Clear Polygon' onClick={this.clearPolygon} />
            </div>
          </div>
          {button}
          <TagList tagIds={this.props.labels.map(l => l['tag_id'])}
              onSelect={this.handleSelectLabel}
              onRemove={this.handleRemoveLabel}/>
        </div>
      </div>
    );
  }
}
const LabelEditor = connect(
  function(state, ownProps) {
    if (ownProps.photoId) {
      var labelIds = state.data
          .labelIdsByPhotoId[ownProps.photoId];
      if (typeof labelIds === 'undefined') {
        return {
          labels: []
        };
      } else {
        return {
          labels: labelIds.map((id) => state.data.labelsById[id])
              .filter(x => typeof x !== 'undefined')
        };
      }
    } else {
      return {};
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: (photoId) => dispatch(fetchLabels(photoId)),
      createLabel: (label) => dispatch(createLabel(label)),
      updateLabel: (label) => dispatch(updateLabel(label)),
      deleteLabel: (label) => dispatch(deleteLabel(label))
    };
  }
)(ConnectedLabelEditor);

class ConnectedLabelledFoodPhoto extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: 0,
      height: 0
    }
    this.dragging = false;
    this.startCoords = null;
    this.startPageCoords = null;

    this.updateData = this.updateData.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleImageLoad = this.handleImageLoad.bind(this);
    this.updateData();
  }
  updateData() {
    if (this.props.data) {
      return;
    }
    this.props.updateData(this.props.fileid);
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.fileid !== this.props.fileid) {
      this.updateData();
    }
  }
  handleClick(event) {
    if (this.props.onClick) {
      this.props.onClick(
        [event.nativeEvent.offsetX, event.nativeEvent.offsetY]
      );
    }
  }
  handleDragStart(event) {
    if (this.dragging) {
      return;
    }
    this.dragging = true;
    this.startCoords = [event.nativeEvent.offsetX, event.nativeEvent.offsetY];
    this.startPageCoords = [event.nativeEvent.pageX, event.nativeEvent.pageY];
  }
  handleMouseMove(event) {
    if (this.dragging) {
      var coords = [
        this.startCoords[0]+(event.nativeEvent.pageX-this.startPageCoords[0]),
        this.startCoords[1]+(event.nativeEvent.pageY-this.startPageCoords[1]),
      ];
      if (this.props.onDragging) {
        this.props.onDragging(this.startCoords, coords);
      }
    }
  }
  handleDragEnd(event) {
    this.dragging = false;
    var coords = [
      this.startCoords[0]+(event.nativeEvent.pageX-this.startPageCoords[0]),
      this.startCoords[1]+(event.nativeEvent.pageY-this.startPageCoords[1]),
    ];
    if (this.props.onDragged) {
      this.props.onDragged(this.startCoords, coords);
    }
  }
  handleImageLoad(img) {
    this.setState({
      width: this.img.offsetWidth,
      height: this.img.offsetHeight
    })
  }
  render() {
    if (!this.props.data) {
      return (<i className="material-icons">fastfood</i>);
    } else {
      var svgBoxes = this.props.boxes.map(function(box, index){
        return <rect 
          x={Math.min(box[0][0], box[1][0])}
          y={Math.min(box[0][1], box[1][1])}
          width={Math.abs(box[1][0]-box[0][0])}
          height={Math.abs(box[1][1]-box[0][1])}
          key={index} />
      });
      var svgPolygons = this.props.polygons.map(function(points, index){
        var pointString = points.map((p) => p.join(',')).join(' ');
        return <polygon 
          points={pointString} 
          key={index}/>
      });
      var svgPoints = this.props.polygons.map(function(points, index){
        return points.map(function(point, index2){
          return <circle 
            className='control'
            cx={point[0]}
            cy={point[1]}
            r='3'
            fill='red'
            key={[index,index2].join(',')} />
        });
      });
      return (
        <div className='labelled-food-photo'>
          <img src={this.props.data}
              onLoad={this.handleImageLoad}
              ref={(x) => this.img = x}
              alt={'Food'}/>
          <svg className='food-photo'
              width={this.state.width}
              height={this.state.height}
              onClick={this.handleClick} 
              onDragStart={this.handleDragStart}
              onMouseMove={this.handleMouseMove}
              onMouseUp={this.handleDragEnd}
              onMouseDown={this.handleDragStart}
              ref={x=>{this.ref=x}}
              draggable='false'>
            {svgBoxes}
            {svgPolygons}
            {svgPoints}
          </svg>
        </div>
      );
    }
  }
}
const LabelledFoodPhoto = connect(
  function(state, ownProps) {
    return {
      data: state.data.photoData[ownProps.fileid]
    };
  },
  function(dispatch, ownProps) {
    return {
      updateData: (id) => dispatch(fetchPhotoData(id))
    };
  }
)(ConnectedLabelledFoodPhoto);

class Tag extends Component {
  constructor(props) {
    super(props);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    if (this.props.onClick) {
      this.props.onClick();
    }
  }
  handleRemove() {
    if (this.props.onRemove) {
      this.props.onRemove();
    }
  }
  render() {
    return (
      <div className='tag'>
        <div className='label' onClick={this.handleClick}>
          {this.props.children}
        </div>
        <div className='close' onClick={this.handleRemove}>
          x
        </div>
      </div>
    );
  }
}

class ConnectedTagSelector extends Component { 
  constructor(props) {
    super(props);
    this.state = {
      userInput: ''
    }
    this.handleSelect = this.handleSelect.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
  }
  handleSelect(selection) {
    // Can't add the same tag twice
    if (this.props.value.find((x) => x === selection.id)) {
      console.error('Already selected');
      return;
    }

    var newTagIds = this.props.value.concat([selection.id]);
    this.setState({
      userInput: ''
    });

    if (this.props.onChange) {
      this.props.onChange(newTagIds);
    } else {
      console.error('TagSelector is a controlled element and requires an onChange attribute');
    }
  }
  handleRemove(selectedId) {
    this.props.onChange(
      this.props.value.filter(x => x !== selectedId)
    );
  }
  render() {
    var that = this;
    return (
      <div className='tag-selector'>
        {
          this.props.value.map(function(id,index){
            return (
              <Tag key={id} onRemove={()=>{that.handleRemove(id)}}>
                {that.props.data[id]['tag']}
              </Tag>
            );
          })
        }
        {
         (!this.props.limit || this.props.value.length < this.props.limit) &&
          <TagInput 
            value={this.state.userInput}
            onChange={(e)=>{this.setState({userInput: e.target.value})}}
            onSelect={this.handleSelect} />
        }
      </div>
    );
  }
}
const TagSelector = connect(
  function(state, ownProps) {
    return {
      data: state.data.tagsById
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchTags()),
    };
  }
)(ConnectedTagSelector);

class ConnectedNewTagForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      label: '',
      parent: []
    }
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  handleSubmit(e) {
    e.preventDefault();
    var that = this;
    var newTag = {
      tag: this.state.label,
      parent_id: this.state.parent.length === 1 ? this.state.parent[0] : null,
      description: ''
    }
    this.props.createTag(
      newTag
    ).then(function(response){
      that.setState({
        label: '',
        parent: []
      });
    });
  }
  render() {
    return (
      <form onSubmit={this.handleSubmit} className='new-tag-form'>
        <label>
          Label
          <input type='text' 
            name='label' 
            value={this.state.label}
            onChange={(e)=>{this.setState({label: e.target.value})}}/>
        </label>
        <label>
          Parent label
          <TagSelector limit={1} value={this.state.parent}
            onChange={(v) => this.setState({parent: v})}/>
        </label>
        <button>Create Tag</button>
      </form>
    );
  }
}
const NewTagForm = connect(
  function(state, ownProps) {
    return {}
  },
  function(dispatch, ownProps) {
    return {
      createTag: (tag) => dispatch(createTag(tag)),
    };
  }
)(ConnectedNewTagForm);

class ConnectedTagInput extends AutocompleteInput {
  constructor(props) {
    super(props);
    this.state = {
      suggestions: [],
      loading: true
    };
    var that = this;
    props.updateData().then(function() {
      that.setState({loading: false});
    });

    this.ref = React.createRef();
    this.loadSuggestions = this.loadSuggestions.bind(this);
    this.renderSuggestions = this.renderSuggestions.bind(this);
  }
  loadSuggestions() {
    var that = this;
    if (this.props.value.length === 0) {
      this.setState({
        suggestions: [],
        loading: true
      });
      return;
    }
    this.setState({
      suggestions: this.props.data.filter(function(tag){
        if (tag.tag.toLowerCase().includes(that.props.value.toLowerCase())) {
          return true;
        }
        if (tag.description.toLowerCase().includes(that.props.value.toLowerCase())) {
          return true;
        }
        return false;
      }).slice(0,5),
      loading: false
    });
  }
  renderSuggestions() {
    var that = this;
    return (
      <table>
        <thead>
          <tr>
            <th>Tag</th>
            <th>Description</th>
            <th>Parent</th>
          </tr>
        </thead>
        <tbody onMouseDown={this.handleSelect}>
          {
            this.state.suggestions.map(function(tag,index){
              var className = that.state.selected === index ? 'selected' : '';
              return (
                <tr className={className} key={tag.id} onMouseEnter={that.getMouseEnterHandler(index)}>
                  <td>{tag.tag}</td>
                  <td>{tag.description}</td>
                  <td>{tag.parent_id}</td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    );
  }
}
const TagInput = connect(
  function(state, ownProps) {
    var tagIds = ownProps.tagIds || state.data.tagIds;
    return {
      data: tagIds.map((id) => state.data.tagsById[id] || null)
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchTags()),
    };
  }
)(ConnectedTagInput);

class ConnectedTagList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      selected: null
    };
    if (this.props.data.filter(x => x === null).length > 0) {
      this.props.updateData();
    }
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.getClickHandler = this.getClickHandler.bind(this);
    this.getRemoveHandler = this.getRemoveHandler.bind(this);
  }
  handleFilterChange(e) {
    this.setState({
      filter: e.target.value
    });
  }
  getClickHandler(tag,index) {
    var that = this;
    return function() {
      if (that.props.onSelect) {
        that.props.onSelect(tag,index);
      }
    }
  }
  getRemoveHandler(tag,index) {
    var that = this;
    return function() {
      if (that.props.onRemove) {
        that.props.onRemove(tag,index);
      }
    }
  }
  render() {
    var that = this;
    var data = this.props.data
      .map((x,i) => {return {'value': x, 'index': i}})
      .filter(x => x['value'] !== null)
    var filteredData;
    if (this.state.filter.length > 0) {
      filteredData = data.filter(
        x => x['value']['tag'].includes(this.state.filter)
      );
    } else {
      filteredData = data;
    }
    return (
      <div>
        <label>
          Filter:
          <input type='text' value={this.state.filter}
              onChange={this.handleFilterChange} />
        </label>
        {
          filteredData
            .map(function(x){
              var tag = x['value'];
              var index = x['index'];
              return (
                <Tag key={index}
                     onClick={that.getClickHandler(tag,index)}
                     onRemove={that.getRemoveHandler(tag,index)}>
                  {tag.tag}
                </Tag>
              );
            })
            .filter((x) => x !== null)
        }
        {
          filteredData.length !== data.length && 
          <div>Showing {filteredData.length} of {data.length} tags.</div>
        }
      </div>
    );
  }
}
const TagList = connect(
  function(state, ownProps) {
    var tagIds = ownProps.tagIds || state.data.tagIds;
    return {
      data: tagIds.map((id) => state.data.tagsById[id] || null)
    }
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchTags()),
    };
  }
)(ConnectedTagList);

