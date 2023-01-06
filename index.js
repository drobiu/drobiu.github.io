import RBF from './rbf.js';

var state = { // Object storing the state of the charts and several properties
    svg: null,
    liveUpdate: true
}
var data_dict = {}; // Object storing the data per each signal
var color_dict = { // Object storing predefined colors for each signal
    'FPz': '#808080',
    'F3': '#2e8b57',
    'Fz': '#7f0000',
    'F4': '#808000',
    'FC5': '#483d8b',
    'FC1': '#008000',
    'FC2': '#008080',
    'FC6': '#4682b4',
    'T7': '#d2691e',
    'C3': '#00008b',
    'Cz': '#32cd32',
    'C4': '#daa520',
    'T8': '#800080',
    'CP5': '#b03060',
    'CP1': '#d2b48c',
    'CP2': '#ff0000',
    'CP6': '#00ff00',
    'P7': '#9400d3',
    'P3': '#00fa9a',
    'Pz': '#dc143c',
    'P4': '#00ffff',
    'P8': '#0000ff',
    'PO7': '#adff2f',
    'PO3': '#da70d6',
    'POz': '#d8bfd8',
    'PO4': '#ff00ff',
    'PO8': '#1e90ff',
    'O1': '#fa8072',
    'Oz': '#ffff54',
    'O2': '#87ceeb',
    'EOG1': '#ff1493',
    'EOG2': '#7b68ee',
};

// Colors for the rectangle legend [blue, light_blue, green, yellow, red]
var legend_colors = ["#0400ff", "#00f7ff", "#00ff1a", "#fbff00", "#ff0000"];
const samplingFrequency = 128

// Create legend rectangle as a linear gradient
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
    .style('stop-color', function (d) { return d; })
    .attr('offset', function (d, i) {
        return 100 * (i / (legend_colors.length - 1)) + '%';
    })

legend.append('rect')
    .attr('x', 10)
    .attr('y', 10)
    .attr('width', 40)
    .attr('height', 340)
    .style('fill', 'url(#grad)');

// Legend axis title
legend.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 100)
    .attr("x", -250)
    .attr("font-family", "'Gill Sans MT', sans-serif")
    .text("Average amplitude value");

legend.append("g")
    .attr("transform", "translate(50, 10)")
    .attr("height", 340);

// Initialize tooltip that shows on electrode hover
var tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden");

function showTooltip(label, event) {
    d3.select("#tooltip")
        .html(label)
        .style("top", (event.pageY - 50) + "px").style("left", (event.pageX + 20) + "px")
        .style("background-color", "rgba(114, 114, 114, 0.55)")
        .style("border-radius", "5px")
        .style("padding", "10px 10px 10px 10px")
        .style("color", "white")
}

// Function that builds the scalp map part of our visulization
// data: The eeg data containing the values for each electrode at each time step
// locations: The x,y coordinates of each of the electrodes and their labels
function ScalpMapChart(data, locations) {
    // Find the min and max values of the entire dataset
    // used for the interpolation range and legend axis
    var dataset_max = -Number.MAX_VALUE;
    var dataset_min = Number.MAX_VALUE;
    for (let i = 0; i < data.length; i++) {
        data_dict[data[i].name] = data[i].data;
        if (data[i].name !== 'time') {
            var curr_max = Math.max(...data[i].data);
            var curr_min = Math.min(...data[i].data);
            if (curr_max > dataset_max) {
                dataset_max = curr_max;
            }
            if (curr_min < dataset_min) {
                dataset_min = curr_min;
            }
        }
    }

    // Store min/max values in state object
    state.dataset_max = dataset_max;
    state.dataset_min = dataset_min;

    var grid = d3.select("#grid")
        .append("svg");

    grid.attr("height", 344)
        .attr("width", 344);

    let mask_r = Math.pow(43, 2);
    // Build an 85x85 grid with rectangles
    // Ids of the rectangles in the form #cellx_y 
    // (with x and y being the coordinates of the square 0,0 top-left)
    for (let i = 0; i < 85; i++) {
        for (let j = 0; j < 85; j++) {
            // Mask area outside scalp outline (save on computations too)
            let dist = Math.pow((42 - i), 2) + Math.pow((42 - j), 2)
            if (dist <= mask_r) {
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

    // Scalp outline
    var map = grid.append("circle")
        .attr("id", "scalp_map")
        .attr("cx", size / 2 * scale_up)
        .attr("cy", size / 2 * scale_up)
        .attr("r", size / 2 * scale_up)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2);

    // Scalp mask
    grid.append("circle")
        .attr("cx", size / 2 * scale_up)
        .attr("cy", size / 2 * scale_up)
        .attr("r", 173)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 4);

    // Array to contain all the electrodes
    // Stores their label, (x,y) coordinates, amplitude (z) values and 
    // a boolean if the electrode is selected
    var electrodes = [];

    // Store the electrodes in the state
    state.electrodes = electrodes;

    // Locations of the electrodes from the .json file
    var loc = locations;
    var circles = [];
    const mult = 4;

    // Loop to add the electrode locations and amplitude values
    for (let i = 0; i < loc.length; i++) {
        // Adjust the xy coordinates from json to have the origin on the top-left
        electrodes.push({
            "name": loc[i].label,
            "x": loc[i].x,
            "y": loc[i].y,
            "z": data.find(x => x.name === loc[i].label).data[0],
            "checked": true,
        })
        
        // Label rectangles as #cellX_Y (X,Y coordinates on scalp)
        let id = "#cell" + loc[i].x + "_" + loc[i].y;
        d3.selectAll(id).style("fill", "black"); //White: enabled, Blacl: disabled

        // Add circles in electrode locations
        var circle = grid.append("circle")
            .attr("id", "circle_" + loc[i].label)
            .attr("cx", loc[i].x * mult + 1)
            .attr("cy", loc[i].y * mult + 1)
            .attr("r", 0)
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .on("click", () => {
                // On click disable the corresponding channel
                var checkbox = document.getElementById(loc[i].label);
                checkbox.checked = !checkbox.checked;
                d3.select("#circle_" + loc[i].label).attr("fill", checkbox.checked ? "white" : "black");

                // Update the scalp map and the EEG plots
                update(state.ranges);
                updateEEG(electrodes.filter(d => d.checked).map(d => d.name));
                var id = loc[i].label;
                // Show appropriate name and value on tooltip
                var msg = "";
                if (checkbox.checked) {
                    msg = id + "<br>" + "Value: " + state.electrodes.find(x => x.name === id).z.toFixed(3);
                    state.svg.selectChild("#" + id + "_line").style("filter", "url(#glow)")
                        .attr("stroke-width", 3);
                } else {
                    msg = id;
                }
                showTooltip(msg, event);
            });

        circles.push(circle);
    }
    // Initialize brushed at left-most point
    update([0, 4000]);
    state.ranges = [0, 4000];
    // Compute the RBF diffusion
    update_z(electrodes);

    grid.on("mouseover", (event) => {
        const [xm, ym] = d3.pointer(event);

        circles.forEach((circle) => {
            var dist = Math.pow((xm - circle.attr("cx")), 2) + Math.pow((ym - circle.attr("cy")), 2);
            // Resize circle depending on the distance from pointer
            circle.attr("r", Math.min(Math.max(20 - dist / 500, 0), 10));
            circle.on("mouseover", function () {
                d3.select("#tooltip").style("visibility", "visible");
                var id = this.id.slice(7);
                // Show the tooltip on hover
                var msg = "";
                if (document.getElementById(id).checked) {
                    msg = id + "<br>" + "Value: " + state.electrodes.find(x => x.name === id).z.toFixed(3);
                } else {
                    msg = id;
                }
                // Show channel tooltip and highlight the psd estimate
                d3.select("#tooltip").attr("class", "animate_in");
                showTooltip(msg, event);
                state.svg.selectChild("#" + id + "_line").style("filter", "url(#glow)")
                    .attr("stroke-width", 3);
            });
            circle.on("mouseout", function () {
                // Remove tooltip and highlighting
                d3.select("#tooltip").attr("class", "animate_out");
                state.svg.selectChild("#" + this.id.slice(7) + "_line").style("filter", null)
                    .attr("stroke-width", 1, 5);
            });

        })
    });

    // Scale down circles
    grid.on("pointerleave", () => {
        circles.forEach((circle) => {
            circle.attr("r", 0);
        })
    });
}

// Function that updates the interpolation on the scalp map based on a new selection
function update_z(electrodes) {
    var points_xy = [];
    var z_values = [];

    for (let i = 0; i < electrodes.length; i++) {
        if (electrodes[i].checked) {
            points_xy.push([electrodes[i].x, electrodes[i].y]);
            z_values.push(electrodes[i].z);
        }
    }

    var rbf = RBF(points_xy, z_values); // Radial basis intepolation of the amplitute values

    var interpolated_z = [];
    var interpolated_xy = [];

    // Store the interpolated amplitute values for every location in the 85x85 grid
    for (let i = 0; i < 85; i++) {
        for (let j = 0; j < 85; j++) {
            interpolated_z.push(rbf([i, j]));
            interpolated_xy.push([i, j]);
        }
    }
    // Generate an appropriate color based on the interpolated values
    interpolateRGB(interpolated_z, interpolated_xy);
}

// Function to interpolateRGB values between [min,max] for selected amplitude values
function interpolateRGB(value_arr, coord_arr) {
    //blue, light_blue, green, yellow, red
    var colors = ["#ff0000", "#fbff00", "#00ff1a", "#00f7ff", "#0400ff"]

    // Decrease min/max values since the selection is averaged
    // Higher min/max reesults in a lower details with color contrast (only 5 are used)
    var max = state.dataset_max / 10;
    var min = state.dataset_min / 10;

    //Build domain values based on the min/max values
    var increment = (Math.abs(min) + Math.abs(max)) / (colors.length - 1);
    var domain = [min, min + increment, 0, increment, max];

    // Retrieving colors based on their value in the specified domain
    var getColor = d3.scaleLinear()
        .domain(domain)
        .range(colors);

    //Assign interpolatedRGB values to every sqaure in the grid
    for (var i = 0; i < value_arr.length; i++) {
        let id = "#cell" + coord_arr[i][0] + "_" + coord_arr[i][1];
        d3.selectAll(id).attr("fill", getColor(value_arr[i]));
    }
    //Update legend values according to the input amplitude values
    var scale = d3.scaleLinear()
        .domain(domain.reverse())
        .range([0, 100]);

    // Fill up legend ticks
    var ticks = scale.ticks();
    ticks.push(-40, -50);

    var y_axis = d3.axisRight()
        .scale(scale)
        .tickFormat(d3.format(",.0f"))
        .tickValues(ticks);

    legend.select("g").call(y_axis).attr("font-family", "'Gill Sans MT', sans-serif");
    legend.select("g").call(y_axis).select(".domain").attr("d", "M 6 0 H 0 V 340 H 6"); //Extend legend axis line
}

// Function that creates the PSD plot element of our solution
function PSDChart(data) {
    state.width = 700;
    state.height = 480;
    state.psds = [];
    state.psd_clicked = false;
    state.psd_info = {};
    state.maxval = 0;

    var margin = { top: 20, right: 30, bottom: 30, left: 60 };
    state.margin = margin;

    var svg = d3.select("#chart2")
        .append("svg")
        .attr("width", state.width + margin.left + margin.right)
        .attr("height", state.height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    state.legend = document.createElement('div');
    document.getElementById("chart2").appendChild(state.legend);

    state.svg = svg;

    var data_dict = {};

    for (var i = 0; i < data.length; i++) {
        data_dict[data[i].name] = data[i].data;
    }

    state.data_length = data_dict['time'].length;

    state.f = 128;

    const value_names = Object.keys(data_dict);

    state.value_names = value_names;

    // Create and populate checkboxes for storing active channel data
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

// Function that updates the state of the solution based on the current selection
// range_vals: selected brushed time interval
function update(range_vals) {

    if (range_vals === undefined) {
        range_vals = state.ranges;
    }
    // Get value ranges to calculate correct ranges for PSD
    state.ranges = range_vals;
    range_vals = range_vals.map(r => parseInt((r / 1000) * samplingFrequency));

    // Reset the psd graph
    state.svg.selectAll("*:not(line)").remove();

    var checked = [];
    for (var i = 1; i < state.value_names.length; i++) {
        var check = document.getElementById(state.value_names[i]);
        var electrode = state.electrodes.find(x => x.name === state.value_names[i]);
        var id = "#cell" + electrode.x + "_" + electrode.y; // Used to update the state of the electrodes
        if (check.checked) {
            checked.push(state.value_names[i]);
            d3.select(id).style("fill", "white"); // electrode is checked, fill in white
            state.electrodes.find(x => x.name === state.value_names[i]).checked = true;
        } else {
            d3.select(id).style("fill", "black"); // electrode is unchecked, fill in black
            state.electrodes.find(x => x.name === state.value_names[i]).checked = false;
        }
    }
    state.psds = {};
    var xy = [];
    for (var i = 0; i < checked.length; i++) { // Loop over selected electrodes
        var ranged_data = []
        var sum = 0;
        for (var j = parseInt(range_vals[0]); j < Math.min(parseInt(range_vals[1]), state.data_length); j++) {
            var curr = parseFloat(data_dict[checked[i]][j]);
            ranged_data.push(curr);
            sum = sum + curr;
        }
        // Update electrode amplitudes based on the average of the brushed selection for each one
        state.electrodes.find(x => x.name === checked[i]).z = sum / ranged_data.length
        try {
            // Get PSD estimates using the Welch method
            var psd = bci.welch(ranged_data, state.f);
            state.psds[checked[i]] = psd;
            state.maxval = Math.max(state.maxval, d3.max(psd.estimates));
            xy = plot(psd.frequencies, psd.estimates, state.svg, checked[i]);
        } catch (error) {
            // If the estimates cannot be calculated, display a message
            state.svg.append("text")
                .attr("y", state.height / 2)
                .attr("x", state.width / 2)
                .text("Could not compute PSD estimates. Select a larger portion of data.")
                .attr("font-family", "'Gill Sans MT', sans-serif")
                .style("text-anchor", "middle");
        }
    }

    addScale(xy[0], xy[1], state.svg, 'Power spectral densities');
    // Update the scalp map interpolation
    update_z(state.electrodes);
}

// Function that adds the scale on the PSD plot
function addScale(x, y, svg, title) {
    svg.append("g")
        .attr("transform", "translate(0," + state.height + ")")
        .call(d3.axisBottom(x)).attr("font-family", "'Gill Sans MT', sans-serif")

    // y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -30)
        .attr("x", -state.height / 2)
        .attr("font-family", "'Gill Sans MT', sans-serif")
        .text("dB");

    // x-axis label
    svg.append("text")
        .attr("y", state.height + 30)
        .attr("x", state.width / 2)
        .attr("font-family", "'Gill Sans MT', sans-serif")
        .text("Hz");

    svg.append("g")
        .call(d3.axisLeft(y)).attr("font-family", "'Gill Sans MT', sans-serif");

    svg.append("text")
        .attr("x", (state.width / 2))
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .attr("font-family", "'Gill Sans MT', sans-serif")
        .text(title);
}

function plot(xs, ys, svg, line_id) {
    var x = d3.scaleLinear()
        .domain(d3.extent(xs))
        .range([0, state.width]);

    state.psd_x = x;
    // Initialized here for speed; can be initialized elsewhere for more speed
    state.psd_inv_x = d3.scaleLinear()
        .domain([0, state.width])
        .range(d3.extent(xs));

    state.psd_xs = xs;

    // Add Y axis
    var y = d3.scaleLog()
        .domain([1 / 10000, state.maxval])
        .range([state.height, 0]);

    var data = [];
    for (var i = 0; i < xs.length; i++) {
        data.push({ t: xs[i], d: ys[i] });
    }

    //Container for the gradients
    var defs = svg.append("defs");

    //Filter for the outside glow effect line highlights
    var filter = defs.append("filter")
        .attr("id", "glow");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "4.5")
        .attr("result", "coloredBlur");
    var feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    // Add the plot lines
    svg.append("path")
        .datum(data)
        .attr("id", line_id + "_line")
        .attr("fill", "none")
        .attr("stroke", color_dict[line_id])
        .attr("stroke-width", 0.5)
        .attr("d", d3.line()
            .x(d => x(d.t))
            .y(d => y(d.d))
        ).on("mouseenter", function () {
            d3.select(this).style("filter", "url(#glow)") //Add the glow effect on line hover
                .attr("stroke-width", 3);
            d3.select("#circle_" + line_id).attr("r", 10); //Show the respective electrode on the scalp map
        })
        .on("mouseleave", function () {
            d3.select(this).style("filter", null) //Remove the glow effect on mouse leave
                .attr("stroke-width", 0.5);
            d3.select("#circle_" + line_id).attr("r", 0); //Hide the electrode mark on mouse leave
        })

    return [x, y];
}

function addBrush(xScale, svg, width, height, margin) {
    // BRUSHY BRUSHY
    // Initializes the brush

    const brush_size = 4000

    function brushed(event) {
        // Called when brush changes
        const selection = event.selection;
        if (selection === null) {
            console.log(`no selection`);
        } else {
            // Get the newest brush location
            var selectionRange = selection.map(xScale.invert).map(d => parseFloat(d) - brush_size);
            // Disabling live update, only shows the effect of the selection on mouse-release
            if (state.liveUpdate || (!state.live && event.type === 'end')) {
                if (state.svg) {
                    // Update PSD and scalp map based on selection
                    update(selectionRange)
                }
            }
        }
    }

    function beforebrushstarted(event) {
        let x = xScale;
        const dx = x(brush_size) - x(0); // Use a fixed width when recentering.

        const [[cx]] = d3.pointers(event);
        // Get locations pointer_x - brush_size / 2 and pointer_x + brush_size / 2 
        var [x0, x1] = [cx - dx / 2, cx + dx / 2];
        // If brush is too far left, bring it to beginning of the axis
        if (x0 - margin.left <= 0) {
            [x0, x1] = [margin.left, margin.left + dx];
        }
        const [X0, X1] = x.range();

        d3.select(this.parentNode)
            .call(brush.move, x1 > X1 ? [X1 - dx, X1]
                : x0 < X0 ? [X0, X0 + dx]
                    : [x0, x1]);
    }

    const brush = d3.brushX()
        .extent([[margin.left, margin.top], [width + margin.right + margin.left, height + margin.top]])
        .on("start brush end", brushed);

    // Set brush to the initial position
    svg.append("g")
        .call(brush)
        .call(brush.move, [5000, 5000 + brush_size].map(xScale))
        .call(g => g.select(".overlay")
            .datum({ type: "selection" })
            .on("mousedown touchstart", beforebrushstarted));

}

// Get data groupped as a map with name => [(time, data)...]
const getGrouped = data => new Map(data.columns
    .filter(c => c !== 'Time')
    .map(c => [c,
        data.map(v => (
            { 'time': v['Time'], 'value': v[c] }))]))

// Get extents per signal
const getExtents = data => d3.extent(data.columns
    .filter(c => c !== 'Time')
    .map(c => [c,
        data.map(v => v[c])]).flatMap(e => d3.extent(e[1].map(d => parseFloat(d) / 5))))

// Initialize the eeg plots for each electrode in the data
const ChannelsChart = (data, eventData) => {
    const grouped = getGrouped(data)
    const extents = getExtents(data)

    const time = d3.map(data, d => d.Time)

    var sampler = fc.largestTriangleThreeBucket()
        .x(function (d) { return d.time; })
        .y(function (d) { return d.value; })
        .bucketSize(10);


    for (let [key, value] of grouped) {
        grouped.set(key, sampler(value));
    }

    // Run the sampler
    state.eeg = {}

    // Dimensions:
    const height = 800;
    const width = 1200;

    const margin = {
        top: 60,
        left: 50,
        right: 50,
        bottom: 50
    }

    const padding = 0;
    const doublePadding = padding * 2;

    state.eeg.height = height;
    state.eeg.padding = padding;
    state.eeg.margin = margin;

    const plotHeight = (height - doublePadding) / grouped.size - padding;
    const plotWidth = width - padding * 2;

    //Scales:
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.Time))
        .range([0, plotWidth + margin.right]);
    state.xScale = xScale;
    // const y_extent = d3.extent(data, d => d["Cz"])[1]

    // Extent is now the max extent of all signals
    const yScale = d3.scaleLinear()
        .domain(extents)
        .range([plotHeight, 0]);
    state.yScale = yScale;

    const svg = d3.select("#chart1")
        .append("svg")
        .attr("width", margin.left + width + margin.right)
        .attr("height", margin.top + height + margin.bottom + (padding * grouped.size));

    // y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 15)
        .attr("x", -height / 2 - 100)
        .text("Electrode Labels")
        .attr("font-family", "'Gill Sans MT', sans-serif");

    // x-axis label
    svg.append("text")
        .attr("y", height + 100)
        .attr("x", width / 2)
        .attr("font-family", "'Gill Sans MT', sans-serif")
        .text("Time(ms)");

    // Title
    svg.append("text")
        .attr("y", 50)
        .attr("x", width / 2)
        .attr("font-family", "'Gill Sans MT', sans-serif")
        .text("EEG plots per electrode");

    // Plot events
    eventData.forEach(r => {
        // latency is the sample number, not the time
        const eventStart = parseInt(r.latency / samplingFrequency) * 1000
        const eventLength = 200
        const rectWidth = xScale(eventLength)
        const fillColor = r.type == 'square' ? 'Khaki' : 'DarkSeaGreen'

        svg
            .append("rect")
            .attr("width", rectWidth)
            .attr("height", height)
            .attr("transform", `translate(${xScale(eventStart) + margin.left}, ${margin.top})`)
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
        .attr("fill", "none")

    // Plot axes 
    // Lower x axis
    svg.append("g")
        .attr("transform", "translate(" + [margin.left, grouped.size * plotHeight + margin.top] + ")")
        .call(d3.axisBottom(xScale)
            // .ticks(4)
        ).attr("font-family", "'Gill Sans MT', sans-serif");

    // y axis
    const activeNames = d3.map(plots.data(), d => d[0])
    plots.each((d, i) => svg.append("g").attr('class', `yaxis`)
        .attr("transform", "translate(" + [margin.left, i * plotHeight + margin.top] + ")")
        .call(d3.axisLeft(yScale)
            .ticks(1).tickFormat(activeNames[i])
        ).attr("font-family", "'Gill Sans MT', sans-serif")
        .selectAll("text").style("stroke", color_dict[activeNames[i]]));

    addBrush(xScale, svg, width, height, margin);

    state.plots = plots;
    state.eeg.svg = svg;

    return svg.node()
}

function updateEEG(active) {
    // Update the EEG chart based on active signals
    // Calculate new plot height of each signal
    const plotHeight = (state.eeg.height - state.eeg.padding * 2) / active.length - state.eeg.padding;

    state.yScale.range([plotHeight, 0]);

    // Reset all axes
    state.eeg.svg.selectAll(".yaxis").remove();

    // Add new axes
    active.forEach((n, i) => state.eeg.svg.append("g").attr('class', `yaxis`)
        .attr("transform", "translate(" + [state.eeg.margin.left, i * plotHeight + state.eeg.margin.top] + ")")
        .call(d3.axisLeft(state.yScale)
            .ticks(1).tickFormat(n)
        ).attr("font-family", "'Gill Sans MT', sans-serif")
        .selectAll("text").style("stroke", color_dict[n]));

    // Remove disabled plots
    state.plots.selectAll("path").filter(c => !active.includes(c[0])).attr('d', '')

    // Update chart by adding active plots
    state.plots.selectAll("path").filter(c => active.includes(c[0]))
        .attr("d", function (d) {
            return d3.line()
                .x(d => state.xScale(d.time))
                .y(d => state.yScale(d.value))
                (d[1])
        });

    state.plots.filter(c => active.includes(c[0]))
        .attr("transform", function (d, i) {
            return "translate(" + [state.eeg.padding, i * (state.eeg.padding * 2 + plotHeight) + state.eeg.padding] + ")";
        })
}

// Toggles the live update functionality
function toggleLiveUpdate() {
    var checkBox = document.getElementById("liveUpdate");

    state.liveUpdate = checkBox.checked == true ? true : false;
}

const formatDataForPSD = (eegData) => eegData.columns
    .map(c => ({
        name: c == 'Time' ? 'time' : c,
        data: eegData.map(v => parseFloat(v[c]))
    }))

// Unimplemented embedding for an ERP plot
const formatERPData = (eegData, eventData) => {
    // Formats data for the events ERP events
    const erpTimeIdx = [...Array(128).keys()]

    const template = { "Time": 0, "FPz": 0, "EOG1": 0, "F3": 0, "Fz": 0, "F4": 0, "EOG2": 0, "FC5": 0, "FC1": 0, "FC2": 0, "FC6": 0, "T7": 0, "C3": 0, "C4": 0, "Cz": 0, "T8": 0, "CP5": 0, "CP1": 0, "CP2": 0, "CP6": 0, "P7": 0, "P3": 0, "Pz": 0, "P4": 0, "P8": 0, "PO7": 0, "PO3": 0, "POz": 0, "PO4": 0, "PO8": 0, "O1": 0, "Oz": 0, "O2": 0 }

    let erpObjectAcc = structuredClone(template)

    const erpData =
        erpTimeIdx
            .map(erpTimeId =>
                eventData
                    .filter(e => e.type == `square`)
                    .map(e => parseInt(e.latency))
                    .map(latencyId => eegData.slice(latencyId - 13, latencyId + 115))
                    .map(e => e.map((eegForErpEvent, i) => ({ 'index': i, data: eegForErpEvent })))
                    .flat()
                    .filter(i => i.index == erpTimeId)
            )
            .map(i => {
                erpObjectAcc = structuredClone(template)

                return i.reduce((accumulator, currentValue) => {
                    Object.entries(erpObjectAcc)
                        .forEach(e => accumulator[e[0]] = (parseFloat(accumulator[e[0]]) + parseFloat(currentValue.data[e[0]])) / 2)

                    return accumulator
                }, erpObjectAcc)
            }
            )
    return erpData
}

// Load datasets and tun code
d3.csv("/data/eeg-lab-example-yes-transpose-all.csv").then(eegData =>
    d3.csv('data/events-all.csv').then(eventData => {
        ChannelsChart(eegData, eventData)

        const eegDataPSDFormat = formatDataForPSD(eegData)
        PSDChart(eegDataPSDFormat);

        d3.json("/data/locations.json").then(locations =>
            ScalpMapChart(eegDataPSDFormat, locations)
        );

    })
)

window.onload = function () {
    document.getElementById("liveUpdate").onclick = toggleLiveUpdate
}