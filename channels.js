d3.csv("/eeg-lab-example-yes-transpose-min.csv").then(data => {
  // const data = d3.range(25).map(i => ({
  //   bib: Math.floor(i / 5) + 1,
  //   ratio: -1 + Math.random() * 5,
  //   run: [1, 2, 3, 4, 5][i % 5],
  //   run: [1, 2, 3, 4, 5][i % 5],
  //   name: ['metric1', 'metric2', 'metric3', 'metric4', 'metric5'][Math.floor(i / 5)]
  // }));

  // const grouped = d3.group(data,d=>d.bib);

  // console.log(data)

  // let grouped = d3.group(eeg1, d => d.name && d.name !== 'time')

  let grouped = new Map(data.columns
    .filter(c => c !== 'Time')
    .map(c => [c,
        data.map(v => (
            { 'time': v['Time'], 'value': v[c]}))]))

  // Dimensions:
  const height = 800;
  const width = 700;
  const margin = {
  top: 10,
  left: 50,
  right: 50,
  bottom: 50
  }
  const padding = 30;
  const doublePadding = padding * 2;

  const plotHeight = (height-doublePadding)/grouped.size - padding;
  const plotWidth = width-padding*2;

  // const plotWidth = (width-padding)/grouped.size - padding;
  // const plotHeight = height-padding*2;

  const svg = d3.select("#chart1")
  .append("svg")
  .attr("width", margin.left+width+margin.right)
  .attr("height", margin.top+height+margin.bottom+(padding*grouped.size));

  const g = svg.append("g")
  .attr("transform","translate("+[margin.left,margin.top]+")");

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
  .range([plotHeight,0]);

  // Place plots:
  const plots = g.selectAll(null)
  .data(grouped)
  .enter()
  .append("g")
  .attr("transform", function(d,i) {
  return "translate("+[padding,i*(doublePadding+plotHeight)+padding]+")";
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
  .attr("d", function(d) {
  return d3.line()
          .x(d=>xScale(d.time))
          .y(d=>yScale(d.value))
          (d[1])
  })
  .attr("stroke", "#333")
  .attr("stroke-width", 1)
  .attr("fill","none")

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
  .attr("transform","translate("+[0,plotHeight]+")")
  .call(d3.axisBottom(xScale).ticks(4));

  plots.append("g")
  .attr("transform","translate("+[-padding,0]+")")
  .call(d3.axisLeft(yScale))
})