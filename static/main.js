// main.js - Initializes and connects the components
document.addEventListener('DOMContentLoaded', function() {
  // Create containers if they don't exist
  if (!document.getElementById('barchart')) {
    const barChartContainer = document.createElement('div');
    barChartContainer.id = 'barchart';
    barChartContainer.style.marginTop = '20px';
    barChartContainer.style.width = '100%';
    barChartContainer.style.maxWidth = '1200px';
    document.body.appendChild(barChartContainer);
  }
  
  if (!document.getElementById('comparison-chart')) {
    const comparisonChartContainer = document.createElement('div');
    comparisonChartContainer.id = 'comparison-chart';
    comparisonChartContainer.style.marginTop = '40px';
    comparisonChartContainer.style.width = '100%';
    comparisonChartContainer.style.maxWidth = '1200px';
    comparisonChartContainer.style.border = '1px solid #ddd';
    comparisonChartContainer.style.padding = '20px';
    comparisonChartContainer.style.borderRadius = '5px';
    comparisonChartContainer.style.backgroundColor = '#f9f9f9';
    comparisonChartContainer.style.display = 'none'; // Initially hidden
    document.body.appendChild(comparisonChartContainer);
  }
  
  if (!document.getElementById('parallel-coordinates')) {
    const parallelCoordinatesContainer = document.createElement('div');
    parallelCoordinatesContainer.id = 'parallel-coordinates';
    parallelCoordinatesContainer.style.marginTop = '40px';
    parallelCoordinatesContainer.style.width = '100%';
    parallelCoordinatesContainer.style.maxWidth = '1200px';
    parallelCoordinatesContainer.style.display = 'none'; // Initially hidden
    document.body.appendChild(parallelCoordinatesContainer);
  }

  // Initialize the map component
  const map = new ChoroplethMap({
    svgId: 'map-svg',
    tooltipClass: 'tooltip',
    legendId: 'legend',
    metricDropdownId: 'metric',
    dataUrl: '/static/D_T_with_state_id.csv',
    topoUrl: '/static/states-albers-10m.json',
    onStateSelected: handleStateSelection,
    onMultipleStatesSelected: handleMultipleStatesSelection
  });

  // Initialize the bar chart component for single state
  const barChart = new StateBarChart({
    containerId: 'barchart',
    tooltipClass: 'tooltip',
    onMetricSelected: handleMetricSelection
  });
  
  // Initialize the comparison chart component for multiple states
  const comparisonChart = new ComparisonChart({
    containerId: 'comparison-chart',
    tooltipClass: 'tooltip',
    onMetricSelected: handleMetricSelection
  });
  
  // Initialize the parallel coordinates component for multiple states
  const parallelCoordinates = new ParallelCoordinates({
    containerId: 'parallel-coordinates',
    tooltipClass: 'tooltip',
    onMetricSelected: handleMetricSelection
  });

  // Handler for when a single state is selected on the map
  function handleStateSelection(stateData, currentMetric) {
    barChart.updateChart(stateData, currentMetric);
    
    // Hide multi-state visualizations
    document.getElementById('comparison-chart').style.display = 'none';
    document.getElementById('parallel-coordinates').style.display = 'none';
    document.getElementById('barchart').style.display = 'block';
  }
  
  // Handler for when multiple states are selected on the map
  function handleMultipleStatesSelection(statesData, currentMetric) {
    if (statesData.length === 0) {
      // No states selected, hide all comparison visualizations
      document.getElementById('comparison-chart').style.display = 'none';
      document.getElementById('parallel-coordinates').style.display = 'none';
      document.getElementById('barchart').style.display = 'block';
    } else if (statesData.length === 1) {
      // Single state, show bar chart
      barChart.updateChart(statesData[0], currentMetric);
      document.getElementById('comparison-chart').style.display = 'none';
      document.getElementById('parallel-coordinates').style.display = 'none';
      document.getElementById('barchart').style.display = 'block';
    } else {
      // Multiple states, show comparison visualizations
      comparisonChart.updateChart(statesData, currentMetric);
      parallelCoordinates.updateChart(statesData, currentMetric);
      document.getElementById('comparison-chart').style.display = 'block';
      document.getElementById('parallel-coordinates').style.display = 'block';
      document.getElementById('barchart').style.display = 'none';
    }
  }

  // Handler for when a metric is selected in any of the charts
  function handleMetricSelection(metricName) {
    map.setMetric(metricName);
    
    // Update both charts with the new metric
    const selectedStates = map.getSelectedStates();
    
    if (selectedStates.length <= 1) {
      const stateData = map.getSelectedState() || (selectedStates.length === 1 ? selectedStates[0] : null);
      if (stateData) {
        barChart.setMetric(metricName);
      }
    } else {
      comparisonChart.setMetric(metricName);
      // Note: The parallel coordinates plot handles metric selection internally
    }
  }
});// main.js - Initializes and connects the components
document.addEventListener('DOMContentLoaded', function() {
  // Create containers if they don't exist
  if (!document.getElementById('barchart')) {
    const barChartContainer = document.createElement('div');
    barChartContainer.id = 'barchart';
    barChartContainer.style.marginTop = '20px';
    barChartContainer.style.width = '100%';
    barChartContainer.style.maxWidth = '1200px';
    document.body.appendChild(barChartContainer);
  }
  
  if (!document.getElementById('comparison-chart')) {
    const comparisonChartContainer = document.createElement('div');
    comparisonChartContainer.id = 'comparison-chart';
    comparisonChartContainer.style.marginTop = '40px';
    comparisonChartContainer.style.width = '100%';
    comparisonChartContainer.style.maxWidth = '1200px';
    comparisonChartContainer.style.border = '1px solid #ddd';
    comparisonChartContainer.style.padding = '20px';
    comparisonChartContainer.style.borderRadius = '5px';
    comparisonChartContainer.style.backgroundColor = '#f9f9f9';
    document.body.appendChild(comparisonChartContainer);
  }

  // Initialize the map component
  const map = new ChoroplethMap({
    svgId: 'map-svg',
    tooltipClass: 'tooltip',
    legendId: 'legend',
    metricDropdownId: 'metric',
    dataUrl: '/static/D_T_with_state_id.csv',
    topoUrl: '/static/states-albers-10m.json',
    onStateSelected: handleStateSelection,
    onMultipleStatesSelected: handleMultipleStatesSelection
  });

  // Initialize the bar chart component for single state
  const barChart = new StateBarChart({
    containerId: 'barchart',
    tooltipClass: 'tooltip',
    onMetricSelected: handleMetricSelection
  });
  
  // Initialize the comparison chart component for multiple states
  const comparisonChart = new ComparisonChart({
    containerId: 'comparison-chart',
    tooltipClass: 'tooltip',
    onMetricSelected: handleMetricSelection
  });

  // Handler for when a single state is selected on the map
  function handleStateSelection(stateData, currentMetric) {
    barChart.updateChart(stateData, currentMetric);
    
    // Hide comparison chart when in single state mode
    document.getElementById('comparison-chart').style.display = 'none';
    document.getElementById('barchart').style.display = 'block';
  }
  
  // Handler for when multiple states are selected on the map
  function handleMultipleStatesSelection(statesData, currentMetric) {
    if (statesData.length === 0) {
      // No states selected, hide comparison chart
      document.getElementById('comparison-chart').style.display = 'none';
      document.getElementById('barchart').style.display = 'block';
    } else if (statesData.length === 1) {
      // Single state, show bar chart
      barChart.updateChart(statesData[0], currentMetric);
      document.getElementById('comparison-chart').style.display = 'none';
      document.getElementById('barchart').style.display = 'block';
    } else {
      // Multiple states, show comparison chart
      comparisonChart.updateChart(statesData, currentMetric);
      document.getElementById('comparison-chart').style.display = 'block';
      document.getElementById('barchart').style.display = 'none';
    }
  }

  // Handler for when a metric is selected in any of the charts
  function handleMetricSelection(metricName) {
    map.setMetric(metricName);
    
    // Update both charts with the new metric
    if (map.getSelectedStates().length <= 1) {
      const stateData = map.getSelectedState();
      if (stateData) {
        barChart.setMetric(metricName);
      }
    } else {
      comparisonChart.setMetric(metricName);
    }
  }
});