import React, { Component } from 'react';

import axios from 'axios';

import { connect } from "react-redux";

import './Data.scss';
import { FoodPhotoThumbnail } from './App.js';
import { parseQueryString } from './Utils.js';
import { fetchPhotoIds } from './actions/Data.js';

export class DataPage extends Component {
  render() {
    var queryParams = parseQueryString(this.props.location.search);
    return (
      <PhotoViewer uid={queryParams['uid']} />
    );
  }
}

class ConnectedPhotoViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhotoId: 10
    };
    props.updateData(props.uid);
  }
  render() {
    var that = this;
    return (
      <div>
        <h2>Data</h2>
        {
          this.props.ids &&
          this.props.ids.map(function(photoId){
            return (
              <div className='photo-viewer-thumbnail'
                  key={photoId}
                  onClick={()=>that.setState({selectedPhotoId: photoId})}>
                <FoodPhotoThumbnail fileid={photoId} />
              </div>
            );
          })
        }
        {
          this.state.selectedPhotoId &&
          <div><FoodPhoto fileid={this.state.selectedPhotoId} /></div>
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
      updateData: (id) => dispatch(fetchPhotoIds(id)),
    };
  }
)(ConnectedPhotoViewer);

class FoodPhoto extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: "",
      dragging: false,
      clicks: []
    }
    this.updateData = this.updateData.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
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
    console.log('New point');
    this.setState({
      clicks: this.state.clicks.concat(
        [[event.nativeEvent.offsetX, event.nativeEvent.offsetY]])
    });
  }
  handleDragStart(event) {
    event.preventDefault();
    this.setState({
      dragging: true,
      clicks: this.state.clicks.concat(
        [[event.nativeEvent.offsetX, event.nativeEvent.offsetY]])
    });
  }
  handleMouseMove(event) {
    if (this.state.dragging) {
      event.preventDefault();
      var clicks = this.state.clicks.slice(0); //Clone array
      clicks[clicks.length-1] = [event.nativeEvent.offsetX, event.nativeEvent.offsetY];
      this.setState({
        dragging: true,
        clicks: clicks
      });
    }
  }
  handleDragEnd(event) {
    event.preventDefault();
    this.setState({dragging: false});
    console.log('New point');
  }
  render() {
    if (!this.state.data) {
      return (<i className="material-icons">fastfood</i>);
    } else {
      return (
        <svg width='700' height='700' 
            onClick={this.handleClick} 
            onDragStart={this.handleDragStart}
            onMouseMove={this.handleMouseMove}
            onMouseUp={this.handleDragEnd}
            ref={x=>{this.ref=x}}
            draggable='false'>
          <image xlinkHref={"data:image/png;base64,"+this.state.data}
              alt='Thumbnail'
              width='700'
              height='700' />
          {
            this.state.clicks.map(function(coords,index){
              return <circle cx={coords[0]} cy={coords[1]} r='3' fill='red' key={index} />
            })
          }
        </svg>
      );
    }
  }
}
