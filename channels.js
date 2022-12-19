d3.csv("/data/eeg-lab-example-yes-transpose-min.csv").then(data => {
  const grouped = new Map(data.columns
    .filter(c => c !== 'Time')
    .map(c => [c,
      data.map(v => (
        { 'time': v['Time'], 'value': v[c] }))]))

  // Dimensions:
  const height = 800;
  const width = 700;
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

  const svg = d3.select("#chart1")
    .append("svg")
    .attr("width", margin.left + width + margin.right)
    .attr("height", margin.top + height + margin.bottom + (padding * grouped.size));

  const g = svg.append("g")
    .attr("transform", "translate(" + [margin.left, margin.top] + ")");

  //Scales:
  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Time))
    .range([0, plotWidth]);

  const y_extent = d3.extent(data, d => d["Cz"])[1]
  //TODO: change this extent
  const yScale = d3.scaleLinear()
    // .domain(
    //     d3.extent(data, d => d["Cz"])
    //   )
    .domain(
      [
        -y_extent,
        y_extent
      ]
    )
    .range([plotHeight, 0]);

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

  // BRUSHY BRUSHY

  function brushed(event) {
    const selection = event.selection;
    if (selection === null) {
      console.log(`no selection`);

      // circle.attr("stroke", null);
    } else {
      console.log(selection.map(xScale.invert))
      update(selection.map(xScale.invert));

      // const [x0, x1] = selection.map(x.invert);
      // circle.attr("stroke", d => x0 <= d && d <= x1 ? "red" : null);
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

})