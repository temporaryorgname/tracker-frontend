import React, { Component } from 'react';
import './Home.scss';
import { BigButton } from './Common.js';

import { connect } from "react-redux";
import { 
  foodSummaryActions,
  bodyweightSummaryActions
} from './actions/Actions.js';
import {
  formatDate,
  clipFloat
} from './Utils.js';

class OverviewPage extends Component {
  constructor(props) {
    super(props);
    this.props.fetchFoodData();
    this.props.fetchBodyData(this.props.uid);
  }
  render() {
    let content = null;
    let caloriesChangeMessage = null;
    if (this.props.caloriesChange) {
      caloriesChangeMessage = (<>
        Your Calorie consumption has been {this.props.caloriesChange > 0 ? 'increasing' : 'decreasing'} at a rate of <span>{this.props.caloriesChange.toFixed(1)} Calories/day</span>.
      </>);
    }
    let bodyweightChangeMessage = null;
    if (this.props.targetWeight && 
        this.props.avgWeight &&
        this.props.weightGoal &&
        this.props.bodyweightChange) {
      // Rate of change
      bodyweightChangeMessage = (<>
        {bodyweightChangeMessage}
        Over the past week, your body weight has been {this.props.bodyweightChange > 0 ? "increasing" : "decreasing"} at a rate of <span>{this.props.bodyweightChange.toFixed(1)}{this.props.units}/day</span>. </>);
      // Time to reach goal
      let daysLeft = (this.props.targetWeight-this.props.avgWeight)/this.props.bodyweightChange;
      if (daysLeft > 0) {
        bodyweightChangeMessage = (<>
          {bodyweightChangeMessage}
          At this rate, it will take about <span>{daysLeft.toFixed(0)} days</span> to reach your goal of <span>{this.props.targetWeight.toFixed(1)}{this.props.units}</span>.
        </>);
      } else {
        bodyweightChangeMessage = (<>
          {bodyweightChangeMessage}
          Your bodyweight is moving in the wrong direction. :( </>);
      }
    }
    if (!this.props.targetCalories && !this.props.avgCalories) {
      content = (
        <div className='empty-view'>
          Get started by updating your profile and recording what you ate today!
          <div>
            <BigButton linkTo={"/user?uid="+this.props.uid}
                icon='account_circle' text='Profile' />
            <BigButton linkTo={"/food/table?uid="+this.props.uid}
                icon='fastfood' text='Diet' />
            <BigButton linkTo={"/body?uid="+this.props.uid}
                icon='trending_down' text='Weight' />
          </div>
          Your progress report will appear here once you have entered some data.
        </div>
      );
    } else if (this.props.targetCalories && !this.props.avgCalories) {
      content = (
        <div className='empty-view'>
          You do not currently have anything recorded for the week.
          Go to your diet page and record what you ate today!
          <div>
            <BigButton linkTo={"/food/table?uid="+this.props.uid}
                icon='fastfood' text='Diet' />
          </div>
          Your progress report will appear here once you have entered some data.
        </div>
      );
    } else if (!this.props.targetCalories && this.props.avgCalories) {
      content = (
        <div className='empty-view'>
          You haven't specified your goals.
          Update your profile to see your progress relative to your goals.
          <div>
            <BigButton linkTo={"/user?uid="+this.props.uid}
                icon='account_circle' text='Profile' />
          </div>
        </div>
      );
    } else {
      content = (
        <>
          <ProgressBar percentage={this.props.todayCalories/this.props.targetCalories}
            centerText={'Today'}
            leftText={clipFloat(this.props.todayCalories,0)+' Calories consumed'}
            rightText={clipFloat(this.props.caloriesLeft,0)+' Calories left'} />
          <ProgressBar percentage={this.props.avgCalories/this.props.targetCalories}
            centerText={'Weekly Average'}
            leftText={clipFloat(this.props.avgCalories,0)+' Calories consumed'}
            rightText={clipFloat(this.props.targetCalories-this.props.avgCalories,0)+' Calories left'} />
          <div>
            {bodyweightChangeMessage} {caloriesChangeMessage}
          </div>
        </>
      );
    }
    return (
      <main className='overview-page-container'>
        <div className='card col-12'>
          <h2>Hello {this.props.name}</h2>
          <div className='progress-report'>
            <h3>Progress Report</h3>
            { content }
          </div>
        </div>
      </main>
    );
  }
}
export const ConnectedOverviewPage = connect(
  function(state, ownProps) {
    let uid = state.session.uid;

    // User profile
    let user = state.userProfiles.entities[uid] || {};
    let targetCalories = user.target_calories;
    let targetWeight = user.target_weight;
    let weightGoal = user.weight_goal;

    // Compute the amount consumed over the past week
    let total = 0;
    let count = 0;
    let history = state.foodSummary.history;
    if (!history) {
      return {uid};
    }
    let today = new Date(formatDate(new Date()));
    history.forEach(function(x){
      // Ignore food consumption from today, so it doesn't artificially lower the average
      if (new Date(x.date) < today && x.calories) {
        total += x.calories;
        count += 1;
      }
    })
    let avgCalories = count > 0 ? Math.floor(total/count) : 0;

    // Compute the amount consumed today
    let todayCalories = null;
    if (history.length > 0) {
      todayCalories = history[0].calories || 0;
    }
    let caloriesLeft = targetCalories-todayCalories;

    // Return values
    return {
      uid: uid,
      units: state.bodyweightSummary.units,

      name: user.display_name,
      targetCalories: targetCalories,
      todayCalories: todayCalories,
      avgCalories: avgCalories,
      caloriesLeft: caloriesLeft,
      targetWeight: targetWeight,
      weightGoal: weightGoal,
      caloriesChange: state.foodSummary.calorie_change_per_day,
      avgWeight: state.bodyweightSummary.avg_weight,
      bodyweightChange: state.bodyweightSummary.weight_change_per_day
    };
  },
  function(dispatch, ownProps) {
    return {
      fetchFoodData: () => dispatch(foodSummaryActions['fetchMultiple']({},false)),
      fetchBodyData: (id) => dispatch(bodyweightSummaryActions['fetchMultiple'](id)),
    };
  }
)(OverviewPage);

class ResponsiveSVG extends Component {
  constructor(props) {
    super(props)
    this.state = {
      width: null,
    }
    this.handleResize = this.handleResize.bind(this)
  }
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevState.width !== this.state.width) {
      if (this.props.onResize) {
        this.props.onResize(this.state.width);
      }
    }
  }
  componentDidMount() {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }
  handleResize() {
    let width = this.state.width;
    let newWidth = this.svgContainer.getBoundingClientRect().width;
    if (width !== newWidth) {
      this.setState({
        width: newWidth,
      });
    }
  }
  render() {
    let children = this.props.children;
    if (this.state.width === null) {
      children = null;
    }
    return (
      <div
        ref={(el) => { this.svgContainer = el }}
        className="responsive-svg-wrapper">
        {children}
      </div>
    )
  }
}

class ProgressBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: null
    };
    this.handleResize = this.handleResize.bind(this);
  }
  handleResize(width) {
    this.setState({
      width: width
    });
  }
  render() {
    let percentage = this.props.percentage;
    let centerText = this.props.centerText;
    let leftText = this.props.leftText;
    let rightText = this.props.rightText;
    let width = this.state.width-10;
    let height = 25;
    if (percentage >= 0 && percentage <= 1) {
      let progressWidth = percentage*width;
      return (
        <div className='progress-bar'>
          <ResponsiveSVG onResize={this.handleResize}>
          <svg width={width+2} height={height+2}>
            <rect className='total' x="1" y="1" rx="3" ry="3" width={width} height={height} />
            <rect className='progress' x="1" y="1" rx="3" ry="3" width={progressWidth} height={height} />
            <text textAnchor='middle' x={width/2} y={height-6} >{centerText}</text>
            <text className='left' textAnchor='start' x={6} y={height-6} >{leftText}</text>
            <text className='right' textAnchor='end' x={width-6} y={height-6} >{rightText}</text>
          </svg>
          </ResponsiveSVG>
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
            <text className='left' textAnchor='start' x={6} y={height-6} >{leftText}</text>
            <text className='right' textAnchor='end' x={width-6} y={height-6} >{rightText}</text>
          </svg>
        </div>
      );
    } else {
      return null;
    }
  }
}
