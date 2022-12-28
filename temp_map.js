var data_dict = {};
import RBF from './rbf.js';

var slider = document.getElementById("time_slider");
var time_label = document.getElementById("time_label");

var legend_colors = ["#ff0000","#fbff00","#00ff1a","#00f7ff","#0400ff"];

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
  grid.append("circle")
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
  var z = []; //store the amplitute values

  var loc = d3.json('/data/locations.json').then(loc => {
    //Loop to add the electrode locations and amplitude values
    for (let i = 0; i < loc.length; i++){
      //Adjust the xy coordinates from json to have the origin on the top-left
      loc[i].x = Math.ceil((loc[i].x + 85)*0.5-1); 
      loc[i].y = Math.ceil((loc[i].y + 85)*0.5-1);

      points_xy.push([loc[i].x, loc[i].y]);
      z.push(data_dict[loc[i].label][0]); //display values at time 0

      let id = "#cell" + loc[i].x + "_" + loc[i].y;
      d3.selectAll(id).style("fill", "black"); //Arbitrary color to distinguish the electrodes
    }    
    update_z(points_xy, z);
    
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


// TODO: points_xy never change in this class, right?
// so no need to pass them every
function update_z(points_xy, z_values) {
  console.log(z_values);
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

