import React, {
  Component, useState, useEffect, useCallback, useRef
} from 'react';
import { Link } from "react-router-dom";
import axios from 'axios';
import { connect, useSelector } from "react-redux";
import { 
  photoActions
} from './actions/Actions.js';
import './Common.scss';

class Checkbox extends Component {
  render() {
    return (
      <div className='checkbox'>
        <label>
          <i className='material-icons action'>
            {this.props.checked ? 'check_box' : 'check_box_outline_blank'}
          </i>
          <input type='checkbox' {...this.props} />
        </label>
      </div>
    );
  }
}

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
    let {
      isOpen = true,
      toggle = () => console.error('toggle function not provided.'),
      children = null
    } = this.props;
    var className = 'modal-background';
    if (isOpen) {
      className += ' visible';
    }
    return (
      <div className={className} onClick={this.handleClickOutside} ref={(x)=>(this.ref=x)}>
        <div className='modal'>
          <div className='close' onClick={()=>toggle(false)}><i className='material-icons action'>close</i></div>
          {children}
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

function FoodPhotoThumbnail(props) {
  const {
    selected,
    photoId,
    onClick = ()=> {},
    onDoubleClick = () => console.log('double!')
  } = props;
  const photo = useSelector(
    state => { return state.photos.entities[photoId] || {} }
  );
  let data = process.env.REACT_APP_SERVER_ADDRESS+photo.file_url;

  // Set the appropriate class names if the thumbnail is selected
  var classNames = ['thumbnail'];
  if (selected) {
    classNames.push('selected');
  }
  classNames = classNames.join(' ');
  // Show image if it's loaded. If not, show a placeholder icon
  var image = data 
    ? <img src={data} alt='Thumbnail'/> 
    : <i className="material-icons">fastfood</i>;

  return (
    <div className={classNames}
        onClick={onClick}
        onDoubleClick={onDoubleClick}>
      {image}
    </div>
  );
}

class ConnectedThumbnailsList extends Component {
  constructor(props) {
    super(props);
    props.fetchData(props.uid);
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
              <FoodPhotoThumbnail photoId={photoId} />
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
        ids: state.photos.by.date[ownProps.date]
      };
    }
    return {
      ids: Object.keys(state.photos.entities)
    };
  },
  function(dispatch, ownProps) {
    return {
      fetchData: (id) => dispatch(photoActions['fetchSingle'](id))
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

function BigButton(props) {
  let {
    icon = null,
    text = '',
    onClick = ()=>null,
    linkTo = null
  } = props;
  if (linkTo === null) {
    return (
      <div className='large-button' onClick={onClick}>
        <i className='material-icons'>{icon}</i>
        {text}
      </div>
    );
  } else {
    return (
      <Link to={linkTo}>
        <div className='large-button' onClick={onClick}>
          <i className='material-icons'>{icon}</i>
          {text}
        </div>
      </Link>
    );
  }
}

function Button(props) {
  return (
    <div className='button' tabIndex={0} {...props}>
      {props.children}
    </div>
  );
}

function Accordion(props) {
  let [collapsed, setCollapsed] = useState(true);
  let toggle = () => setCollapsed(!collapsed);
  let {
    children = '',
    heading = ''
  } = props;
  return (<div className={'accordion ' + (collapsed ? 'collapsed':'expanded')}>
    <div className='heading' onClick={toggle}>
      <i className='material-icons'>arrow_right</i>
      {heading}
    </div>
    <div className='content'>
      {children}
    </div>
  </div>);
}

class DropdownMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      collapsed: true,
      value: null,
      hoverValue: null
    };
    [
      'toggle','collapse','selectOption','handleKeyDown'
    ].forEach(x=>this[x]=this[x].bind(this));
  }
  getNextValue(val) {
    let {
      options = []
    } = this.props;
    if (val === null) {
      if (options.length === 0) {
        return null;
      } else {
        return Object.keys(options)[0];
      }
    }
    let keys = Object.keys(options);
    let index = keys.indexOf(val);
    let newIndex = Math.min(index+1,keys.length-1);
    return keys[newIndex];
  }
  getPrevValue(val) {
    let {
      options = []
    } = this.props;
    if (val === null) {
      if (options.length === 0) {
        return null;
      } else {
        return Object.keys(options)[0];
      }
    }
    let keys = Object.keys(options);
    let index = keys.indexOf(val);
    let newIndex = Math.max(index-1,0);
    return keys[newIndex];
  }
  toggle() {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }
  collapse() {
    this.setState({
      collapsed: true
    });
  }
  selectOption(value) {
    if (this.props.onChange) {
      this.props.onChange(value);
    }
    this.setState({
      hoverValue: value,
      value: value
    });
    this.collapse();
  }
  handleKeyDown(e) {
    const kbEnter = 13;
    const kbUp = 38;
    const kbDown = 40;
    let {
      value = this.state.value,
      hoverValue = this.state.hoverValue,
      collapsed = this.state.collapsed
    } = this.props;
    // TODO: Make controllable
    if (collapsed) {
      if (e.keyCode === kbUp) {
        this.selectOption(this.getPrevValue(value));
        e.preventDefault();
      } else if (e.keyCode === kbDown) {
        this.selectOption(this.getNextValue(value));
        e.preventDefault();
      }
    } else {
      if (e.keyCode === kbUp) {
        this.setState({
          hoverValue: this.getPrevValue(hoverValue)
        });
        e.preventDefault();
      } else if (e.keyCode === kbDown) {
        this.setState({
          hoverValue: this.getNextValue(hoverValue)
        });
        e.preventDefault();
      } else if (e.keyCode === kbEnter) {
        this.selectOption(hoverValue);
        e.preventDefault();
      }
    }
  }
  render() {
    let {
      options = [],
      value = this.state.value,
      hoverValue = this.state.hoverValue,
      collapsed = this.state.collapsed
    } = this.props;
    let that = this;
    return (<div className={'dropdown ' + (collapsed ? 'collapsed':'expanded')}>
      <div className='heading' onClick={this.toggle} onKeyDown={this.handleKeyDown} tabindex='0'>
        {options[value]}
        <i className='material-icons'>
          {collapsed ? 'arrow_drop_down' : 'arrow_drop_up'}
        </i>
      </div>
      <div className='options'>
        {
          Object.entries(options).map(function([key,text]){
            let classNames = 'option'
            if (value === key) {
              classNames += ' selected';
            }
            if (hoverValue === key) {
              classNames += ' hover';
            }
            return (<div className={classNames}
                onClick={()=>that.selectOption(key)}
                key={key}>
              {text}
            </div>);
          })
        }
      </div>
    </div>);
  }
}

export function Breadcrumbs(props) {
  let {
    data = []
  } = props;
  return (<div className='breadcrumbs'>
    {
      data.map(crumb => {
        let {
          text,
          url
        } = crumb;
        return (
          <Link to={url} key={url}>{text}</Link>
        );
      }).reduce((output,elem,i) => {
        output.push(elem);
        output.push(<div className='separator' key={'separator'+i}></div>);
        return output;
      }, [])
    }
  </div>);
}

export function useDims() {
  let [dims, setDims] = useState([null,null]);
  let node = useRef(null);
  function updateDims() {
    if (!node.current) {
      return;
    }
    setDims([node.current.clientWidth, node.current.clientHeight]);
  }
  let ref = useCallback(n => {
    if (n === null) {
      return;
    }
    node.current = n;
  }, []);
  useEffect(() => {
    window.addEventListener('resize', updateDims);
    return () => {
      window.removeEventListener('resize', updateDims);
    };
  }, []);
  return [ref, node, dims];
}

export function useSVG(render, dependencies) {
  let node = useRef(null);
  let runRender = useCallback(() => {
    if (!node.current) {
      return;
    }
    render(node,[node.current.clientWidth, node.current.clientHeight]);
  }, [render]);
  useEffect(runRender,dependencies);
  let ref = useCallback(n => {
    node.current = n;
    runRender();
  },[runRender]);
  useEffect(() => {
    window.addEventListener('resize', runRender);
    return () => {
      window.removeEventListener('resize', runRender);
    };
  }, [runRender]);
  return ref;
}

export function Loading(props) {
  const {
    overlay = false
  } = props;
  return (<div className={'loading' + (overlay ? ' overlay' : '')}>
    <span>&middot;</span>
    <span>&middot;</span>
    <span>&middot;</span>
  </div>);
}

export function useClickOutsideHandler(ref, callback) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);
}

export { Checkbox, Modal, ModalHeader, ModalBody, ModalFooter, FoodPhotoThumbnail, ThumbnailsList, AutocompleteInput, BigButton, Button, Accordion, DropdownMenu };

