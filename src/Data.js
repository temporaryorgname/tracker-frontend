import React, { Component } from 'react';

import axios from 'axios';

import { connect } from "react-redux";

import './Data.scss';
import { FoodPhotoThumbnail, AutocompleteInput } from './Common.js';
import { parseQueryString } from './Utils.js';
import { 
  fetchPhotoIds,
  fetchTags,
  createTag,
  createLabel
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
    var queryParams = parseQueryString(this.props.location.search);
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
      selectedPhotoId: null,
      tags: [],
      box: null,
      draggingBox: null, 
      polygon: [],
      mode: 'box'
    };
    props.updateData(props.uid);
    this.handleTagChange = this.handleTagChange.bind(this);
    this.handlePhotoClick = this.handlePhotoClick.bind(this);
    this.handlePhotoDragging = this.handlePhotoDragging.bind(this);
    this.handlePhotoDragged = this.handlePhotoDragged.bind(this);
    this.createLabel = this.createLabel.bind(this);
  }
  handleChangePhoto(photoId) {
    if (photoId === this.state.selectedPhotoId) {
      return;
    }
    this.setState({
      selectedPhotoId: photoId,
      tags: [],
      box: null,
      draggingBox: null,
      polygon: []
    });
  }
  handleTagChange(tags) {
    console.log('tag change');
    console.log(tags);
    this.setState({
      tags: tags
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
  createLabel() {
    var label = {}
    if (this.state.selectedPhotoId === null) {
      console.error('No photo selected');
      return;
    } else {
      label['photo_id'] = this.state.selectedPhotoId;
    }
    if (this.state.tags.length < 1) {
      console.error('No tag selected');
      return;
    } else {
      label['tag_id'] = this.state.tags[0];
    }
    if (this.state.box !== null) {
      label['bounding_box'] = JSON.stringify(this.state.box)
        .split('[').join('(')
        .split(']').join(')');
    }
    if (this.state.polygon.length > 0) {
      label['bounding_polygon'] = JSON.stringify(this.state.polygon)
        .split('[').join('(')
        .split(']').join(')');
    }
    console.log('creating label');
    console.log(label);
    this.props.createLabel(label);
  }
  render() {
    var that = this;
    return (
      <div>
        <h2>Data</h2>
        <div>
        {
          this.props.ids &&
          this.props.ids.map(function(photoId){
            return (
              <div className='photo-viewer-thumbnail'
                  key={photoId}
                  onClick={()=>that.handleChangePhoto(photoId)}>
                <FoodPhotoThumbnail fileid={photoId} /> </div>
            );
          })
        }
        </div>
        {
          this.state.selectedPhotoId &&
          <div className='food-photo-container'>
            <LabelledFoodPhoto 
                fileid={this.state.selectedPhotoId} 
                boxes={[this.state.box, this.state.draggingBox].filter((x)=>x)} 
                polygons={[this.state.polygon]}
                onClick={this.handlePhotoClick}
                onDragging={this.handlePhotoDragging}
                onDragged={this.handlePhotoDragged}/>
          </div>
        }
        <div className='labeller-controls-container'>
          <h3>Photo Labels</h3>
          <label>
            Add label:
            <TagSelector 
              value={this.state.tags}
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
          </div>
          <input type='button' value='Create Label' onClick={this.createLabel} />
          <TagList tagIds={this.state.tagIds}/>
        </div>
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
      updateData: (id) => dispatch(fetchPhotoIds(id)),
      createLabel: (label) => dispatch(createLabel(label))
    };
  }
)(ConnectedPhotoViewer);

class LabelledFoodPhoto extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: "",
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
    var that = this;
    this.setState({ data: '' });
    axios.get(
      process.env.REACT_APP_SERVER_ADDRESS+"/data/food/photo/"+this.props.fileid+'?size=700',
      {withCredentials: true}
    ).then(function(response){
      that.setState({data: response.data.data});
    });
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
    if (!this.state.data) {
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
          <img src={"data:image/png;base64,"+this.state.data}
              onLoad={this.handleImageLoad}
              ref={(x) => this.img = x}/>
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

class TagSelector extends Component { 
  constructor(props) {
    super(props);
    this.state = {
      tagIds: [], // Use arrays instead of sets to preserve order
      userInput: ''
    }
    this.tagsById = {}
    this.handleSelect = this.handleSelect.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
  }
  handleSelect(selection) {
    // Can't add the same tag twice
    if (this.state.tagIds.find((x) => x === selection.id)) {
      console.error('Already selected');
      return;
    }

    var newTagIds = this.state.tagIds.concat([selection.id]);
    this.setState({
      tagIds: newTagIds,
      userInput: ''
    });
    this.tagsById[selection.id] = selection.tag;

    if (this.props.onChange) {
      this.props.onChange(newTagIds);
    }
  }
  handleRemove(selectedId) {
    this.setState({
      tagIds: this.state.tagIds.filter(x => x !== selectedId)
    });
  }
  render() {
    var that = this;
    return (
      <div className='tag-selector'>
        {
          this.state.tagIds.map(function(id,index){
            return (
              <Tag key={id} onRemove={()=>{that.handleRemove(id)}}>
                {that.tagsById[id]}
              </Tag>
            );
          })
        }
        {
         (!this.props.limit || this.state.tagIds.length < this.props.limit) &&
          <TagInput 
            value={this.state.userInput}
            onChange={(e)=>{this.setState({userInput: e.target.value})}}
            onSelect={this.handleSelect} />
        }
      </div>
    );
  }
}

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
      parent_id: this.state.parent.length == 1 ? this.state.parent[0] : null,
      description: ''
    }
    this.props.createTag(
      newTag
    ).then(function(response){
      console.log('Tag created');
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
          <TagSelector limit={1} />
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

class TagInput extends AutocompleteInput {
  constructor(props) {
    super(props);
    this.ref = React.createRef();
    this.loadSuggestions = this.loadSuggestions.bind(this);
    this.renderSuggestions = this.renderSuggestions.bind(this);
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
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/tags/search?q="+encodeURI(this.props.value), {withCredentials: true})
        .then(function(response){
          console.log('Search results:');
          console.log(response.data);
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

class ConnectedTagList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      selected: null
    };
    this.getClickHandler = this.getClickHandler.bind(this);
    this.props.updateData();
  }
  getClickHandler(tag) {
    var that = this;
    return function() {
      if (that.props.onSelect) {
        that.props.onSelect(tag)
      }
    }
  }
  render() {
    var that = this;
    return (
      <div>
        <label>
          Filter:
          <input type='text' value={this.state.filter} />
        </label>
        {
          this.props.data
            .filter((t) => t !== null)
            .map(function(tag, index){
              return (
                <Tag key={tag.id} onClick={that.getClickHandler(tag)}>
                  {tag.tag}
                </Tag>
              );
            })
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

class TagEditor extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <div></div>;
  }
}
