data = d3.json("/data/eeg.json").then(data => {
    console.log("Hi!");
    width = 720;
    height = 480;

    margin = { top: 20, right: 30, bottom: 30, left: 60 }

    size = 100;

    svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    data_dict = {};

    for (i = 0; i < data.length; i++) {
        data_dict[data[i].name] = data[i].data;
    }

    data_length = data_dict['time'].length;

    console.log(data_length)
    f = 1/data_dict['time'][1];

    value_names = Object.keys(data_dict);

    select = document.getElementById('selector');
    console.log(select)

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
    }

    legend = document.createElement('legend');
    legend.innerHTML = 'Select range and offset.';
    select.appendChild(legend);

    ranges = ['Range', 'Offset'];
    minima = [1000, 0];
    maxima = [data_length-1000, data_length];

    for (var i = 0; i < ranges.length; i++) {
        var div = document.createElement('div');
        var range = document.createElement('input');
        range.setAttribute('type', 'range');
        range.setAttribute('id', ranges[i]);
        range.setAttribute('min', minima[i]);
        range.setAttribute('max', maxima[i]);
        range.setAttribute('name', ranges[i]);
        range.setAttribute('onclick', 'update()');
        var label = document.createElement('label');
        label.setAttribute('for', ranges[i]);
        label.innerHTML = ranges[i];
        div.appendChild(range);
        div.appendChild(label);
        select.appendChild(div);
    }
});

function update() {
    svg.selectAll("*").remove();
    checked = [];

    for (var i = 1; i < value_names.length; i++) {
        check = document.getElementById(value_names[i]);
        if (check.checked) {
            checked.push(value_names[i]);
        }
    }

    range_vals = [];

    for (var i = 0; i < ranges.length; i++) {
        range = document.getElementById(ranges[i]);
        range_vals.push(parseInt(range.value));
    }

    console.log(range_vals)

    xy = [];
    for (var i = 0; i < checked.length; i++) {
        ranged_data = []
        for (var j = range_vals[1]; j < Math.min(range_vals[0] + range_vals[1], data_length); j++) {
            ranged_data.push(parseFloat(data_dict[checked[i]][j]));
        }
        console.log(ranged_data)
        psd = bci.welch(ranged_data, f);
        console.log(psd)
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

    // Add Y axis
    var y = d3.scaleLog()
        .domain(extent)
        .range([height, 0]);

    var data = [];
    for (var i = 0; i < xs.length; i++) {
        data.push({t: xs[i], d: ys[i]});
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