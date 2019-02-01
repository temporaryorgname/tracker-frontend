import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import axios from 'axios';
import './Home.scss';

import { connect } from "react-redux";
import { 
  userActions,
  foodActions,
  foodSummaryActions,
  bodyweightActions
} from './actions/Actions.js';

class ConnectedHomePage extends Component {
  constructor(props) {
    super(props);
    this.props.fetchFoodData();
    this.props.fetchUserData(this.props.uid);
  }
  render() {
    return (
      <main className='home-page-container'>
        <div className='background'>
        </div>
        <h2>Hello {this.props.name}</h2>
        <div>
          <h3>Progress Report</h3>
          <div>
            Here is a dummy progress report with some randomly generated numbers. Your goal is to consume <span>{this.props.goalCalories}</span> Calories per day, and your goal weight is <span>x</span>. Lorem ipsum dolor sit amet and stuff.
          </div>
          <div>
          Average Calories consumed each day in the past week: <span>{this.props.avgCalories}</span> Cals/day.
          </div>
          <div>
          Calories left for today: <span>{this.props.caloriesLeft}</span> Cals.
          </div>
          <div>
            Quick-add calories: <input type='text' />
          </div>
        </div>
      </main>
    );
  }
}
export const HomePage = connect(
  function(state, ownProps) {
    console.log(state.foodSummary.history);
    let total = 0;
    let count = 0;
    let history = state.foodSummary.history;
    if (history === null) {
      return {};
    }
    history.map(function(x){
      if (x.calories) {
        total += x.calories;
        count += 1;
      }
    })
    let uid = state.session.uid;
    let user = state.users.entities[uid] || {};

    let goalCalories = user.target_calories;
    let avgCalories = count > 0 ? Math.floor(total/count) : 0;
    let todayCalories = history[0].calories;
    let caloriesLeft = goalCalories-todayCalories;
    return {
      uid: uid,
      name: user.name,
      goalCalories: goalCalories,
      todayCalories: todayCalories,
      avgCalories: avgCalories,
      caloriesLeft: caloriesLeft
    }
  },
  function(dispatch, ownProps) {
    return {
      fetchFoodData: () => dispatch(foodSummaryActions['fetchMultiple']()),
      fetchUserData: (id) => dispatch(userActions['fetchSingle'](id)),
    };
  }
)(ConnectedHomePage);
