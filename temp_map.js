var data_dict = {};
import RBF from './rbf.js';

var data = d3.json("/data/eeg.json").then(data => {

  for (let i = 0; i < data.length; i++) {
      data_dict[data[i].name] = data[i].data;
  }
  var data_length = data_dict['time'].length;
  var value_names = Object.keys(data_dict);
  var slider = document.getElementById("time_slider");
  var time_label = document.getElementById("time_label");
  
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
      update_z(points_xy, z);

      let id = "#cell" + loc[i].x + "_" + loc[i].y;
      d3.selectAll(id).style("fill", "black"); //Arbitrary color to distinguish the electrodes
    }
    
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
  normRGB(interpolated_z, interpolated_xy);
}

//function to normalize values between [-1,1] and assign RGB values
function normRGB(value_arr, coord_arr){
  //red, yellow, green, light_blue, blue
  var colors = ["#ff0000","#fbff00","#00ff1a","#00f7ff","#0400ff"]

  //Normalize the interpolated amplitute values to be matched to one of the colors
  // var domain = [-1];
  // var increment = 2/(colors.length-1);
  // for (var i=0; i<colors.length-2; i++){
  //     var previous = domain[domain.length-1];
  //     domain.push(previous+increment);
  // }
  // domain.push(1);

  // var getColor = d3.scaleLinear()
  //     .domain(domain)
  //     .range(colors);

  // var max = Math.max.apply(null, value_arr);
  // var min = Math.min.apply(null, value_arr);
  // for (i = 0; i < value_arr.length; i++){
  //     var norm = 2*((value_arr[i]-min)/(max - min))-1;
  //     value_arr[i] = norm;
  //     let id = "#cell" + coord_arr[i][0] + "_" + coord_arr[i][1];
  //     d3.selectAll(id).attr("fill", getColor(norm));
  // }

  var max = Math.max.apply(null, value_arr);
  var min = Math.min.apply(null, value_arr);

  var domain = [min];
  var increment = (Math.abs(min) + Math.abs(max))/(colors.length-1);
  for (var i=0; i<colors.length-2; i++){
      var previous = domain[domain.length-1];
      domain.push(previous+increment);
  }
  domain.push(max);
  console.log(domain);

  var getColor = d3.scaleLinear()
      .domain(domain)
      .range(colors);

  for (i = 0; i < value_arr.length; i++){
    let id = "#cell" + coord_arr[i][0] + "_" + coord_arr[i][1];
    d3.selectAll(id).attr("fill", getColor(value_arr[i]));
  }
}


