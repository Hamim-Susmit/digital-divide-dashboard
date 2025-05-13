// barchart.js - Handles the bar chart visualization for state data
class StateBarChart {
  constructor(config) {
    this.containerId = config.containerId || 'barchart';
    this.tooltipClass = config.tooltipClass || 'tooltip';
    this.onMetricSelected = config.onMetricSelected || function() {};
    
    this.container = d3.select(`#${this.containerId}`);
    this.tooltip = d3.select(`.${this.tooltipClass}`);
    
    // Default dimensions
    this.barWidth = config.width || 1000;
    this.barHeight = config.height || 500;
    this.margin = { 
      top: 60, 
      right: 150,
      bottom: 100, 
      left: 350
    };
    
    this.stateData = null;
    this.metrics = [];
    this.currentMetric = null;
  }
  
  updateChart(stateData, currentMetric) {
    if (!stateData) return;
    
    this.stateData = stateData;
    this.currentMetric = currentMetric;
    
    // Extract metrics from state data (exclude non-data properties)
    this.metrics = Object.keys(stateData).filter(key => 
      !["State", "state_id", "Geo_ID"].includes(key)
    );
    
    this.drawBarChart();
  }
  
  drawBarChart() {
    // Clear previous chart
    this.container.html("");
    if (!this.stateData) return;
    
    // Calculate appropriate chart dimensions based on the number of metrics
    const numMetrics = this.metrics.length;
    const rowHeight = 40; // Height per metric row
    const barHeight = Math.max(this.barHeight, numMetrics * rowHeight + 150); // Ensure minimum height

    // Add title
    const chartTitle = this.container.append("h3")
      .text(`Metrics for ${this.stateData.State}`)
      .style("text-align", "center")
      .style("margin-bottom", "20px");
      
    // Create SVG for chart with calculated dimensions
    const svgChart = this.container.append("svg")
      .attr("width", this.barWidth)
      .attr("height", barHeight);

    // Create normalized versions of metrics for display
    const chartMetrics = this.metrics.map(m => {
      const value = +this.stateData[m];
      let normalizedValue = value;
      
      // If this is Median Household Income, scale it down to be comparable with percentages
      if (m === "Median Household Income") {
        normalizedValue = value / 1000; // Scale down by 1000
      }
      
      return {
        name: m,
        value: isNaN(value) ? 0 : value, // Original value
        normalizedValue: isNaN(normalizedValue) ? 0 : normalizedValue, // Scaled value for display
        displayValue: this.stateData[m], // Original display value
        isIncome: m === "Median Household Income" // Flag for special handling
      };
    });
    
    // Create a secondary array to handle scaled numeric values
    const normalizedMetrics = chartMetrics.map(d => ({
      ...d,
      // Use the normalized value for chart rendering but keep original for labels
      chartValue: d.isIncome ? d.normalizedValue : d.value 
    }));
    
    // Set up scales using the normalized values
    const maxValue = d3.max(normalizedMetrics, d => d.chartValue) * 1.1; // Add 10% padding
    
    const x = d3.scaleLinear()
      .domain([0, maxValue])
      .range([this.margin.left, this.barWidth - this.margin.right]);

    const y = d3.scaleBand()
      .domain(chartMetrics.map(d => d.name))
      .range([this.margin.top, barHeight - this.margin.bottom])
      .padding(0.2);

    // Add X axis with better formatting
    svgChart.append("g")
      .attr("transform", `translate(0,${barHeight - this.margin.bottom})`)
      .call(d3.axisBottom(x).ticks(10))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("transform", "rotate(-45)")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");

    // Add Y axis with better formatting
    const yAxis = svgChart.append("g")
      .attr("transform", `translate(${this.margin.left},0)`)
      .call(d3.axisLeft(y));
    
    // Better formatting for Y axis labels
    yAxis.selectAll("text")
      .style("font-size", "12px")
      .call(this.wrapText, this.margin.left - 10);
    
    // Add bars using normalized values for the width
    svgChart.selectAll(".bar")
      .data(normalizedMetrics)
      .join("rect")
      .attr("class", "bar")
      .attr("x", this.margin.left)
      .attr("y", d => y(d.name))
      .attr("width", d => x(d.chartValue) - this.margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", d => d.name === this.currentMetric ? "orange" : "steelblue")
      .on("mouseover", (event, d) => {
        let tooltipText = `<strong>${d.name}:</strong> ${d.displayValue}`;
        
        // Add a note about scaling for income
        if (d.isIncome) {
          tooltipText += "<br><em>(scaled down in chart for better comparison)</em>";
        }
        
        this.tooltip.style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .html(tooltipText);
      })
      .on("mouseout", () => this.tooltip.style("display", "none"))
      .on("click", (event, d) => this.handleBarClick(d));

    // Add value labels to the bars
    svgChart.selectAll(".value-label")
      .data(normalizedMetrics)
      .join("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.chartValue) + 5)
      .attr("y", d => y(d.name) + y.bandwidth() / 2 + 5)
      .text(d => {
        // For income, format the label appropriately
        if (d.isIncome) {
          const formattedVal = d3.format(",.0f")(d.value);
          return `${formattedVal}`; 
        }
        return d.displayValue;
      })
      .attr("font-size", "12px")
      .attr("fill", "black");

    // Add chart title
    svgChart.append("text")
      .attr("x", this.barWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text(`Data for ${this.stateData.State}`);
      
    // Add a note about scaling for the income metric
    svgChart.append("text")
      .attr("x", this.barWidth / 2)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-style", "italic")
      .text("Note: Median Household Income is scaled down for better visualization");
  }
  
  handleBarClick(metricData) {
    // Notify parent component about metric selection
    this.onMetricSelected(metricData.name);
    
    // Update the current metric
    this.currentMetric = metricData.name;
    
    // Redraw the chart to highlight the selected metric
    this.drawBarChart();
  }
  
  // Helper function to wrap long text labels
  wrapText(selection, width) {
    selection.each(function() {
      const text = d3.select(this);
      const words = text.text().split(/\s+/).reverse();
      let word;
      let line = [];
      let lineNumber = 0;
      const lineHeight = 1.1; // ems
      const y = text.attr("y");
      const dy = parseFloat(text.attr("dy")) || 0;
      let tspan = text.text(null).append("tspan")
        .attr("x", -10)
        .attr("y", y)
        .attr("dy", dy + "em");
      
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan")
            .attr("x", -10)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);
        }
      }
    });
  }
  
  // Public methods
  
  getCurrentMetric() {
    return this.currentMetric;
  }
  
  setMetric(metricName) {
    if (this.metrics.includes(metricName)) {
      this.currentMetric = metricName;
      this.drawBarChart();
      return true;
    }
    return false;
  }
}