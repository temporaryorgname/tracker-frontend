import React, { Component } from 'react';
import { Link } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, FormText, Alert, Table, FormFeedback } from 'reactstrap';
import { Resizable, Charts, ChartContainer, ChartRow, YAxis, LineChart } from "react-timeseries-charts";
import { TimeSeries, TimeRange } from "pondjs";
import axios from 'axios';

import { connect } from "react-redux";
import { fetchBodyweight, createBodyweight, deleteBodyweight } from './actions/Body.js'

export class BodyStatsPage extends Component {
  render() {
    return (
      <div>
        <BodyWeightTimeSeries />
        <BodyWeightTable />
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
      <div>
        <NewBodyWeightEntryForm onAddWeight={this.updateData}/>
        <Table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Bodyweight</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {this.props.data.map(function(data, index){
              return (<tr key={data.id}>
                <td>{data.date}</td>
                <td>{data.time}</td>
                <td>{data.bodyweight}</td>
                <td>
                  <Link to='#' onClick={that.getDeleteHandler(data.id)}>
                    <i className='material-icons'>delete</i>
                  </Link>
                </td>
              </tr>);
            })}
          </tbody>
        </Table>
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
    return (
      <Form action='#' onSubmit={this.addWeight}>
        <FormGroup>
          <Label for='bodyweight'>Body Weight: </Label>
          <Input type='text' name='bodyweight' value={this.state.bodyweight} onChange={this.handleFormChange} valid={this.state.successMessage} invalid={this.state.errorMessage}/>
          <FormFeedback valid>{this.state.successMessage}</FormFeedback>
          <FormFeedback invalid='true'>{this.state.errorMessage}</FormFeedback>
        </FormGroup>
      </Form>
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

class BodyWeightTableRow extends Component {
  render() {
    return (
      <tr draggable='true'>
        <td>{this.props.date.toISOString().substr(0,10)}</td>
        <td></td>
        <td>{this.props.bodyweight}</td>
      </tr>
    );
  }
}

class ConnectedBodyWeightTimeSeries extends Component {
  constructor(props) {
    super(props);
    this.getTimeSeries = this.getTimeSeries.bind(this);
    this.props.updateData();
  }
  getTimeSeries() {
    if (this.props.data.length == 0) {
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
      <Resizable>
      <ChartContainer timeRange={series.timerange()} width={800}>
        <ChartRow height="200">
          <YAxis id="axis1" label="weight" min={series.min()} max={series.max()} width="60" type="linear" format='.1f'/>
          <Charts>
            <LineChart axis="axis1" series={series} />
          </Charts>
        </ChartRow>
      </ChartContainer>
      </Resizable>
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
