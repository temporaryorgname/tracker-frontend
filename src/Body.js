import React, { Component } from 'react';
import { Link } from "react-router-dom";
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, FormText, Alert, Table, FormFeedback } from 'reactstrap';
import { Resizable, Charts, ChartContainer, ChartRow, YAxis, LineChart } from "react-timeseries-charts";
import { TimeSeries, TimeRange } from "pondjs";
import axios from 'axios';

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

class BodyWeightTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };
    this.updateData = this.updateData.bind(this);

    this.updateData();
  }
  updateData() {
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight", {withCredentials: true})
        .then(function(response){
          that.setState({
            data: response.data
          });
        });
  }
  getDeleteHandler(id) {
    var that = this;
    return function() {
      if (window.confirm('Delete entry?')) {
        console.log('Deleting stat with ID '+id);
        axios.delete(process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight/"+id, {withCredentials: true})
          .then(function(response){
            that.updateData();
          });
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
            {this.state.data.map(function(data, index){
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

class NewBodyWeightEntryForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bodyweight: ''
    };
    this.addWeight = this.addWeight.bind(this);
    this.handleFormChange = this.handleFormChange.bind(this);
  }
  addWeight(event) {
    event.preventDefault();
    var now = new Date();
    var nowString = now.getFullYear()+"-"+(now.getMonth()+1)+"-"+now.getDate(); // Need to rebuild it to get rid of time zone funniness
    var payload = {
      date: nowString,
      time: now.toLocaleTimeString(),
      bodyweight: this.state.bodyweight
    }
    var that = this;
    axios.post(process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight", payload, {withCredentials: true})
        .then(function(response){
          console.log(response);
          that.setState({
            bodyweight: '',
            successMessage: 'Added successfully!',
            errorMessage: null
          });
          if (that.props.onAddWeight) {
            that.props.onAddWeight();
          }
        })
        .catch(function(error){
          console.log(error);
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

class BodyWeightTimeSeries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: []
    };
    this.getTimeSeries = this.getTimeSeries.bind(this);
    this.updateData = this.updateData.bind(this); //TODO: This is copied from BodyWeightTable. Move this somewhere else so there's no repeated code or repeat requests.
    this.updateData();
  }
  updateData() {
    var that = this;
    axios.get(process.env.REACT_APP_SERVER_ADDRESS+"/data/body/weight", {withCredentials: true})
        .then(function(response){
          window.result = response;
          that.setState({
            data: response.data
          });
        });
  }
  getTimeSeries() {
    if (this.state.data.length == 0) {
      return null;
    }
    var data = {
      name: 'Body Weight',
      columns: ['time', 'value'],
      points: this.state.data.map(function(datum){
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
          <YAxis id="axis1" label="weight" min={series.min()} max={series.max()} width="60" type="linear" />
          <Charts>
            <LineChart axis="axis1" series={series} />
          </Charts>
        </ChartRow>
      </ChartContainer>
      </Resizable>
    );
  }
}
