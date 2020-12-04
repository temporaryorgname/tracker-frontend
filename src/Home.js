import React, { Component, useState, useEffect, useRef } from 'react';
import './Home.scss';
import { BigButton } from './Common.js';

import { connect, useSelector, useDispatch } from "react-redux";
import { 
  foodSummaryActions,
  bodyweightSummaryActions
} from './actions/Actions.js';
import {
  formatDate,
  clipFloat
} from './Utils.js';

export function OverviewPage(props) {
  const dispatch = useDispatch();

  const uid = useSelector(state => state.session.uid);

  // User profile
  const user = useSelector(state => state.userProfiles.entities[uid] || {});
  const history = useSelector(state => state.foodSummary.history);
  const targetCalories = user.target_calories;
  const targetWeight = user.target_weight;
  const weightGoal= user.weight_goal;
  const name = user.display_name;

  // Others
  const units = useSelector(state => state.bodyweightSummary.units);
  const caloriesChange = useSelector(state => state.foodSummary.calorie_change_per_day);
  const avgWeight = useSelector(state => state.bodyweightSummary.avg_weight);
  const bodyweightChange = useSelector(state => state.bodyweightSummary.weight_change_per_da);
  const avgCalories = 1; // TODO

  let fetchFoodData = () => dispatch(
      foodSummaryActions['fetchMultiple']({},false));
  let fetchBodyData = (id) => dispatch(
      bodyweightSummaryActions['fetchMultiple'](id));

  useEffect(() => {
    fetchFoodData();
    fetchBodyData(uid);
  }, [uid]);

  let content = null;
  let bodyweightChangeMessage = null;
  if (targetWeight && avgWeight && weightGoal && bodyweightChange) {
    // Rate of change
    bodyweightChangeMessage = (<>
      {bodyweightChangeMessage}
      Over the past week, your body weight has been
      {bodyweightChange > 0 ? "increasing" : "decreasing"}
      at a rate of
      <span>{bodyweightChange.toFixed(1)}{units} / day </span>.
    </>);
    // Time to reach goal
    let daysLeft = (targetWeight-avgWeight)/bodyweightChange;
    if (daysLeft > 0) {
      bodyweightChangeMessage = (<>
        {bodyweightChangeMessage}
        At this rate, it will take about <span>{daysLeft.toFixed(0)} days</span> to reach your goal of <span>{targetWeight.toFixed(1)}{units}</span>.
      </>);
    } else {
      bodyweightChangeMessage = (<>
        {bodyweightChangeMessage}
        Your bodyweight is moving in the wrong direction. :( </>);
    }
  }
  if (!targetCalories && !avgCalories) {
    content = (
      <div className='empty-view'>
        Get started by updating your profile and recording what you ate today!
        <div>
          <BigButton linkTo={"/user?uid="+uid}
              icon='account_circle' text='Profile' />
          <BigButton linkTo={"/food/table?uid="+uid}
              icon='fastfood' text='Diet' />
          <BigButton linkTo={"/body?uid="+uid}
              icon='trending_down' text='Weight' />
        </div>
        Your progress report will appear here once you have entered some data.
      </div>
    );
  } else if (targetCalories && !avgCalories) {
    content = (
      <div className='empty-view'>
        You do not currently have anything recorded for the week.
        Go to your diet page and record what you ate today!
        <div>
          <BigButton linkTo={"/food/table?uid="+uid}
              icon='fastfood' text='Diet' />
        </div>
        Your progress report will appear here once you have entered some data.
      </div>
    );
  } else if (!targetCalories && avgCalories) {
    content = (
      <div className='empty-view'>
        You haven't specified your goals.
        Update your profile to see your progress relative to your goals.
        <div>
          <BigButton linkTo={"/user?uid="+uid}
              icon='account_circle' text='Profile' />
        </div>
      </div>
    );
  } else {
    content = <TodayCalories uid={uid} />;
  }
  return (
    <main className='overview-page-container'>
      <div className='card col-12'>
        <h2>Hello {name}</h2>
        <div className='progress-report'>
          <h3>Progress Report</h3>
          { content }
        </div>
      </div>
    </main>
  );
}

function TodayCalories(props) {
  const {
    uid = null,
  } = props;
  const user = useSelector(state => state.userProfiles.entities[uid] || {});
  const history = useSelector(state => state.foodSummary.history);
  const caloriesChange = useSelector(state => state.foodSummary.calorie_change_per_day);

  const targetCalories = user.target_calories;
  const [avgCalories, setAvgCalories] = useState(null);
  const [todayCalories, setTodayCalories] = useState(null);
  const caloriesLeft = targetCalories-todayCalories;

  useEffect(() => {
    if (!history) {
      return;
    }

    // Compute the amount consumed over the past week
    let total = 0;
    let count = 0;
    let today = new Date(formatDate(new Date()));
    history.forEach(function(x){
      // Ignore food consumption from today, so it doesn't artificially lower the average
      if (new Date(x.date) < today && x.calories) {
        total += x.calories;
        count += 1;
      }
    });
    setAvgCalories(count > 0 ? Math.floor(total/count) : 0);

    // Compute the amount consumed today
    if (history.length > 0) {
      setTodayCalories(history[0].calories || 0);
    }
  }, [history]);

  let caloriesChangeMessage = null;
  if (caloriesChange) {
    caloriesChangeMessage = (<>
      Your Calorie consumption has been {caloriesChange > 0 ? 'increasing' : 'decreasing'} at a rate of <span>{caloriesChange.toFixed(1)} Calories/day</span>.
    </>);
  }

  return (
      <>
        <ProgressBar percentage={todayCalories/targetCalories}
          centerText={'Today'}
          leftText={clipFloat(todayCalories,0)+' Calories consumed'}
          rightText={clipFloat(caloriesLeft,0)+' Calories left'} />
        <ProgressBar percentage={avgCalories/targetCalories}
          centerText={'Weekly Average'}
          leftText={clipFloat(avgCalories,0)+' Calories consumed'}
          rightText={clipFloat(targetCalories-avgCalories,0)+' Calories left'} />
        <div>
          {caloriesChangeMessage}
        </div>
      </>
  );
}

function ResponsiveSVG(props) {
  const {
    children,
    onResize,
  } = props;

  const ref = useRef(null);
  const [width,setWidth] = useState(null);
  useEffect(()=>{
    function handleResize() {
      setWidth(ref.current.getBoundingClientRect().width);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return ()=>{
      window.removeEventListener('resize', handleResize);
    };
  },[]);

  useEffect(()=>{
    onResize(width);
  },[width]);

  useEffect(()=>{},[])

  return (
    <div ref={ref} className="responsive-svg-wrapper">
      {width && children}
    </div>
  );
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
            <text className='middle' textAnchor='middle' y={height-6} >{centerText}</text>
            <text className='left' textAnchor='start' y={height-6} >{leftText}</text>
            <text className='right' textAnchor='end' y={height-6} >{rightText}</text>
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
            <text className='middle' textAnchor='middle' y={height-6} >{centerText}</text>
            <text className='left' textAnchor='start' y={height-6} >{leftText}</text>
            <text className='right' textAnchor='end' y={height-6} >{rightText}</text>
          </svg>
        </div>
      );
    } else {
      return null;
    }
  }
}
