// function to make API call for specific factor
const getData = async(colName) => {
  // API endpoint
  const fetchUrl = `https://data.ojp.usdoj.gov/resource/gcuy-rt5g.json?$query=select * where year in ("2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021") limit 5000000`
  // make API call
  const response = await fetch(fetchUrl)
    // turn API response to JSON object
    .then(response => response.json())
    // clean data
    .then(async data => {
      // valid values for each factor (excluding residue or unknown values)
      const goodVals = {
          'hincome1': ['1', '2', '3', '4', '5', '6', '7'],
          'ager': ['1', '2', '3', '4', '5', '6'],
          'educatn1': ['2', '3', '4', '5'],
          'vicservices': ['1', '2'],
          'treatment': ['1', '2'],
          'notify': ['1', '2']
        };
      
      // only want SA-related crimes
      data = data.filter(row => row['newoff'] === '1');
      // only need factor column and notify column
      data.forEach(row => { for (const col in row) { if (col !== 'notify' && col !== colName) { delete row[col]; } } });
      // only valid values 
      data = data.filter(row => goodVals[colName].includes(row[colName]) && goodVals['notify'].includes(row['notify']));
      // change the 'not reported' value to 0 for counting purposes
      data.forEach(row => {if (row['notify'] === '2') {row['notify'] = '0'}});
      // make data numeric
      data.forEach(row => {for (const col in row) {row[col] = parseInt(row[col]);}});
      
      return data;
    })
  .then(data => {
    // dictionaries to convert numeric values to understandable values
    const replaceDicts = {
      'hincome1': {
        '1': 'Less than $7,500',
        '2': '$7,500 to $14,999',
        '3': '$15,000 to $24,999',
        '4': '$25,000 to $34,999',
        '5': '$35,000 to $49,999',
        '6': '$50,000 to $74,999',
        '7': '$75,000 or more'
      },
      'ager': {
        '1': '12-17',
        '2': '18-24',
        '3': '25-34',
        '4': '35-49',
        '5': '50-64',
        '6': '65 or older'
      },
      'educatn1': {
        '1' : 'No schooling',
        '2' : 'Grade school',
        '3' : 'Middle school',
        '4' : 'High school',
        '5' : 'College'
      },
      'vicservices': {
        '1': 'Received help from victim services',
        '2': 'Did not receive help from victim services'
      },
      'treatment': {
        '1' : 'Received medical treatment',
        '2' : 'Did not receive medical treatment'
      }
    };
    
    const titleDict = {
      'hincome1': 'Survivors with mid-range household incomes are most likely to report',
      'ager': 'Young survivors are significantly more likely to report than any other age range',
      'educatn1': 'Survivors with a middle school education are most likley to report',
      'vicservices': 'Survivors who received victim services are significantly more likely to report',
      'treatment': 'Survivors who received medical treatment are significantly less likely to report'
    }
    
    
    // function to group data by factor values
    const groupBy = (dataDict, col) => {
      return dataDict.reduce((reduceVal, row) => {
        (reduceVal[row[col]] = reduceVal[row[col]] || []).push(row);
        return reduceVal;
      }, {});
    };
    
    // group data by factor
    const dataGroupedByCol = groupBy(data, colName);
    
    // convert grouped data to list of notify values by factor bucket
    for (const bucket in dataGroupedByCol) {
      for (let i = 0; i < dataGroupedByCol[bucket].length; i++) {
        delete dataGroupedByCol[bucket][i][colName];
        dataGroupedByCol[bucket][i] = dataGroupedByCol[bucket][i]['notify'];
      }
      dataGroupedByCol[replaceDicts[colName][bucket]] = dataGroupedByCol[bucket];
      delete dataGroupedByCol[bucket];
    }
    
    // calculate totals and proportion reported for each factor bucket
    const totalsPerBucket = {}
    const reportedPerBucket = {}
    const proportionsPerBucket = {}
    for (const bucket in dataGroupedByCol) {
      totalsPerBucket[bucket] = dataGroupedByCol[bucket].length;
      reportedPerBucket[bucket] = dataGroupedByCol[bucket].filter(el => el === 1).length;
      proportionsPerBucket[bucket] = reportedPerBucket[bucket] / totalsPerBucket[bucket] * 100;
    }
    
    // create chart with data
    Highcharts.chart(`${colName}-chart`, {
      chart: {
          type: 'column'
      },
      title: {
          align: 'left',
          text: titleDict[colName]
      },
      accessibility: {
          announceNewData: {
              enabled: true
          }
      },
      xAxis: {
          categories: Object.keys(dataGroupedByCol)
      },
      yAxis: {
          title: {
              text: 'Percent of cases reported to police'
          }

      },
      legend: {
          enabled: false
      },
      plotOptions: {
          series: {
              borderWidth: 0,
              dataLabels: {
                  enabled: true,
                  format: '{point.y:.1f}%'
              }
          }
      },

      tooltip: {
          headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
          pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y:.2f}%</b> of total<br/>'
      },

      series: [{
        type: 'column',
        name: `${colName}`, 
        data: Object.values(proportionsPerBucket),
        color: '#56ACFE'
      }]
    });
  });
};

// function to show current tab and hide all others
const showHideTabs = colName => {
  // ids for all tab contents elements
  const tabIds = ['hincome1', 'ager', 'educatn1', 'vicservices', 'treatment'];
  
  // loop through tab ids
  for (let i = 0; i < tabIds.length; i++) {
    const tabId = tabIds[i];
    const tabIdElement = document.getElementById(tabId + '-tab');
    
    // if the tab is not the clicked tab, hide it
    if (tabId !== colName) {
      tabIdElement.className = 'tabcontent hidden';
    }
    // if the tab is the clicked tab, show it
    if (tabId === colName) {
      tabIdElement.className = 'tabcontent shown';
    }
  }
}

// function to open tab and render chart
const openTab = async(event, colName) => {
  // show/hide necessary tabs
  showHideTabs(colName);
  
  const tabs = document.getElementsByClassName('tab-button');
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i] !== event.currentTarget) {
      tabs[i].classList.remove('selected');
    } else {
      tabs[i].classList.add('selected');
    }
  }
  
  let loadingDotsDisplay = document.getElementsByClassName('dot-flashing')[0].style.display;
  
  loadingDotsDisplay = 'inline-block';
  
  // get necessary data from API and plot
  await getData(colName);
  
  loadingDotsDisplay = 'none';
};

// function to show hidden content w/ all tabs
const showTabs = async() => {
  const hiddenTabs = document.getElementById('hidden-tabs');
  // show all tab content
  hiddenTabs.style.display = 'block';
  
  // scroll tabs into view
  hiddenTabs.scrollIntoView();
  
  // show dots while loading
  let loadingDotsDisplay = [...document.getElementsByClassName('dot-flashing')];
  loadingDotsDisplay.forEach(dot => dot.style.display = 'inline-block');

  
  // render chart for first tab
  await getData('vicservices');
  
  // hide dots once loaded
  loadingDotsDisplay.forEach(dot => dot.style.display = 'none');
}

// dictionary of ids and corresponding text
const dragDropDict = {
  'ager': "Survivor's Age",
  'vicservices': "Received Victim Services",
  'hincome1': "Survivor's Household Income",
  'educatn1': "Survivor's Education Level",
  'treatment': "Received Medical Treatment"
}

// list of ids of each rank list item
const rankIds = ['first', 'second', 'third', 'fourth', 'fifth'];

let dropped = false;

// function to drag text from one list to the other
const drag = event => {
  // set data to be dragged: text content of list item
  event.dataTransfer.setData("text/plain", event.target.innerHTML);
  dropped = false;
}

const afterDrag = event => {
  const labelElement = event.currentTarget;
  if (!dropped) {
    labelElement.classList.remove("disabled");
  } else {
    labelElement.setAttribute("draggable", "false");
    labelElement.removeEventListener("dragstart", drag);
    labelElement.addEventListener("drop", drop, true);
    labelElement.addEventListener("dragover", allowDrop);
  }
  
  // remove activate drop areas
  const dropAreas = document.getElementsByClassName('drag-drop-item drop')
  for (let i = 0; i < dropAreas.length; i++) {
    const thisDropArea = dropAreas[i];
    thisDropArea.classList.remove("activated")
  }
}

// function to disable original item during drag
const duringDrag = (event, fromList) => {
  if (fromList) {
    const listItem = event.currentTarget;
    listItem.innerHTML = '';
    listItem.classList.remove('drag');
    listItem.classList.add('drop');
  }
  
  // disabled style
  event.target.classList.add("disabled");
  
  // activate drop areas
  const dropAreas = document.getElementsByClassName('drag-drop-item drop')
  for (let i = 0; i < dropAreas.length; i++) {
    const thisDropArea = dropAreas[i];
    thisDropArea.classList.add("activated")
  }
  
  event.currentTarget.style.cursor = 'grabbing';
}


// event handler to allow dropping
const allowDrop = event => {
  // allow dropping
  event.preventDefault();
}

// event handler for drop
const drop = (event, fromList) => {
  // allow dropping
  event.preventDefault();
  
  if (fromList) {
    // get text data from drag event
    let data = event.dataTransfer.getData("text/plain");
    const dataHtml = document.createElement('div');
    dataHtml.innerHTML = data;

    // if returning rank to label, make label draggable again and make list item droppable
    if (!rankIds.includes(event.target.id)) {
      const idToFind = Object.keys(dragDropDict).find(key => dragDropDict[key] === dataHtml.textContent.trim());
      const labelElement = document.getElementById(idToFind);
      labelElement.classList.remove("disabled");
      labelElement.setAttribute("draggable", "true");
      labelElement.addEventListener("dragstart", drag);
      labelElement.removeEventListener("drop", drop, true);
      labelElement.removeEventListener("dragover", allowDrop);
    } else {
      drop(event);
    }

    // if the dropped text appears somewhere else in the list, remove it
    for (let i = 0; i < rankIds.length; i++) {
      const thisRank = document.getElementById(rankIds[i]);
      if (thisRank.textContent.trim() === data && thisRank !== event.target) {
        thisRank.innerHTML = ''
      }
    }
  } else {
    dropped = true;

    // drop item
    const dropItem = event.currentTarget;

    // if replacing text, enable label of replaced item
    if (dropItem.className !== 'drag-drop-item drop activated') {
      console.log()
      const idToFind = Object.keys(dragDropDict).find(key => dragDropDict[key] === dropItem.textContent.trim());
      const labelElement = document.getElementById(idToFind);
      labelElement.classList.remove("disabled");
      labelElement.setAttribute("draggable", "true");
      labelElement.addEventListener("dragstart", drag);
      labelElement.removeEventListener("drop", drop, true);
      labelElement.removeEventListener("dragover", allowDrop);
    }

    // dragged item's content
    let data = event.dataTransfer.getData("text/plain");
    // set drop item content to dragged item's content
    dropItem.innerHTML = data;
    // make the drop element draggable so users can change their ranking
    dropItem.setAttribute("draggable", "true");
    dropItem.addEventListener("dragstart", drag);
    dropItem.addEventListener("drag", duringDrag);
    dropItem.classList.remove("drop");
    dropItem.classList.add("drag");

    // if the dropped text appears somewhere else in the list, remove it
    for (let i = 0; i < rankIds.length; i++) {
      const thisRank = document.getElementById(rankIds[i]);
      if (thisRank.innerHTML === data && thisRank !== event.currentTarget) {
        thisRank.innerHTML = ''
        thisRank.classList.remove("disabled");
        thisRank.classList.remove("drag");
        thisRank.classList.add("drop");
      }
    }
    
  }
}


let numCorrect = 0;
const responseDict = {
  0: "Unfortunately",
  1: "Unfortunately",
  2: "Not bad",
  3: "Not bad",
  4: "Nice job",
  5: "Nice job"
}

const isCorrectSubmission = (thisRank, text) => {
  const submissionRank = document.getElementById('sub-' + thisRank);
  const accRank = document.getElementById('acc-' + thisRank);
  // put ranking text into corresponding rank on results page
  submissionRank.textContent = text + ' ';
  // if ranking is correct, add check
  if (submissionRank.textContent.trim() === accRank.textContent) {
    submissionRank.innerHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#AAFF00" class="bi bi-check-lg" viewBox="0 0 16 16">
    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
    </svg>`
    numCorrect += 1;
  } else {
    // otherwise, add X
    submissionRank.innerHTML += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#FF3131" class="bi bi-x-lg" viewBox="0 0 16 16">
    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>`
  }
}

// function to determine if all rankings were made and log them
const logSubmission = () => {
  // for each rank id
  for (let i = 0; i < rankIds.length; i++) {
    // the current rank id
    const thisRank = rankIds[i];
    // text in div of current rank id
    const text = document.getElementById(thisRank).textContent;
    // if the ranking was not made
    if (text.trim() === '') {
      // show warning message and return false
      let warningMessage = document.getElementsByClassName('alert alert-warning hidden')[0];
      warningMessage.classList.remove('hidden');
      warningMessage.scrollIntoView();
      return false;
    }
    // if ranking was made
    else {
      isCorrectSubmission(thisRank, text);
    }
  }
  // if all rankings were made, return true
  return true;
}

const logSubmissionMobile = () => {
  let result = true;
  const possibleSubmissions = ["survivorsage", "receivedvictimservices", "receivedmedicaltreatment", "survivorshouseholdincome", "survivorseducationlevel"]
  for (let i = 0; i < rankIds.length; i++) {
    // the current rank id
    const thisRank = rankIds[i];
    const thisInput = document.getElementById("mobile-" + thisRank);
    // text in div of current rank id
    const text = thisInput.value;
    if (!possibleSubmissions.includes(text.toLowerCase().replace(/\W/g, ''))) {
      thisInput.style.border = "1px solid #FF3131";
      result = false;
    } else {
      thisInput.style.border = "none";
      isCorrectSubmission(thisRank, text);
    }
  }
  if (!result) {
    // show warning message and return false
    let warningMessage = document.getElementsByClassName('alert alert-warning hidden mobile')[0];
    warningMessage.classList.remove('hidden');
    warningMessage.scrollIntoView();
  }
  return result;
}

// function to show results if all rankings were made
const showResults = mobile => {
  const completeSubmission = mobile ? logSubmissionMobile() : logSubmission();
  if (completeSubmission) {
    document.getElementById('results-text').innerHTML = `${responseDict[numCorrect]}, you correctly matched ${numCorrect} out of 5 factors that can impact a survivor's decision to report. <br/><br/>
    Here is your ranking compared to the actual ranking of factors.`
    document.getElementById('learn-more-text').innerHTML = "</br> Click the button below to learn more about how each of these factors can impact a survivor's decision to report a sexual assault to the police."
    // remove warning message if it was there
    mobile ? document.getElementsByClassName('alert alert-warning mobile')[0].classList.add('hidden')
    : document.getElementsByClassName('alert alert-warning')[0].classList.add('hidden');
    // results div
    const results = document.getElementById('results');
    // show results
    results.style.display = 'block';
    // scroll results into view
    results.scrollIntoView();
  }
}
