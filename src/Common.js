import React, { Component } from 'react';
import axios from 'axios';
import { connect } from "react-redux";
import { 
  fetchPhotos,
  fetchPhotoData
} from './actions/Data.js';
import './Common.scss';

class Modal extends Component {
  constructor(props) {
    super(props);
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }
  handleClickOutside(event) {
    if (event.target !== this.ref) {
      return;
    }
    this.props.toggle();
  }
  render() {
    var className = 'modal-background';
    if (this.props.isOpen) {
      className += ' visible';
    }
    return (
      <div className={className} onClick={this.handleClickOutside} ref={(x)=>(this.ref=x)}>
        <div className='modal'>
          <div className='close' onClick={this.props.toggle}><i className='material-icons'>close</i></div>
          {this.props.children}
        </div>
      </div>
    );
  }
}
class ModalHeader extends Component {
  render() {
    return (
      <div className='modal-header'>
        {this.props.children}
      </div>
    );
  }
}
class ModalBody extends Component {
  render() {
    return (
      <div className='modal-body'>
        {this.props.children}
      </div>
    );
  }
}
class ModalFooter extends Component {
  render() {
    return (
      <div className='modal-footer'>
        {this.props.children}
      </div>
    );
  }
}

class ConnectedFoodPhotoThumbnail extends Component {
  constructor(props) {
    super(props);
    if (!this.props.data) {
      this.props.updateData(this.props.fileid);
    }
  }
  render() {
    var classNames = ['thumbnail'];
    if (this.props.selected) {
      classNames.push('selected');
    }
    classNames = classNames.join(' ');
    if (!this.props.data) {
      return (
        <div className={classNames}>
          <i className="material-icons">fastfood</i>
        </div>
      );
    } else {
      return (
        <div className={classNames}>
          <img src={this.props.data} alt='Thumbnail'/>
        </div>
      );
    }
  }
}
const FoodPhotoThumbnail = connect(
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
)(ConnectedFoodPhotoThumbnail);

class ConnectedThumbnailsList extends Component {
  constructor(props) {
    super(props);
    props.updateData(props.uid);
    this.handleChangePhoto = this.handleChangePhoto.bind(this);
  }
  handleChangePhoto(photoId) {
    if (photoId === this.props.selectedId) {
      return;
    }
    if (this.props.onChange) {
      this.props.onChange(photoId);
    }
  }
  render() {
    var that = this;
    return (
      <div className='thumbnails-list'>
      {
        this.props.ids &&
        this.props.ids.map(function(photoId){
          return (
            <div className='photo-viewer-thumbnail'
                key={photoId}
                onClick={()=>that.handleChangePhoto(photoId)}>
              <FoodPhotoThumbnail fileid={photoId} />
            </div>
          );
        })
      }
      </div>
    );
  }
}
const ThumbnailsList = connect(
  function(state, ownProps) {
    if (ownProps.ids) {
      return {};
    }
    if (ownProps.date) {
      return {
        ids: state.data.photoIdsByDate[ownProps.date]
      };
    }
    return {
      ids: state.data.photoIds
    };
  },
  function(dispatch, ownProps) {
    return {
      updateData: (id) => dispatch(fetchPhotos(id))
    };
  }
)(ConnectedThumbnailsList);

class AutocompleteInput extends Component {
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
    if (prevState.selected !== this.state.selected && this.props.onHighlight) {
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
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/food/search?q="+encodeURI(this.props.value), {withCredentials: true})
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
    var suggestions = this.renderSuggestions();
    var loadingSuggestions = (
      <table>
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
      <div className='autocomplete-input'>
        {inputField}
        {s}
      </div>
    );
  }
}

export { Modal, ModalHeader, ModalBody, ModalFooter, FoodPhotoThumbnail, ThumbnailsList, AutocompleteInput };

