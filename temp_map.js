var data_dict = {};
import RBF from './rbf.js';

var slider = document.getElementById("time_slider");
var time_label = document.getElementById("time_label");

var legend_colors = ["#ff0000","#fbff00","#00ff1a","#00f7ff","#0400ff"];
var state = { svg: null }

//Create legend rectangle as a linear gradient
var legend = d3.select('#legend')
  .append('svg')
  .attr('width', 200)
  .attr('height', 360);

var grad = legend.append('defs')
  .append('linearGradient')
  .attr('id', 'grad')
  .attr('x1', '0%')
  .attr('x2', '0%')
  .attr('y1', '0%')
  .attr('y2', '100%');

grad.selectAll('stop')
  .data(legend_colors)
  .enter()
  .append('stop')
  .style('stop-color', function(d){ return d; })
  .attr('offset', function(d,i){
    return 100 * (i / (legend_colors.length - 1)) + '%';
  })

legend.append('rect')
  .attr('x', 10)
  .attr('y', 10)
  .attr('width', 40)
  .attr('height', 340)
  .style('fill', 'url(#grad)');

legend.append("g")
  .attr("transform", "translate(50, 10)")
  .attr("height", 340);

var data = d3.json("/data/eeg.json").then(data => {

  PSDChart(data);

  for (let i = 0; i < data.length; i++) {
      data_dict[data[i].name] = data[i].data;
  }
  var data_length = data_dict['time'].length;
  var value_names = Object.keys(data_dict);

  var grid = d3.select("#grid")
    .append("svg");
  
  grid.attr("height", 344)
    .attr("width", 344);

  let mask_r = Math.pow(43,2);
  //Build an 85x85 grid with rectangles
  //Ids of the rectangles in the form #cellx_y 
  //(with x and y being the coordinates of the square 0,0 top-left)
  for (let i = 0; i < 85; i++){
    for (let j = 0; j < 85; j++){
      //Mask area outside scalp outline (save on computations too)
      let dist = Math.pow((42-i), 2) + Math.pow((42-j) ,2)
      if (dist <= mask_r){
        let name = "cell" + i + "_" + j;
        grid.append("rect")
        .attr("id", name)
        .attr("width", 4)
        .attr("height", 4)
        .attr("x", i * 4)
        .attr("y", j * 4);
      }
    }
  }

  var size = 170;
  var scale_up = 2;
  
  //Scalp outline
  var map = grid.append("circle")
    .attr("id", "scalp_map")
    .attr("cx", size/2 * scale_up)
    .attr("cy", size/2 * scale_up)
    .attr("r", size/2 * scale_up)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 2);
  
  //Scalp mask
  grid.append("circle")
  .attr("cx", size/2 * scale_up)
  .attr("cy", size/2 * scale_up)
  .attr("r", 173)
  .attr("fill", "none")
  .attr("stroke", "white")
  .attr("stroke-width", 4);

  var points_xy = []; //Store the [x,y] coords
  state.scalp_xy = points_xy;
  var z = []; //store the amplitude values

  var loc = d3.json('/data/locations.json').then(loc => {
    var circles = [];
    const mult = 4;

    //Loop to add the electrode locations and amplitude values
    for (let i = 0; i < loc.length; i++){
      //Adjust the xy coordinates from json to have the origin on the top-left
      loc[i].x = Math.ceil((loc[i].x + 85)*0.5-1); 
      loc[i].y = Math.ceil((loc[i].y + 85)*0.5-1);

      points_xy.push([loc[i].x, loc[i].y]);
      z.push(data_dict[loc[i].label][0]); //display values at time 0

      let id = "#cell" + loc[i].x + "_" + loc[i].y;
      d3.selectAll(id).style("fill", "black"); //Arbitrary color to distinguish the electrodes

      // Add circles
      var circle = grid.append("circle")
        .attr("id", "circle_" + loc[i].label)
        .attr("cx", loc[i].x * mult + 1)
        .attr("cy", loc[i].y * mult + 1)
        .attr("r", 0)
        .attr("fill", "green")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .on("click", () => {
          var checkbox = document.getElementById(loc[i].label);
          checkbox.checked = !checkbox.checked;
          d3.select("#circle_" + loc[i].label).attr("fill", checkbox.checked ? "green" : "red");
          update();
        });
        
      circles.push(circle);
    }
    update_z(points_xy, z);

    grid.on("mouseover", (event) => {   
      const [xm, ym] = d3.pointer(event);

      circles.forEach((circle) => {
        var dist = Math.pow((xm-circle.attr("cx")), 2) + Math.pow((ym-circle.attr("cy")), 2);

        circle
          .attr("r", Math.min(Math.max(20 - dist/500, 0), 10));
      })
    });

    grid.on("pointerleave", () => {   
      circles.forEach((circle) => {
        circle.attr("r", 0);
      })
    });
    
    //Update intepolation on slider click
    slider.onchange = function(event) {
      z = [];
      for (let i = 0; i < loc.length; i++) {
        z.push(data_dict[loc[i].label][slider.value]);
      }
      update_z(points_xy, z);
      time_label.innerHTML = data_dict['time'][slider.value] + "ms";
    }

    //Update interpolation on slider scroll
    slider.onwheel = function(event) {
      z = [];
      if (event.deltaY < 0){
        slider.value = parseInt(slider.value) + 1;
      } else {
        slider.value = parseInt(slider.value) - 1;
      }
      for (let i = 0; i < loc.length; i++) {
        z.push(data_dict[loc[i].label][slider.value]);
      }
      update_z(points_xy, z);
      time_label.innerHTML = data_dict['time'][slider.value] + "ms";
    }
    
  });

});


function update_z(points_xy, z_values) {
  // console.log(z_values);
  var rbf = RBF(points_xy, z_values); //Radial basis intepolation of the amplitute values
  
  var interpolated_z = [];
  var interpolated_xy = [];

  //Store the interpolated amplitute values for every location in the 85x85 grid
  for (let i = 0; i < 85; i++){
    for (let j = 0; j < 85; j++){
      interpolated_z.push(rbf([i,j]));
      interpolated_xy.push([i,j]);
    }
  }
  interpolateRGB(interpolated_z, interpolated_xy);
}

//function to interpolateRGB values between [min,max] for selected amplitude values
function interpolateRGB(value_arr, coord_arr){
  //red, yellow, green, light_blue, blue
  var colors = ["#ff0000","#fbff00","#00ff1a","#00f7ff","#0400ff"]

  var max = Math.max.apply(null, value_arr);
  var min = Math.min.apply(null, value_arr);

  //Build domain values based on the received value_arr
  var domain = [min];
  var increment = (Math.abs(min) + Math.abs(max))/(colors.length-1);
  for (var i=0; i<colors.length-2; i++){
      var previous = domain[domain.length-1];
      domain.push(previous+increment);
  }
  domain.push(max);

  var getColor = d3.scaleLinear()
      .domain(domain)
      .range(colors);

  //Assign interpolatedRGB values to every sqaure in the grid
  for (i = 0; i < value_arr.length; i++){
    let id = "#cell" + coord_arr[i][0] + "_" + coord_arr[i][1];
    d3.selectAll(id).attr("fill", getColor(value_arr[i]));
  }
  
  //Update legend values according to the input amplitude values
  var scale = d3.scaleLinear()
                .domain(domain)
                .range([0, 85]);

  var y_axis = d3.axisRight()
                .scale(scale)
                .tickValues(domain)
                .tickFormat(d3.format(",.0f"));

  legend.select("g").call(y_axis);
  legend.select("g").call(y_axis).select(".domain").attr("d", "M 6 0 H 0 V 340 H 6");
}

function PSDChart(data) {
    state.width = 700;
    state.height = 480;
    state.psds = [];
    state.psd_clicked = false;
    state.psd_info = {};

    const margin = { top: 20, right: 30, bottom: 30, left: 60 }
    state.margin = margin;

    const size = 100;

    var svg = d3.select("#chart2")
        .append("svg")
        .attr("width", state.width + margin.left + margin.right)
        .attr("height", state.height + margin.top + margin.bottom)
        .on("pointerenter", pointerentered)
        .on("pointerleave", pointerleft)
        .on("pointermove", (event) => {state.psd_clicked ? null : pointermoved(event)})
        .on("click", clicked)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
    
    state.legend = document.createElement('div');
    document.getElementById("chart2").appendChild(state.legend);
    
    state.line = svg.append("line")
        .attr("x1", 10)
        .attr("y1", 0)
        .attr("x2", 10)
        .attr("y2", state.height - state.margin.top - state.margin.bottom)
        .style("stroke-width", 2)
        .style("stroke", "red")
        .style("fill", "none");

    state.svg = svg

    var data_dict = {};

    for (var i = 0; i < data.length; i++) {
        data_dict[data[i].name] = data[i].data;
    }

    state.data_length = data_dict['time'].length;

    state.f = 1 / data_dict['time'][1];

    const value_names = Object.keys(data_dict);

    state.value_names = value_names;

    var select = document.getElementById('selector');

    for (var i = 1; i < value_names.length; i++) {
        var div = document.createElement('div');
        var checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.setAttribute('id', value_names[i]);
        checkbox.setAttribute('name', value_names[i]);
        checkbox.setAttribute('onclick', 'update()');
        var label = document.createElement('label');
        label.setAttribute('for', value_names[i]);
        label.innerHTML = value_names[i];
        div.appendChild(checkbox);
        div.appendChild(label);
        select.appendChild(div);

        // Enable all plots by default
        checkbox.checked = true;
        
    }
}

function update(range_vals) {
    state.svg.selectAll("*:not(line)").remove();
    var checked = [];

    for (var i = 1; i < state.value_names.length; i++) {
        var check = document.getElementById(state.value_names[i]);
        if (check.checked) {  
            checked.push(state.value_names[i]);
        }
    }

    if (range_vals === undefined) {
        range_vals = state.ranges;
    }

    state.ranges = range_vals;
    state.psds = {};

    var xy = [];
    for (var i = 0; i < checked.length; i++) {
        var ranged_data = []
        for (var j = parseInt(range_vals[0]); j < Math.min(parseInt(range_vals[1]), state.data_length); j++) {
            ranged_data.push(parseFloat(data_dict[checked[i]][j]));
        }
        var psd = bci.welch(ranged_data, state.f);
        state.psds[checked[i]] = psd;
        xy = plot(psd.frequencies, psd.estimates, state.svg)
    }

    addScale(xy[0], xy[1], state.svg, 'Power spectral densities');
}

function addScale(x, y, svg, title) {
    svg.append("g")
        .attr("transform", "translate(0," + state.height + ")")
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", (state.width / 2))
        .attr("y", (state.margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);
}

function plot(xs, ys, svg) {
    var x = d3.scaleLinear()
        .domain(d3.extent(xs))
        .range([0, state.width]);

    state.psd_x = x;

    // Initialized here for speed; can be initialized elsewhere for more speed
    state.psd_inv_x = d3.scaleLinear()
      .domain([0, state.width])
      .range(d3.extent(xs));

    state.psd_xs = xs;

    // TODO: Would be better if we fix the axis domain/range
    // to the max(eeg) value
    // Add Y axis
    var y = d3.scaleLog()
        .domain(d3.extent(ys))
        .range([state.height, 0]);

    var data = [];
    for (var i = 0; i < xs.length; i++) {
        data.push({ t: xs[i], d: ys[i] });
    }

    // Add the line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.t))
            .y(d => y(d.d))
        )

    return [x, y];
}

function addBrush(xScale, svg, width, height, margin) {
    // BRUSHY BRUSHY

    function brushed(event) {
        const selection = event.selection;
        if (selection === null) {
            console.log(`no selection`);
        } else {
            console.log(selection.map(xScale.invert))
            if (state.svg)
                update(selection.map(xScale.invert))
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

function pointerentered() {
  state.line.style("stroke", "red");
}

function pointerleft() {
  if (!state.psd_clicked)
    state.line.style("stroke", "none");
}

function pointermoved(event) {
  const [xm, ym] = d3.pointer(event)
  const psd_dx = state.psd_xs[1]
  var x_in_psd_domain = Math.max(0, state.psd_inv_x(xm - state.margin.left));
  var rounded = (Math.round(x_in_psd_domain * (1/psd_dx)) * psd_dx);

  var data = {};

  Object.entries(state.psds).forEach(entry => {
    const [key, value] = entry;
    data[key] = value.estimates[parseInt(rounded/psd_dx)];
  })

  var z = [];

  state.value_names.slice(1).forEach((name) => {
    if (Object.keys(data).includes(name)) {
      z.push(state.psds[name].estimates[parseInt(rounded/psd_dx)]);
    } else {
      z.push(0);
    }
  })

  state.z = z;

  // debug for now
  // state.legend.innerHTML = rounded + ":" + Object.entries(data);

  state.psd_info = data;

  // update_z(state.scalp_xy, state.z);

  state.line
    .attr("x1", state.psd_x(rounded))
    .attr("x2", state.psd_x(rounded));
}

function clicked() {
  state.psd_clicked = !state.psd_clicked;
  if (state.psd_clicked)
    update_z(state.scalp_xy, state.z);
}

const getGrouped = data => new Map(data.columns
    .filter(c => c !== 'Time')
    .map(c => [c,
        data.map(v => (
            { 'time': v['Time'], 'value': v[c] }))]))

const ChannelsChart = (data, eventData) => {
    const grouped = getGrouped(data)

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
    addBrush(xScale, svg, width, height, margin)

    return svg.node()
}


d3.csv("/data/eeg-lab-example-yes-transpose-min.csv").then(eegData =>
    d3.csv('data/eeg-events-3.csv').then(eventData => {
        ChannelsChart(eegData, eventData)
    }
    )
)