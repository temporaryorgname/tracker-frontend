import React, { Component } from 'react';
import './Home.scss';

import { connect } from "react-redux";
import { 
  userProfileActions,
  foodSummaryActions
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
            Your goal is to consume <span>{this.props.goalCalories}</span> Calories per day, and your goal weight is <span>{this.props.goalWeight || 'x'}</span>.
          </div>
          <div>
          Average Calories consumed each day in the past week: <span>{this.props.avgCalories}</span> Cals/day.
          </div>
          <ProgressBar percentage={this.props.avgCalories/this.props.goalCalories}
            centerText={'Weekly Average'}
            leftText={this.props.avgCalories+' Calories consumed'}
            rightText={(this.props.goalCalories-this.props.avgCalories)+' Calories left'} />
          <div>
          Calories left for today: <span>{this.props.caloriesLeft || ''}</span> Cals.
          </div>
          <ProgressBar percentage={this.props.todayCalories/this.props.goalCalories}
            centerText={'Today'}
            leftText={this.props.todayCalories+' Calories consumed'}
            rightText={this.props.caloriesLeft+' Calories left'} />
        </div>
      </main>
    );
  }
}
export const HomePage = connect(
  function(state, ownProps) {
    let uid = state.session.uid;

    let total = 0;
    let count = 0;
    let history = state.foodSummary.history;
    if (history === null) {
      return {uid};
    }
    history.forEach(function(x){
      if (x.calories) {
        total += x.calories;
        count += 1;
      }
    })
    let user = state.userProfiles.entities[uid] || {};

    let goalCalories = user.target_calories;
    let avgCalories = count > 0 ? Math.floor(total/count) : 0;
    let todayCalories = history[0].calories || 0;
    let caloriesLeft = goalCalories-todayCalories;

    let goalWeight = user.target_weight;

    return {
      uid: uid,
      name: user.display_name,
      goalCalories: goalCalories,
      todayCalories: todayCalories,
      avgCalories: avgCalories,
      caloriesLeft: caloriesLeft,
      goalWeight: goalWeight,
    };
  },
  function(dispatch, ownProps) {
    return {
      fetchFoodData: () => dispatch(foodSummaryActions['fetchMultiple']()),
      fetchUserData: (id) => dispatch(userProfileActions['fetchSingle'](id)),
    };
  }
)(ConnectedHomePage);

class ProgressBar extends Component {
  render() {
    let percentage = this.props.percentage;
    let centerText = this.props.centerText;
    let leftText = this.props.leftText;
    let rightText = this.props.rightText;
    let width = 798;
    let height = 25;
    if (percentage >= 0 && percentage <= 1) {
      let progressWidth = percentage*width;
      return (
        <div className='progress-bar'>
          <svg width={width+2} height={height+2}>
            <rect className='total' x="1" y="1" rx="3" ry="3" width={width} height={height} />
            <rect className='progress' x="1" y="1" rx="3" ry="3" width={progressWidth} height={height} />
            <text textAnchor='middle' x={width/2} y={height-6} >{centerText}</text>
            <text textAnchor='start' x={6} y={height-6} >{leftText}</text>
            <text textAnchor='end' x={width-6} y={height-6} >{rightText}</text>
          </svg>
        </div>
      );
    } else if (percentage > 1) {
      let progressWidth = width/percentage;
      return (
        <div className='progress-bar'>
          <svg width={width+2} height={height+2}>
            <rect className='progress' x="1" y="1" rx="3" ry="3" width={width} height={height} />
            <rect className='progress' x="1" y="1" rx="3" ry="3" width={progressWidth} height={height} />
            <text textAnchor='middle' x={width/2} y={height-6} >{centerText}</text>
            <text textAnchor='start' x={6} y={height-6} >{leftText}</text>
            <text textAnchor='end' x={width-6} y={height-6} >{rightText}</text>
          </svg>
        </div>
      );
    } else {
      return null;
    }
  }
}
