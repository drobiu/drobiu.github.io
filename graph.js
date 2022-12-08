// var d3 = require("d3");

console.log("Hi!");
width = 720;
height = 480;

var margin = {top: 10, right: 30, bottom: 30, left: 60}

var size = 100;
svgs = [];
for (i = 0; i < 31; i++) {
    var svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
    svgs.push(svg);
}

rows = [];
j = 0;

d3.csv("/data/eeg-lab-sample-export.csv", function (data) {
    console.log(j);
    rows.push(data);
    time = Object.keys(data);
    values = Object.values(data);
    value_name = values[0]

    time.shift()
    values.shift()

    data_obj = {
        time: time,
        values: values
    }

    d_row = []
    for (i = 0; i < 5000; i++) {
        d_row.push(
            {
                time: time[i],
                values: values[i]
            }
        );
    }

    // console.log(d3.extent(d_row, function(d) { return d.time; }));

    var x = d3.scaleTime()
        .domain(d3.extent(d_row, function (d) { return d.time; }))
        .range([0, width]);
    svgs[j].append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    extent = d3.extent(d_row, function (d) { return d.values; });
    range = extent[1] - extent[0];

    // Add Y axis
    var y = d3.scaleLinear()
        .domain(extent)
        .range([extent[1]/range*height/2, -extent[0]/range*height/2]);
    svgs[j].append("g")
        .call(d3.axisLeft(y));

    // Add the line
    svgs[j].append("path")
        .datum(d_row)
        .attr("fill", "none")
        .attr("stroke", "rgb(" + (100 + 17 * j) % 255 + "," + (200 + 13 * j) % 255 + "," + (0 + 37 * j) % 255 + ")")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.time))
            .y(d => y(d.values))
        )

    svgs[j].append("text")
        .attr("x", (width / 2))             
        .attr("y", 20 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px")  
        .text(value_name);

    // console.log(x(values[0]))


    j++;
});

// console.log(rows);
