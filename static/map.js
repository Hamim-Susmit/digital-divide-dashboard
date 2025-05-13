// map.js - Handles the choropleth map visualization
class ChoroplethMap {
  constructor(config) {
    this.svgId = config.svgId || 'map-svg';
    this.tooltipClass = config.tooltipClass || 'tooltip';
    this.legendId = config.legendId || 'legend';
    this.metricDropdownId = config.metricDropdownId || 'metric';
    this.dataUrl = config.dataUrl || '/static/D_T_with_state_id.csv';
    this.topoUrl = config.topoUrl || '/static/states-albers-10m.json';
    this.onStateSelected = config.onStateSelected || function() {};
    this.onMultipleStatesSelected = config.onMultipleStatesSelected || function() {};

    this.svg = d3.select(`#${this.svgId}`);
    this.tooltip = d3.select(`.${this.tooltipClass}`);
    this.legendContainer = d3.select(`#${this.legendId}`);
    this.metricDropdown = d3.select(`#${this.metricDropdownId}`);
    
    this.width = +this.svg.attr("width");
    this.height = +this.svg.attr("height");
    this.path = d3.geoPath();
    this.color = d3.scaleQuantize().range(d3.schemeBlues[9]);
    
    this.currentMetric = null;
    this.selectedState = null;
    this.selectedStates = new Set(); // For multi-selection
    this.dataByFips = new Map();
    this.metrics = [];
    this.states = [];
    
    this.brushEnabled = false;
    this.brush = null;
    
    this.initializeMap();
  }
  
  initializeMap() {
    // Create main SVG group for the map
    this.g = this.svg.append("g");
    
    // Initialize zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        this.g.attr("transform", event.transform);
      });
    
    this.svg.call(this.zoom);
    
    // Add buttons container
    const buttonContainer = d3.select("body")
      .append("div")
      .attr("class", "button-container")
      .style("margin", "10px 0")
      .style("display", "flex")
      .style("gap", "10px");
      
    // Add reset zoom button
    buttonContainer.append("button")
      .text("Reset Zoom")
      .on("click", () => {
        this.svg.transition().duration(750).call(this.zoom.transform, d3.zoomIdentity);
      });
      
    // Add toggle brush button
    buttonContainer.append("button")
      .text("Toggle Selection Mode")
      .attr("id", "toggle-brush")
      .on("click", () => this.toggleBrush());
      
    // Add clear selection button
    buttonContainer.append("button")
      .text("Clear Selection")
      .attr("id", "clear-selection")
      .on("click", () => this.clearSelection());
      
    // Load data
    this.loadData();
  }
  
  loadData() {
    Promise.all([
      d3.json(this.topoUrl),
      d3.csv(this.dataUrl)
    ]).then(([topoData, csvData]) => {
      this.processData(topoData, csvData);
      this.setupMetricDropdown();
      this.updateMap();
    }).catch(error => console.error("Error loading data:", error));
  }
  
  processData(topoData, csvData) {
    const fipsMap = {
      'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
      'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
      'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
      'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
      'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
      'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
      'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
      'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
      'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
      'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
    };
    
    csvData.forEach(d => {
      const fips = fipsMap[d.state_id];
      if (fips) this.dataByFips.set(fips, d);
    });
    
    // Filter out non-data columns
    this.metrics = csvData.columns.filter(c => !["State", "state_id", "Geo_ID"].includes(c));
    this.currentMetric = this.metrics[0];
    
    // Process states topology
    this.states = topojson.feature(topoData, topoData.objects.states).features;
  }
  
  setupMetricDropdown() {
    this.metricDropdown.selectAll("option")
      .data(this.metrics)
      .join("option")
      .text(d => d)
      .attr("value", d => d);
      
    this.metricDropdown.on("change", () => {
      this.currentMetric = this.metricDropdown.node().value;
      this.updateMap();
      
      // If a state is already selected, update it
      if (this.selectedState) {
        const stateData = this.dataByFips.get(this.selectedState);
        if (stateData) {
          this.onStateSelected(stateData, this.currentMetric);
        }
      }
      
      // If multiple states are selected, update them
      if (this.selectedStates.size > 0) {
        const selectedStatesData = Array.from(this.selectedStates)
          .map(id => this.dataByFips.get(id))
          .filter(Boolean); // Remove any undefined results
        
        this.onMultipleStatesSelected(selectedStatesData, this.currentMetric);
      }
    });
  }
  
  updateMap() {
    const values = this.states.map(d => {
      const val = this.dataByFips.get(d.id);
      return val ? +val[this.currentMetric] : null;
    }).filter(v => v !== null);
    
    this.color.domain(d3.extent(values));
    
    const paths = this.g.selectAll("path.state-path")
      .data(this.states, d => d.id);
      
    // Enter new paths
    paths.enter()
      .append("path")
      .attr("class", "state-path")
      .attr("d", this.path)
      .attr("fill", "#ccc")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", (event, d) => this.handleMouseOver(event, d))
      .on("mouseout", () => this.tooltip.style("display", "none"))
      .on("click", (event, d) => this.handleClick(event, d))
      .merge(paths)
      .transition()
      .duration(1000)
      .attr("fill", d => {
        const val = this.dataByFips.get(d.id);
        return val ? this.color(+val[this.currentMetric]) : "#ccc";
      });
      
    paths.exit().remove();
    this.drawLegend();
  }
  
  handleMouseOver(event, d) {
    const row = this.dataByFips.get(d.id);
    if (!row) return;
    
    let tooltipHtml = `<strong>${row.State}</strong>`;
    tooltipHtml += `<br><strong>${this.currentMetric}:</strong> ${row[this.currentMetric]}`;
    
    this.tooltip.style("display", "block")
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY + 10}px`)
      .html(tooltipHtml);
  }
  
  handleClick(event, d) {
    if (this.brushEnabled) {
      // In brush mode, toggle the state selection
      const stateId = d.id;
      
      if (this.selectedStates.has(stateId)) {
        this.selectedStates.delete(stateId);
      } else {
        this.selectedStates.add(stateId);
      }
      
      // Update visual indicators
      this.updateSelectedStatesHighlight();
      
      // Notify listeners
      const selectedStatesData = Array.from(this.selectedStates)
        .map(id => this.dataByFips.get(id))
        .filter(Boolean);
        
      this.onMultipleStatesSelected(selectedStatesData, this.currentMetric);
      
      // Stop event propagation
      event.stopPropagation();
    } else {
      // In normal mode, set single selected state
      this.selectedState = d.id;
      
      // Clear any previous multi-selection
      this.selectedStates.clear();
      
      // Update highlighting
      this.g.selectAll("path.state-path")
        .classed("selected-state", p => p.id === d.id)
        .attr("stroke-width", p => p.id === d.id ? 2 : 0.5)
        .attr("stroke", p => p.id === d.id ? "#000" : "#fff");
        
      const stateData = this.dataByFips.get(d.id);
      
      // Call the callback function with the state data
      if (stateData) {
        this.onStateSelected(stateData, this.currentMetric);
      }
    }
  }
  
  drawLegend() {
    const legendWidth = 300;
    const legendHeight = 10;
    const [min, max] = this.color.domain();
    
    const canvas = document.createElement("canvas");
    canvas.width = legendWidth;
    canvas.height = legendHeight;
    const context = canvas.getContext("2d");
    
    for (let i = 0; i < legendWidth; ++i) {
      context.fillStyle = this.color(min + (max - min) * i / legendWidth);
      context.fillRect(i, 0, 1, legendHeight);
    }
    
    this.legendContainer.html("");
    this.legendContainer.append(() => canvas);
    this.legendContainer.append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("width", `${legendWidth}px`)
      .html(`<span>${min.toFixed(2)}</span><span>${max.toFixed(2)}</span>`);
  }
  
  // Brush functionality
  initBrush() {
    // Remove any existing brush
    this.svg.select(".brush").remove();
    
    // Create a new brush
    this.brush = d3.brush()
      .extent([[0, 0], [this.width, this.height]])
      .on("brush", event => this.brushed(event))
      .on("end", event => this.brushEnded(event));
    
    // Add the brush to the SVG as the topmost element
    this.brushGroup = this.svg.append("g")
      .attr("class", "brush")
      .call(this.brush);
      
    // Make the overlay capture all events
    this.brushGroup.select('.overlay')
      .style('pointer-events', 'all');
      
    // Ensure paths can still be clicked through the brush
    this.g.selectAll("path.state-path")
      .style("pointer-events", "all");
  }
  
  brushed(event) {
    // Preview selection during brushing
    if (!event.selection) return;
    
    const [[x0, y0], [x1, y1]] = event.selection;
    
    // Get the current transform to adjust for zoom
    const transform = d3.zoomTransform(this.svg.node());
    
    // Update the visual feedback
    this.g.selectAll("path.state-path")
      .classed("brush-preview", function(d) {
        // Get the center point of the path
        const centroid = d3.geoPath().centroid(d);
        const cx = centroid[0];
        const cy = centroid[1];
        
        // Apply the current transform to get the actual screen coordinates
        const tx = transform.x + cx * transform.k;
        const ty = transform.y + cy * transform.k;
        
        // Check if the transformed center is in the brush selection
        return tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1;
      });
  }
  
  brushEnded(event) {
    if (!event.selection) {
      // If the brush was just clicked (not dragged), clear the preview class
      this.g.selectAll(".brush-preview").classed("brush-preview", false);
      return;
    }
    
    const [[x0, y0], [x1, y1]] = event.selection;
    
    // Get the current transform to adjust for zoom
    const transform = d3.zoomTransform(this.svg.node());
    
    // Find the states whose centroids are within the selection
    this.g.selectAll("path.state-path").each((d, i, nodes) => {
      const path = nodes[i];
      const centroid = d3.geoPath().centroid(d);
      
      // Apply the current transform
      const tx = transform.x + centroid[0] * transform.k;
      const ty = transform.y + centroid[1] * transform.k;
      
      // Check if the state is in the brushed area
      if (tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1) {
        this.selectedStates.add(d.id);
      }
    });
    
    // Clear the temporary preview class
    this.g.selectAll(".brush-preview").classed("brush-preview", false);
    
    // Update the visual highlight
    this.updateSelectedStatesHighlight();
    
    // Notify listeners
    const selectedStatesData = Array.from(this.selectedStates)
      .map(id => this.dataByFips.get(id))
      .filter(Boolean);
      
    this.onMultipleStatesSelected(selectedStatesData, this.currentMetric);
    
    // Clear the brush selection
    this.brushGroup.call(this.brush.move, null);
  }
  
  toggleBrush() {
    this.brushEnabled = !this.brushEnabled;
    
    if (this.brushEnabled) {
      // Entering multi-select mode
      this.initBrush();
      d3.select("#toggle-brush").text("Exit Selection Mode")
        .classed("active-button", true);
      
      // Disable zoom
      this.svg.on(".zoom", null);
      
      // Clear current selection
      this.selectedState = null;
      
      // Apply visual styling to show we're in selection mode
      this.svg.classed("selection-mode", true);
    } else {
      // Exiting multi-select mode
      this.svg.select(".brush").remove();
      d3.select("#toggle-brush").text("Toggle Selection Mode")
        .classed("active-button", false);
      
      // Re-enable zoom
      this.svg.call(this.zoom);
      
      // Clear the selection
      this.clearSelection();
      
      // Remove selection mode styling
      this.svg.classed("selection-mode", false);
    }
  }
  
  clearSelection() {
    // Clear all selected states
    this.selectedStates.clear();
    this.selectedState = null;
    
    // Remove visual highlights
    this.updateSelectedStatesHighlight();
    
    // Notify listeners with empty selection
    this.onMultipleStatesSelected([], this.currentMetric);
  }
  
  updateSelectedStatesHighlight() {
    this.g.selectAll("path.state-path")
      .classed("selected-state", d => this.selectedStates.has(d.id))
      .attr("stroke-width", d => this.selectedStates.has(d.id) ? 2 : 0.5)
      .attr("stroke", d => this.selectedStates.has(d.id) ? "#ff4500" : "#fff")
      .attr("fill-opacity", d => this.selectedStates.has(d.id) ? 1 : 0.7);
  }
  
  // Public methods
  setMetric(metricName) {
    if (this.metrics.includes(metricName)) {
      this.currentMetric = metricName;
      this.metricDropdown.property("value", metricName);
      this.updateMap();
      return true;
    }
    return false;
  }
  
  getCurrentMetric() {
    return this.currentMetric;
  }
  
  getSelectedState() {
    if (!this.selectedState) return null;
    return this.dataByFips.get(this.selectedState);
  }
  
  getSelectedStates() {
    return Array.from(this.selectedStates)
      .map(id => this.dataByFips.get(id))
      .filter(Boolean);
  }
  
  getAllMetrics() {
    return [...this.metrics];
  }
  
  getAllStates() {
    return Array.from(this.dataByFips.values());
  }
}