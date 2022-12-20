// const d3 = d3

function addBrush(xScale, svg, width, height, margin) {
  // BRUSHY BRUSHY

  function brushed(event) {
    const selection = event.selection;
    if (selection === null) {
      console.log(`no selection`);
    } else {
      console.log(selection.map(xScale.invert))
      // update(selection.map(xScale.invert));
    }
  }

  const brush_size = 500

  function beforebrushstarted(event) {
    //TODO: this not global
    let x = xScale;
    const dx = x(brush_size) - x(0); // Use a fixed width when recentering.

    // const dx = brush_size
    // const dx = brush_size
    const [[cx]] = d3.pointers(event);
    const [x0, x1] = [cx - dx / 2, cx + dx / 2];
    const [X0, X1] = x.range();

    d3.select(this.parentNode)
      .call(brush.move, x1 > X1 ? [X1 - dx, X1]
        : x0 < X0 ? [X0, X0 + dx]
          : [x0, x1]);
  }

  const brush = d3.brushX()
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on("start brush end", brushed);

  svg.append("g")
    .call(brush)
    .call(brush.move, [1000, 1000 + brush_size].map(xScale))
    .call(g => g.select(".overlay")
      .datum({ type: "selection" })
      .on("mousedown touchstart", beforebrushstarted));

}


const ChannelsChart = (data, eventData) => {
  const grouped = new Map(data.columns
    .filter(c => c !== 'Time')
    .map(c => [c,
      data.map(v => (
        { 'time': v['Time'], 'value': v[c] }))]))

  // Dimensions:
  const height = 800;
  const width = 700;
  // TODO: we'll need the left one at least, for
  // the y axis
  // const margin = {
  //   top: 10,
  //   left: 50,
  //   right: 50,
  //   bottom: 50
  // }
  const margin = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
  // const padding = 30;
  const padding = 0;
  const doublePadding = padding * 2;

  const plotHeight = (height - doublePadding) / grouped.size - padding;
  const plotWidth = width - padding * 2;

  // const plotWidth = (width-padding)/grouped.size - padding;
  // const plotHeight = height-padding*2;

    //Scales:
    const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Time))
    .range([0, plotWidth]);
  
    const y_extent = d3.extent(data, d => d["Cz"])[1]
    //TODO: change this extent
    const yScale = d3.scaleLinear()
      .domain(
        [
          -y_extent,
          y_extent
        ]
      )
      .range([plotHeight, 0]);
  
  const svg = d3.select("#chart1")
    .append("svg")
    .attr("width", margin.left + width + margin.right)
    .attr("height", margin.top + height + margin.bottom + (padding * grouped.size));

  // Plot events
  eventData.forEach(r => {
    // latency is the sample number, not the time
    const samplingFrequency = 128
    const eventStart = parseInt(r.latency / samplingFrequency) * 1000
    const eventLength = 200
    const rectWidth = xScale(eventLength) - margin.left
    const fillColor = r.type == 'square' ? 'Khaki' : 'DarkSeaGreen'

    svg
      .append("rect")
      .attr("width", rectWidth)
      .attr("height", height)
      .attr("transform", `translate(${xScale(eventStart)}, 0)`)
      .attr("fill", fillColor)
  })
    
  
    const g = svg.append("g")
    .attr("transform", "translate(" + [margin.left, margin.top] + ")");


    
  // Place plots:
  const plots = g.selectAll(null)
    .data(grouped)
    .enter()
    .append("g")
    .attr("transform", function (d, i) {
      return "translate(" + [padding, i * (doublePadding + plotHeight) + padding] + ")";
    })

  // const tooltip = d3.select('svg')
  // .append('g')
  // .style('visibility', 'hidden');

  // tooltip.append('rect')  
  // .attr('width', 100)
  // .attr('height', 50)
  // .style('fill', '#fff')
  // .style('stroke', '#000')

  // tooltip.append('text')
  // .attr('x', 20)
  // .attr('y', 20)

  // //Optional plot background:
  // plots.append("rect")
  // .attr("width",plotWidth)
  // .attr("height",plotHeight)
  // .attr("fill","#ddd")
  // .on("mouseenter", (e, d) => {
  // tooltip.style('visibility', 'visible');
  // tooltip.select('text').text(d[0]);  
  // })
  // .on("mouseleave", () => tooltip.style('visibility', 'hidden'))
  // .on("mousemove", e => tooltip
  // .attr('transform', `translate(${e.clientX},${e.clientY})`))


  // // Plot actual data
  // plots.selectAll(null)
  // .data(d=>d[1])
  // .enter()
  // .append("circle")
  // .attr("r", 4)
  // .attr("cy", d=>yScale(d.value))
  // .attr("cx", d=>xScale(d.time))

  // Plot line if needed:
  plots.append("path")
    .attr("d", function (d) {
      return d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.value))
        (d[1])
    })
    .attr("stroke", "#000000")
    // .attr("stroke-width", 1)
    .attr("fill", "none")

  // // Plot names if needed:
  // plots.append("text")
  // .attr("x", plotWidth/2)
  // .attr("y", -10)
  // .text(function(d) {
  // return d[1][0].name;
  // })
  // .attr("text-anchor","middle");

  // Plot axes     
  plots.append("g")
    .attr("transform", "translate(" + [0, plotHeight] + ")")
    .call(d3.axisBottom(xScale)
      // .ticks(4)
    );

  plots.append("g")
    .attr("transform", "translate(" + [-padding, 0] + ")")
    .call(d3.axisLeft(yScale))

  addBrush(xScale, svg, width, height, margin)

  return svg.node()

}

d3.csv("/data/eeg-lab-example-yes-transpose-min.csv").then(eegData => 
  d3.csv('data/eeg-events-3.csv').then(eventData =>
    ChannelsChart(eegData, eventData)
  )
)