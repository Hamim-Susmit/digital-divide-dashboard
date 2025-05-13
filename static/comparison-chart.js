// comparison-chart.js - For comparing metrics across multiple states
class ComparisonChart {
  constructor(config) {
    this.containerId = config.containerId || 'comparison-chart';
    this.tooltipClass = config.tooltipClass || 'tooltip';
    
    this.container = d3.select(`#${this.containerId}`);
    this.tooltip = d3.select(`.${this.tooltipClass}`);
    
    // Default dimensions
    this.chartWidth = config.width || 960;
    this.chartHeight = config.height || 500;
    this.margin = {
      top: 50,
      right: 150,
      bottom: 100,
      left: 80
    };
    
    this.statesData = [];
    this.metrics = [];
    this.currentMetric = null;
    this.onMetricSelected = config.onMetricSelected || function() {};
  }
  
  updateChart(statesData, currentMetric) {
    if (!statesData || statesData.length === 0) {
      this.container.html("<p class='no-data-message'>Select multiple states to compare their metrics.</p>");
      return;
    }
    
    this.statesData = statesData;
    this.currentMetric = currentMetric;
    
    // Extract metrics from the first state's data
    this.metrics = Object.keys(statesData[0]).filter(key => 
      !["State", "state_id", "Geo_ID"].includes(key)
    );
    
    this.drawComparisonChart();
  }
  
  drawComparisonChart() {
    // Clear existing content
    this.container.html("");
    
    // Create the title
    this.container.append("h3")
      .text(`Comparing ${this.currentMetric} Across States`)
      .style("text-align", "center")
      .style("margin-bottom", "20px");
    
    // Create the radio buttons for selecting different metrics
    const radioContainer = this.container.append("div")
      .attr("class", "metric-selector")
      .style("margin-bottom", "20px")
      .style("text-align", "center");
      
    radioContainer.append("span")
      .text("Select metric to compare: ")
      .style("font-weight", "bold");
      
    const radioButtons = radioContainer.selectAll("label")
      .data(this.metrics)
      .enter()
      .append("label")
      .style("margin", "0 10px")
      .style("display", "inline-block");
      
    radioButtons.append("input")
      .attr("type", "radio")
      .attr("name", "metric")
      .attr("value", d => d)
      .attr("checked", d => d === this.currentMetric ? "" : null)
      .on("change", (event, d) => {
        this.currentMetric = d;
        this.onMetricSelected(d);
        this.drawComparisonChart();
      });
      
    radioButtons.append("span")
      .text(d => d)
      .style("margin-left", "5px");
    
    // Create SVG for the chart
    const svg = this.container.append("svg")
      .attr("width", this.chartWidth)
      .attr("height", this.chartHeight);
      
    // Sort the states data by the current metric in descending order
    const sortedData = [...this.statesData].sort((a, b) => 
      b[this.currentMetric] - a[this.currentMetric]
    );
    
    // Set up scales
    const x = d3.scaleBand()
      .domain(sortedData.map(d => d.State))
      .range([this.margin.left, this.chartWidth - this.margin.right])
      .padding(0.2);
      
    // Find the max value, adding 10% padding
    const maxValue = d3.max(sortedData, d => +d[this.currentMetric]) * 1.1;
    
    const y = d3.scaleLinear()
      .domain([0, maxValue])
      .range([this.chartHeight - this.margin.bottom, this.margin.top]);
      
    // Generate a color scale based on the number of states
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(sortedData.map(d => d.State));
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${this.chartHeight - this.margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("transform", "rotate(-45)")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");
      
    // Add Y axis
    svg.append("g")
      .attr("transform", `translate(${this.margin.left},0)`)
      .call(d3.axisLeft(y));
      
    // Add Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 20)
      .attr("x", -this.chartHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text(this.currentMetric);
      
    // Add bars
    svg.selectAll(".bar")
      .data(sortedData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.State))
      .attr("y", d => y(+d[this.currentMetric]))
      .attr("width", x.bandwidth())
      .attr("height", d => this.chartHeight - this.margin.bottom - y(+d[this.currentMetric]))
      .attr("fill", d => colorScale(d.State))
      .on("mouseover", (event, d) => {
        this.tooltip.style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(`<strong>${d.State}</strong><br>${this.currentMetric}: ${d[this.currentMetric]}`);
      })
      .on("mouseout", () => this.tooltip.style("display", "none"));
      
    // Add value labels on top of bars
    svg.selectAll(".value-label")
      .data(sortedData)
      .join("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.State) + x.bandwidth() / 2)
      .attr("y", d => y(+d[this.currentMetric]) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(d => d[this.currentMetric]);
      
    // Add radar chart for comparing all metrics across selected states
    this.drawRadarChart(sortedData, colorScale);
  }
  
  drawRadarChart(statesData, colorScale) {
    // Add title for radar chart section
    this.container.append("h3")
      .text("Comparing All Metrics")
      .style("text-align", "center")
      .style("margin", "30px 0 20px 0");
      
    // Create SVG for radar chart
    const radarWidth = this.chartWidth;
    const radarHeight = 500;
    const radarSvg = this.container.append("svg")
      .attr("width", radarWidth)
      .attr("height", radarHeight);
      
    const radarMargin = {top: 50, right: 100, bottom: 50, left: 100};
    const radarRadius = Math.min(
      radarWidth - radarMargin.left - radarMargin.right, 
      radarHeight - radarMargin.top - radarMargin.bottom
    ) / 2;
    
    // Center point for the radar chart
    const centerX = radarWidth / 2;
    const centerY = radarHeight / 2;
    
    // Normalize the data for radar chart
    // For each metric, find the min and max values
    const metricExtents = {};
    this.metrics.forEach(metric => {
      metricExtents[metric] = d3.extent(statesData, d => +d[metric]);
    });
    
    // Create normalized data for each state
    const normalizedData = statesData.map(state => {
      const normalized = { State: state.State };
      this.metrics.forEach(metric => {
        const [min, max] = metricExtents[metric];
        // Avoid division by zero
        const range = max - min || 1;
        normalized[metric] = (state[metric] - min) / range;
      });
      return normalized;
    });
    
    // Create a scale for each axis
    const angleScale = d3.scaleLinear()
      .domain([0, this.metrics.length])
      .range([0, Math.PI * 2]);
      
    // Create circles for the radar background
    const circles = [0.2, 0.4, 0.6, 0.8, 1];
    
    // Add radar grid circles
    radarSvg.selectAll(".radar-circle")
      .data(circles)
      .join("circle")
      .attr("class", "radar-circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", d => d * radarRadius)
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-dasharray", "3,3");
      
    // Add radar axes
    const axes = radarSvg.selectAll(".radar-axis")
      .data(this.metrics)
      .join("line")
      .attr("class", "radar-axis")
      .attr("x1", centerX)
      .attr("y1", centerY)
      .attr("x2", (d, i) => centerX + radarRadius * Math.cos(angleScale(i) - Math.PI/2))
      .attr("y2", (d, i) => centerY + radarRadius * Math.sin(angleScale(i) - Math.PI/2))
      .attr("stroke", "#888")
      .attr("stroke-width", 1);
      
    // Add radar axis labels
    radarSvg.selectAll(".radar-label")
      .data(this.metrics)
      .join("text")
      .attr("class", "radar-label")
      .attr("x", (d, i) => centerX + (radarRadius + 20) * Math.cos(angleScale(i) - Math.PI/2))
      .attr("y", (d, i) => centerY + (radarRadius + 20) * Math.sin(angleScale(i) - Math.PI/2))
      .attr("text-anchor", (d, i) => {
        const angle = angleScale(i);
        if (angle < Math.PI / 4 || angle > Math.PI * 7/4) return "start";
        if (angle < Math.PI * 3/4) return "start";
        if (angle < Math.PI * 5/4) return "end";
        if (angle < Math.PI * 7/4) return "end";
        return "start";
      })
      .attr("dominant-baseline", (d, i) => {
        const angle = angleScale(i);
        if (angle < Math.PI / 2 || angle > Math.PI * 3/2) return "auto";
        return "hanging";
      })
      .style("font-size", "12px")
      .text(d => d);
      
    // Create a line generator for radar paths
    const radarLine = d3.lineRadial()
      .angle((d, i) => angleScale(i) - Math.PI/2)
      .radius(d => d * radarRadius)
      .curve(d3.curveLinearClosed);
      
    // Add radar paths for each state
    normalizedData.forEach(state => {
      // Extract the normalized values in the right order
      const values = this.metrics.map(metric => state[metric]);
      
      // Add the path
      radarSvg.append("path")
        .datum(values)
        .attr("class", "radar-path")
        .attr("d", radarLine)
        .attr("fill", colorScale(state.State))
        .attr("fill-opacity", 0.1)
        .attr("stroke", colorScale(state.State))
        .attr("stroke-width", 2)
        .attr("transform", `translate(${centerX},${centerY})`);
    });
    
    // Add legend
    const legend = radarSvg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${radarWidth - 80}, 20)`);
      
    statesData.forEach((state, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
        
      legendItem.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorScale(state.State));
        
      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "12px")
        .text(state.State);
    });
    
    // Add comparison table
    this.drawComparisonTable(statesData);
  }
  
  drawComparisonTable(statesData) {
    // Add a table for comparing exact values
    const tableContainer = this.container.append("div")
      .attr("class", "table-container")
      .style("margin-top", "30px")
      .style("overflow-x", "auto");
      
    const table = tableContainer.append("table")
      .style("width", "100%")
      .style("border-collapse", "collapse")
      .style("margin", "0 auto");
      
    // Create header row
    const thead = table.append("thead");
    const headerRow = thead.append("tr");
    
    headerRow.append("th")
      .text("Metric")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .style("text-align", "left")
      .style("background-color", "#f2f2f2");
      
    statesData.forEach(state => {
      headerRow.append("th")
        .text(state.State)
        .style("border", "1px solid #ddd")
        .style("padding", "8px")
        .style("text-align", "right")
        .style("background-color", "#f2f2f2");
    });
    
    // Create rows for each metric
    const tbody = table.append("tbody");
    
    this.metrics.forEach(metric => {
      const row = tbody.append("tr")
        .style("background-color", metric === this.currentMetric ? "#fff9e6" : "white"); // Highlight current metric
        
      row.append("td")
        .text(metric)
        .style("border", "1px solid #ddd")
        .style("padding", "8px")
        .style("font-weight", metric === this.currentMetric ? "bold" : "normal");
        
      statesData.forEach(state => {
        row.append("td")
          .text(state[metric])
          .style("border", "1px solid #ddd")
          .style("padding", "8px")
          .style("text-align", "right")
          .style("font-weight", metric === this.currentMetric ? "bold" : "normal");
      });
    });
  }
  
  // Public methods
  setMetric(metricName) {
    if (this.metrics.includes(metricName)) {
      this.currentMetric = metricName;
      this.drawComparisonChart();
      return true;
    }
    return false;
  }
  
  getCurrentMetric() {
    return this.currentMetric;
  }
}