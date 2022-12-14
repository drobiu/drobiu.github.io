// var d3 = require("d3");

console.log("Hi!");
width = 720;
height = 480;

var margin = {top: 20, right: 30, bottom: 30, left: 60}

var size = 100;
svgs = [];
for (i = 0; i < 60; i++) {
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

    vls = []
    tms = []

    d_row = []
    for (i = 0; i < 1000; i++) {
        d_row.push(
            {
                time: parseFloat(time[i]),
                values: parseFloat(values[i])
            }
        );
        vls.push(values[i]);
        tms.push(time[i])
    }

    console.log(d_row)
    console.log(d3.extent(d_row, d => d.time))

    psd = bci.welch(vls, 1/time[1]);
    console.log(psd);

    p_row = [];


    for (i = 0; i < psd.estimates.length; i++) {
        p_row.push(
            {
                time: parseFloat(psd.frequencies[i]),
                values: Math.log(parseFloat(psd.estimates[i]))
            }
        );
    }
    console.log(p_row)

    // console.log(d3.extent(d_row, function(d) { return d.time; }));

    plot(d_row, svgs, 2*j, value_name);
    plot(p_row, svgs, 1+2*j, value_name + " PSD");

    // console.log(x(values[0]))


    j++;
});

// console.log(rows);
function plot(data, svgs, index, title) {
    var x = d3.scaleLinear()
        .domain(d3.extent(data, function (d) { return d.time; }))
        .range([0, width]);
    svgs[index].append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    extent = d3.extent(data, function (d) { return d.values; });
    range = extent[1] - extent[0];

    // Add Y axis
    console.log(extent)
    var y = d3.scaleLinear()
        .domain(extent)
        .range([height, 10]);
    svgs[index].append("g")
        .call(d3.axisLeft(y));

    // Add the line
    svgs[index].append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "rgb(" + (100 + 17 * j) % 255 + "," + (200 + 13 * j) % 255 + "," + (0 + 157 * j) % 255 + ")")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => x(d.time))
            .y(d => y(d.values))
        )

    svgs[index].append("text")
        .attr("x", (width / 2))             
        .attr("y", (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px")  
        .text(title);
}