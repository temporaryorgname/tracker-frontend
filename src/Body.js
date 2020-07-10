import React, { Component, useState, useEffect } from 'react';

import { select, mouse } from "d3-selection";
import { line, area, curveBasis } from "d3-shape";
import { scaleTime, scaleLinear, scalePoint } from "d3-scale";
import { extent } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { } from "d3-transition"; // Needed for selection.transition

import { useSelector, useDispatch } from "react-redux";
import {
  bodyweightActions,
  bodyweightSummaryActions
} from './actions/Actions.js';
import {
  formatDate,
  parseQueryString,
  getLoadingStatus,
  clipFloat,
} from './Utils.js';
import {
  useSVG,
  Loading
} from './Common.js';

import './Body.scss';

export class BodyStatsPage extends Component {
  constructor(props) {
    super(props);

    // If no date is provided, then set it to the current date
    var queryParams = parseQueryString(this.props.location.search);
    if (!queryParams['uid']) {
      queryParams['uid'] = this.props.uid;
    }
    this.state = {
      uid: queryParams['uid']
    };
  }
  render() {
    return (
      <main className='body-page-container'>
        <div className='main-card col-12'>
          <div className='card'>
          <NewBodyWeightEntryForm onAddWeight={this.updateData} uid={this.state.uid}/>
          </div>
        </div>
        <div className='body-weight-table card col-lg-8 col-sm-12 row-3'>
          <h3>Log</h3>
          <BodyWeightTable uid={this.state.uid}/>
        </div>
        <StatsCards />
        <div className='card col-12'>
          <h3>Body Weight History</h3>
          <BodyWeightTimeSeries uid={this.state.uid} />
        </div>
        <div className='card col-12'>
          <h3>Daily Body Weight Fluctuations</h3>
          <BodyWeightHourlyStats uid={this.state.uid} />
        </div>
      </main>
    );
  }
}

function BodyWeightTable(props) {
  const loadingStatus = useSelector(state => getLoadingStatus(
      state.loadingStatus['BODYWEIGHT'], {page: 0}));
  const data = useSelector(state => 
    Object.values(
      state.bodyweight.entities
    ).filter(
      x => x
    ).sort((entry1, entry2) => {
      if (entry1.date < entry2.date) {
        return 1;
      }
      if (entry1.date === entry2.date) {
        if (entry1.time < entry2.time) {
          return 1;
        }
      }
      return -1;
    })
  );
  const user = useSelector(state => 
      state.userProfiles.entities[props.uid] || {});

  const dispatch = useDispatch();
  const updateData = (page=0) => dispatch(
      bodyweightActions['fetchMultiple']({page}));
  const deleteEntry = (id) => dispatch(
      bodyweightActions['deleteSingle'](id));
  const deleteEntries = (ids) => dispatch(
      bodyweightActions['deleteMultiple'](ids));

  useEffect(() => {
    updateData();
  }, []);

  // Callbacks
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  function toggleSelection(id) {
    let x = new Set(selectedEntries);
    if (x.has(id)) {
      x.delete(id);
    } else {
      x.add(id);
    }
    setSelectedEntries(x);
  }
  function clearSelection() {
    setSelectedEntries(new Set());
  }
  function deleteSelection() {
    for (let id of Array.from(selectedEntries)) {
      deleteEntry(id).then(() => {
        let x = new Set(selectedEntries);
        x.delete(id);
        setSelectedEntries(x);
      });
    }
  }

  let status = null;
  if (loadingStatus) {
    switch (loadingStatus.status) {
      case 'loading':
        status = (
          <tr className='status'>
            <td colSpan='999'><Loading /></td>
          </tr>
        );
        break;
      case 'loaded':
        if (data.length === 0) {
          status = (
            <tr className='status'>
              <td colSpan='999'>
                <div>
                  You have no body weights on record.
                </div>
              </td>
            </tr>
          );
        }
        break;
      case 'error':
        status = (
          <tr className='status'>
            <td colSpan='999'>
              <div className='error-message'>
                Error: {this.props.loadingStatus.error}
              </div>
            </td>
          </tr>
        );
        break;
      default:
        status = null;
        break;
    }
  }
  return (
    <div className='bodyweight-table-container'>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {data.filter(x => x).map(function(data, index){
            if (index >= 5) {
              return null;
            }
            let isSelected = selectedEntries.has(data.id);
            return (<tr key={data.id} 
                  className={isSelected ? 'selected' : ''}
                  onClick={() => toggleSelection(data.id)}>
              <td>{data.date}</td>
              <td>{data.time}</td>
              <td>{data.bodyweight.toFixed(1)} {user.prefered_units}</td>
            </tr>);
          })}
          { status }
        </tbody>
      </table>
      <button onClick={clearSelection}>Clear</button>
      <button onClick={deleteSelection}>Delete</button>
    </div>
  );
}

function NewBodyWeightEntryForm(props) {
  const [bodyweight, setBodyweight] = useState('');
  const [statusMessage, setStatusMessage] = useState({
    success: null, error: null
  });
  const dispatch = useDispatch();
  const createWeight = weight => dispatch(bodyweightActions['create'](weight));
  const preferedUnits = useSelector(state => {
    let profile = state.userProfiles.entities[props.uid] || {};
    return profile.prefered_units;
  });

  // Callbacks
  function addWeight(event) {
    event.preventDefault();

    var now = new Date();
    var nowString = formatDate(now);
    var timeString = now.getHours()+":"+(now.getMinutes())+":"+now.getSeconds();
    var payload = {
      date: nowString,
      time: timeString,
      bodyweight: parseFloat(bodyweight)
    }
    createWeight(
      payload
    ).then(response => {
      setBodyweight('');
      setStatusMessage({
        success: 'Added successfully!',
        error: null
      });
    }).catch(error => {
      console.error(error);
      setStatusMessage({
        success: null,
        error: 'Failed to add new entry'
      });
    });
  }
  function handleFormChange(e) {
    setBodyweight(e.target.value);
    setStatusMessage({
      success: null,
      error: null
    });
  }

  var classNames = [];
  if (statusMessage.success) {
    classNames.push('valid');
  } else if (statusMessage.error) {
    classNames.push('invalid');
  }
  classNames = classNames.join(' ');
  return (
    <form action='#' onSubmit={addWeight}>
      <h2>Body Weight Log</h2>
      <span>Record your current body weight ({preferedUnits}):</span>
      <input type='text' name='bodyweight' className={classNames}
          placeholder='e.g. 182.6'
          value={bodyweight}
          onChange={handleFormChange} />
      <div className='success-message'>{statusMessage.success}</div>
      <div className='error-message'>{statusMessage.error}</div>
    </form>
  );
}

function StatsCards(props) {
  let {
    avg_weight,
    units,
    weight_change_per_day
  } = useSelector(state => 
    state.bodyweightSummary || {}
  );
  let weightChangeDom = '(Data unavailable)';
  if (weight_change_per_day) {
    weightChangeDom = clipFloat(weight_change_per_day,2)+' '+units+'/day';
    if (weight_change_per_day > 0) {
      weightChangeDom = '+'+weightChangeDom;
    }
  }
  return (<>
    <div className='card row-1 col-lg-4 col-sm-4'>
      <h3>Body Weight Average</h3>
      <span>{avg_weight && avg_weight.toFixed(1)} {units}</span>
    </div>
    <div className='card row-1 col-lg-4 col-sm-4'>
      <h3>BMI</h3>
      <span>(Data unavailable)</span>
    </div>
    <div className='card row-1 col-lg-4 col-sm-4'>
      <h3>Body Weight Change</h3>
      <span>
        {weightChangeDom}
      </span>
    </div>
  </>);
}

function BodyWeightTimeSeries(props) {
  let dispatch = useDispatch();
  let history = useSelector(state => 
    state.bodyweightSummary.history || {}
  );
  let loadingStatus = useSelector(state =>
    getLoadingStatus(state.loadingStatus['BODYWEIGHT_SUMMARY'], {}) || {}
  );
  let updateData = () => dispatch(bodyweightSummaryActions['fetchMultiple']());
  updateData();
  let ref = useSVG((svg,svgDims) => {
    // Check if data is loaded
    if (loadingStatus.status !== 'loaded') {
      return;
    }
    if (!svg.current) {
      return;
    }
    // Process data
    let startDate = new Date(history.start_date);
    let endDate = new Date(history.end_date);
    let diff = (endDate-startDate)/history.data.length;
    let data = history.data.map(function(datum, index){
      return {
        date: new Date(startDate.getTime()+diff*index),
        value: datum
      };
    }).filter((x) => x.value !== null);
    // Compute sizes and scales
    let [width,height] = svgDims;
    var vbWidth = svg.current.viewBox.baseVal.width;
    var vbHeight = svg.current.viewBox.baseVal.height;
    let scale = vbHeight/height;
    let fontSize = 12*scale;
    var paddingLeft = fontSize*5;
    var paddingBottom = fontSize*4;
    var xScale = scaleTime()
      .domain(extent(data, p => p.date))
      .range([paddingLeft,vbWidth]);
    var yScale = scaleLinear()
      .domain(extent(data, p => p.value))
      .range([vbHeight-paddingBottom,0]);
    var xAxis = axisBottom(xScale)
      .ticks(Math.log(width/5));
    var yAxis = axisLeft(yScale)
      .ticks(Math.log(height));
    var xGridlines = axisBottom(xScale)
      .tickSizeInner(-vbHeight,0)
      .tickFormat('')
      .ticks(Math.log(width/5));
    var yGridlines = axisLeft(yScale)
      .tickSizeInner(-vbWidth,0)
      .tickFormat('')
      .ticks(Math.log(height));
    var lineGenerator = line()
      .curve(curveBasis)
      .x(p => xScale(p.date))
      .y(p => yScale(p.value));
    // Curve
    select(svg.current)
      .select('.curves')
      .select('path')
      .attr('d',lineGenerator(data));
    // Draw gridlines
    select(svg.current)
      .select('g.x-gridlines')
      .attr('transform', 'translate(0,'+(vbHeight-paddingBottom)+')')
      .attr("font-size", fontSize)
      .call(xGridlines);
    select(svg.current)
      .select('g.y-gridlines')
      .attr('transform', 'translate('+(paddingLeft)+',0)')
      .attr("font-size", fontSize)
      .call(yGridlines);
    // Axis + ticks
    select(svg.current)
      .select('g.x-axis')
      .attr('transform', 'translate(0,'+(vbHeight-paddingBottom)+')')
      .attr("font-size", fontSize)
      .call(xAxis);
    select(svg.current)
      .select('g.y-axis')
      .attr('transform', 'translate('+(paddingLeft)+',0)')
      .attr("font-size", fontSize)
      .call(yAxis);
    // Axis labels
    select(svg.current)
      .select('text.x-axis')
      .style("text-anchor", "middle")
      .attr("font-size", fontSize)
      .attr('transform', 'translate('+(vbWidth/2)+','+(vbHeight-fontSize/2)+')')
      .text('Date');
    select(svg.current)
      .select('text.y-axis')
      .style("text-anchor", "middle")
      .attr("font-size", fontSize)
      .attr('transform', 'translate('+fontSize+','+((vbHeight-paddingBottom)/2)+') rotate(-90)')
      .text('Weight');
  }, [history.data, loadingStatus.status]);
  return (
    <div className='bodyweight-plot-container'>
      <svg ref={ref} width='100%' viewBox='0 0 800 300' preserveAspectRatio="xMidYMid slice">
        <g className='x-gridlines'></g>
        <g className='y-gridlines'></g>
        <g className='x-axis'></g>
        <g className='y-axis'></g>
        <text className='x-axis'></text>
        <text className='y-axis'></text>
        <svg viewBox='0 0 800 300'>
          <g className='curves'>
            <path d=""></path>
          </g>
        </svg>
      </svg>
      { loadingStatus.status === 'loading' && <Loading /> }
    </div>
  )
}

function BodyWeightHourlyStats(props) {
  let dispatch = useDispatch();
  let hourly_mean = useSelector(state => 
    state.bodyweightSummary.hourly_mean
  );
  let hourly_std = useSelector(state => 
    state.bodyweightSummary.hourly_std
  );
  let loadingStatus = useSelector(state =>
    getLoadingStatus(state.loadingStatus['BODYWEIGHT_SUMMARY'], {}) || {}
  );
  let updateData = () => dispatch(bodyweightSummaryActions['fetchMultiple']());
  updateData();
  let ref = useSVG((svg,svgDims) => {
    // Check if data is loaded
    if (loadingStatus.status !== 'loaded') {
      return;
    }
    if (!svg.current) {
      return;
    }
    
    const hours = [
      '12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM','11 PM'
    ];
    let mean_weight = hourly_mean.reduce((a,b) => a+b, 0)/24;
    let data = hourly_mean 
      .map(function(datum, index){
        return {
          time: hours[index],
          value: (datum-mean_weight)/mean_weight
        };
      });
    let maxChange = data.reduce((a,d)=>d.value > a ? d.value : a, 0);
    let normalizedStd = hourly_std.map((datum,index) => datum/mean_weight);
    let maxNormalizedStd = normalizedStd.reduce((a,b) => Math.abs(a) > Math.abs(b) ? a : b, 0);
    let stdData = normalizedStd
      .map(function(datum, index){
        let std = datum*(maxChange/maxNormalizedStd);
        return {
          time: hours[index],
          value0: data[index].value+std,
          value1: data[index].value-std
        };
      });

    let [width,height] = svgDims;
    var vbWidth = svg.current.viewBox.baseVal.width;
    var vbHeight = svg.current.viewBox.baseVal.height;
    let scale = vbHeight/height;
    let fontSize = 12*scale;
    var paddingLeft = fontSize*5;
    var paddingBottom = fontSize*4;
    // Scale
    var xScale = scalePoint()
      .padding(0.5)
      .domain(hours)
      .range([paddingLeft,vbWidth]);
    var yScale = scaleLinear()
      .domain(
        extent(
          extent(data, p => p.value).concat(
          extent(stdData, p => p.value0)).concat(
          extent(stdData, p => p.value1))
        )
      )
      .range([vbHeight-paddingBottom,0]);
    // Axis
    let numTicks = Math.floor(vbWidth/(fontSize*6));
    let visibleTicks = hours.filter((h,i) => i%Math.floor(hours.length/numTicks) === 0);
    var xAxis = axisBottom(xScale)
      .tickFormat(t => visibleTicks.includes(t) ? t : '');
    var yAxis = axisLeft(yScale)
      .tickFormat(t => (t > 0 ? '+' : '') + (t*100)+'%')
      .ticks(Math.log(height));
    var xGridlines = axisBottom(xScale)
      .tickSizeInner(-vbHeight,0)
      .tickFormat('');
    var yGridlines = axisLeft(yScale)
      .tickSizeInner(-vbWidth,0)
      .tickFormat('')
      .ticks(Math.log(height));
    var lineGenerator = line()
      .x(p => xScale(p.time))
      .y(p => yScale(p.value));
    let areaGenerator = area()
      .x(p => xScale(p.time))
      .y0(p => yScale(p.value0))
      .y1(p => yScale(p.value1));

    // Draw line
    select(svg.current)
      .select('.curves')
      .select('path')
      .attr('d',lineGenerator(data));
    select(svg.current)
      .select('.std')
      .select('path')
      .attr('d',areaGenerator(stdData));
    // Draw gridlines
    select(svg.current)
      .select('g.x-gridlines')
      .attr('transform', 'translate(0,'+(vbHeight-paddingBottom)+')')
      .attr("font-size", fontSize)
      .call(xGridlines);
    select(svg.current)
      .select('g.y-gridlines')
      .attr('transform', 'translate('+(paddingLeft)+',0)')
      .attr("font-size", fontSize)
      .call(yGridlines);
    // Draw axes
    select(svg.current)
      .select('g.x-axis')
      .attr('transform', 'translate(0,'+(vbHeight-paddingBottom)+')')
      .attr("font-size", fontSize)
      .call(xAxis);
    select(svg.current)
      .select('g.y-axis')
      .attr('transform', 'translate('+(paddingLeft)+',0)')
      .attr("font-size", fontSize)
      .call(yAxis);
    select(svg.current)
      .select('text.x-axis')
      .style("text-anchor", "middle")
      .attr('transform', 'translate('+(vbWidth/2)+','+(vbHeight-fontSize/2)+')')
      .attr("font-size", fontSize)
      .text('Time');
    select(svg.current)
      .select('text.y-axis')
      .style("text-anchor", "middle")
      .attr('transform', 'translate('+fontSize+','+((vbHeight-paddingBottom)/2)+') rotate(-90)')
      .attr("font-size", fontSize)
      .text('Weight');
    // Hover text
    let hoverPoint = select(svg.current)
      .select('g.hover')
      .append('circle')
        .style("fill", "none")
        .attr("stroke", "black")
        .attr('r', 8.5)
        .style("opacity", 0);
    let hoverTextBackground = select(svg.current)
      .select('g.hover')
      .append('rect')
        .style("fill", "white")
        .style("opacity", 0);
    let hoverText = select(svg.current)
      .select('g.hover')
      .append('text')
        .style("fill", "black")
        .style("opacity", 0);
		function mouseover() {
			hoverPoint.style("opacity", 1);
			hoverText.style("opacity", 1);
			hoverTextBackground.style("opacity", 0.7);
		}
		function mousemove() {
      let x = mouse(this)[0];
      let domain = xScale.domain();
      let range = xScale.range();
      let padding = xScale.padding();
      let index = Math.floor((x-range[0])/(range[1]-range[0])*domain.length);
      if (index >= domain.length) {
        index = domain.length-1;
      } else if (index < 0) {
        index = 0;
      }
			let datum = data[index];
      let std = normalizedStd[index];
      let text = null;
      if (std) {
        text = clipFloat(datum.value*100,2)+' ± '+clipFloat(std*100,2)+'%';
      } else {
        text = clipFloat(datum.value*100,2)+'%'
      }
			hoverPoint
				.attr("cx", xScale(datum.time))
				.attr("cy", yScale(datum.value));
			hoverText
        .html(text)
        .attr('text-anchor','start')
				.attr("x", xScale(datum.time)+10)
				.attr("y", yScale(datum.value)+10);
      let bbox = hoverText.node().getBBox();
      let bgPadding = 5;
			hoverTextBackground
        .attr("x", bbox.x - bgPadding)
        .attr("y", bbox.y - bgPadding)
        .attr("width", bbox.width + (bgPadding*2))
        .attr("height", bbox.height + (bgPadding*2))
    }
		function mouseout() {
			hoverPoint.style("opacity", 0);
			hoverText.style("opacity", 0);
			hoverTextBackground.style("opacity", 0);
		}
	  select(svg.current)
      .append('rect')
      .style("fill", "none")
      .style("pointer-events", "all")
      .attr('width', vbWidth)
      .attr('height', vbHeight)
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseout', mouseout);
  }, [hourly_mean, hourly_std, loadingStatus.status]);
  return (
    <div className='bodyweight-plot-container'>
      <svg ref={ref} viewBox='0 0 800 300' preserveAspectRatio="xMidYMid slice">
        <g className='x-gridlines'></g>
        <g className='y-gridlines'></g>
        <g className='x-axis'></g>
        <g className='y-axis'></g>
        <text className='x-axis'></text>
        <text className='y-axis'></text>
        <svg viewBox='0 0 800 300'>
          <g className='std'>
            <path d=""></path>
          </g>
          <g className='curves'>
            <path d=""></path>
          </g>
          <g className='hover'>
          </g>
        </svg>
      </svg>
      { loadingStatus.status === 'loading' && <Loading overlay={true}/> }
    </div>
  )
}
