// var d3 = require("d3");

console.log("Hi!");
width = 720;
height = 480;

var size = 100;
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

rows = [];
i = 0;

d3.csv("/data/eeg-lab-sample-export.csv", function (data) {
    if (i == 0) {
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
        for (i = 0; i < 1000; i++) {
            d_row.push(
                {
                    time: time[i],
                    values: values[i]
                }
            );
        }

        console.log(d3.extent(d_row, function(d) { return d.time; }));

        var x = d3.scaleTime()
            .domain(d3.extent(d_row, function(d) { return d.time; }))
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        // Add Y axis
        var y = d3.scaleLinear()
            .domain([d3.min(d_row, d => d.values),
            d3.max(d_row, d => d.values)])
            .range([height, 0]);
        svg.append("g")
            .call(d3.axisLeft(y));

        // Add the line
        svg.append("path")
            .datum(d_row)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(d => x(d.time))
                .y(d => y(d.values)-height)
            )
        
        // console.log(x(values[0]))

    }
    i++;
});

console.log(rows);
