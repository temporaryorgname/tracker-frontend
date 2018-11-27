import React, { Component } from 'react';
import { Link } from "react-router-dom";
import { Resizable, Charts, ChartContainer, ChartRow, YAxis, LineChart, ScatterChart } from "react-timeseries-charts";
import { TimeSeries } from "pondjs";

import { connect } from "react-redux";
import { fetchBodyweight, createBodyweight, deleteBodyweight } from './actions/Body.js'

import './Body.scss';

export class BodyStatsPage extends Component {
  render() {
    return (
      <div className='body-page-container'>
        <h2>Body Stats</h2>
        <BodyWeightTable />
        <BodyWeightTimeSeries />
        <BodyWeightScatterPlot />
      </div>
    );
  }
}

class ConnectedBodyWeightTable extends Component {
  constructor(props) {
    super(props);
    this.props.updateData();
  }
  getDeleteHandler(id) {
    var that = this;
    return function() {
      if (window.confirm('Delete entry?')) {
        that.props.deleteEntry(id);
      }
    }
  }
  render() {
    var that = this;
    return (
      <div className='bodyweight-table-container'>
        <NewBodyWeightEntryForm onAddWeight={this.updateData}/>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th className='hide-mobile'>Time</th>
              <th>Weight</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.props.data.map(function(data, index){
              return (<tr key={data.id}>
                <td>{data.date}</td>
                <td className='hide-mobile'>{data.time}</td>
                <td>{data.bodyweight}</td>
                <td>
                  <Link to='#' onClick={that.getDeleteHandler(data.id)}>
                    <i className='material-icons'>delete</i>
                  </Link>
                </td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
const BodyWeightTable = connect(
  function(state, ownProps) {
    return {data: state.bodyweight}
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchBodyweight()),
      deleteEntry: (id) => dispatch(deleteBodyweight(id))
    };
  }
)(ConnectedBodyWeightTable);

class ConnectedNewBodyWeightEntryForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bodyweight: '',
      successMessage: null,
      errorMessage: null
    };
    this.addWeight = this.addWeight.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }
  addWeight(event) {
    event.preventDefault();
    var that = this;
    this.props.onSubmit(this.state.bodyweight)
      .then(function(response){
        that.setState({
          bodyweight: '',
          successMessage: 'Added successfully!',
          errorMessage: null
        });
      })
      .catch(function(error){
        console.error(error);
        that.setState({
          successMessage: null,
          errorMessage: 'Failed to add new entry'
        })
      });
  }
  handleFormChange(e) {
    var x = {successMessage: null, errorMessage: null};
    x[e.target.name] = e.target.value;
    this.setState(x);
  }
  render() {
    var classNames = [];
    if (this.state.successMessage) {
      classNames.push('valid');
    } else if (this.state.errorMessage) {
      classNames.push('invalid');
    }
    classNames = classNames.join(' ');
    return (
      <form action='#' onSubmit={this.addWeight}>
        <label htmlFor='bodyweight'>Body Weight: </label>
        <input type='text' name='bodyweight' className={classNames} value={this.state.bodyweight} onChange={this.handleFormChange} />
        <div className='success-message'>{this.state.successMessage}</div>
        <div className='error-message'>{this.state.errorMessage}</div>
      </form>
    );
  }
}
const NewBodyWeightEntryForm = connect(
  function(state, ownProps) {
    return {data: state.bodyweight}
  },
  function(dispatch, ownProps) {
    return {
      onSubmit: weight => dispatch(createBodyweight(weight))
    };
  }
)(ConnectedNewBodyWeightEntryForm);

class ConnectedBodyWeightTimeSeries extends Component {
  constructor(props) {
    super(props);
    this.getTimeSeries = this.getTimeSeries.bind(this);
    if (this.props.data.length === 0) {
      this.props.updateData();
    }
  }
  getTimeSeries() {
    if (this.props.data.length === 0) {
      return null;
    }
    var data = {
      name: 'Body Weight',
      columns: ['time', 'value'],
      points: this.props.data.map(function(datum){
        if (datum.time) {
          return [new Date(datum.date+" "+datum.time), datum.bodyweight];
        }
        return [new Date(datum.date), datum.bodyweight];
      })
    };
    data.points.reverse();
    var series = new TimeSeries(data);
    return series;
  }
  render() {
    // Convert the data to numerical form
    var series = this.getTimeSeries();
    if (series == null) {
      return (
        <div>No data available yet.</div>
      );
    }
    return (
      <div className='bodyweight-plot-container hide-mobile'>
      <Resizable>
      <ChartContainer timeRange={series.timerange()}>
        <ChartRow height="200">
          <YAxis id="axis1" label="weight" min={series.min()} max={series.max()} width="60" type="linear" format='.1f'/>
          <Charts>
            <LineChart axis="axis1" series={series} />
          </Charts>
        </ChartRow>
      </ChartContainer>
      </Resizable>
      </div>
    );
  }
}
const BodyWeightTimeSeries = connect(
  function(state, ownProps) {
    return {data: state.bodyweight}
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchBodyweight())
    };
  }
)(ConnectedBodyWeightTimeSeries);

class ConnectedBodyWeightScatterPlot extends Component {
  constructor(props) {
    super(props);
    this.getTimeSeries = this.getTimeSeries.bind(this);
    //this.props.updateData();
  }
  getTimeSeries() {
    if (this.props.data.length === 0) {
      return null;
    }
    var data = {
      name: 'Body Weight',
      columns: ['time', 'value'],
      points: this.props.data
        .filter(datum => datum.time)
        .map(datum => [new Date('1900-01-01 '+datum.time), datum.bodyweight])
        .sort((a,b) => (a[0]-b[0]))
    };
    var series = new TimeSeries(data);
    return series;
  }
  render() {
    // Convert the data to numerical form
    var series = this.getTimeSeries();
    if (series == null) {
      return (
        <div>No data available yet.</div>
      );
    }
    return (
      <div className='bodyweight-plot-container hide-mobile'>
        <Resizable>
        <ChartContainer timeRange={series.timerange()}>
          <ChartRow height="200">
            <YAxis id="axis1" label="weight" min={series.min()} max={series.max()} width="60" type="linear" format='.1f'/>
            <Charts>
              <ScatterChart axis="axis1" series={series} />
            </Charts>
          </ChartRow>
        </ChartContainer>
        </Resizable>
      </div>
    );
  }
}
const BodyWeightScatterPlot = connect(
  function(state, ownProps) {
    return {data: state.bodyweight}
  },
  function(dispatch, ownProps) {
    return {
      updateData: () => dispatch(fetchBodyweight())
    };
  }
)(ConnectedBodyWeightScatterPlot);
