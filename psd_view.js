var state = { svg: null }

function PSDChart(data) {
    width = 700;
    height = 480;
    ranges = [0, 1000];

    margin = { top: 20, right: 30, bottom: 30, left: 60 }

    size = 100;

    svg = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    state.svg = svg

    data_dict = {};

    for (i = 0; i < data.length; i++) {
        data_dict[data[i].name] = data[i].data;
    }

    data_length = data_dict['time'].length;

    f = 1 / data_dict['time'][1];

    value_names = Object.keys(data_dict);

    select = document.getElementById('selector');

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

        // DELETE LATER
        if (i == 1) {
            checkbox.checked = true;
        }
    }
}

function update(range_vals) {
    svg.selectAll("*").remove();
    checked = [];

    for (var i = 1; i < value_names.length; i++) {
        check = document.getElementById(value_names[i]);
        if (check.checked) {
            checked.push(value_names[i]);
        }
    }

    if (range_vals === undefined) {
        range_vals = ranges;
    }

    ranges = range_vals;

    xy = [];
    for (var i = 0; i < checked.length; i++) {
        ranged_data = []
        for (var j = parseInt(range_vals[0]); j < Math.min(parseInt(range_vals[1]), data_length); j++) {
            ranged_data.push(parseFloat(data_dict[checked[i]][j]));
        }
        psd = bci.welch(ranged_data, f);
        xy = plot(psd.frequencies, psd.estimates, svg)
    }

    addScale(xy[0], xy[1], svg, 'Power spectral densities');
}

function addScale(x, y, svg, title) {
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);
}

function plot(xs, ys, svg) {
    var x = d3.scaleLinear()
        .domain(d3.extent(xs))
        .range([0, width]);

    extent = d3.extent(ys);

    // TODO: Would be better if we fix the axis domain/range
    // to the max(eeg) value
    // Add Y axis
    var y = d3.scaleLog()
        .domain(extent)
        .range([height, 0]);

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
        d3.json("/data/eeg.json").then(PSDChart);
    }
    )
)