import state from "./state.js";

var  ranges = [0, 1000];
const width = 700;
const height = 480;

const getDataDict = data => {
    let data_dict = {};

    for (let i = 0; i < data.length; i++) {
        data_dict[data[i].name] = data[i].data;
    }

    return data_dict
}

export default function PSDChart(data) {
    margin = { top: 20, right: 30, bottom: 30, left: 60 }

    size = 100;

    svg = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    data_dict = getDataDict(data)

    data_length = data_dict['time'].length;

    f = 1/data_dict['time'][1];

    value_names = Object.keys(data_dict);

    state.channels = value_names

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

    return svg    
}

// d3.json("/data/eeg.json").then(PSDChart);

export function update(range_vals) {
    ranges = range_vals === undefined ? ranges : range_vals;

    const svg = d3.select("#chart2")

    svg.selectAll("*").remove();
    let checked = [];
    const value_names = state.channels

    for (var i = 1; i < value_names.length; i++) {
        let check = document.getElementById(value_names[i]);
        if (check.checked) {
            checked.push(value_names[i]);
        }
    }

    let xy = [];
    for (var i = 0; i < checked.length; i++) {
        ranged_data = []
        for (var j = parseInt(ranges[0]); j < Math.min(parseInt(ranges[1]), data_length); j++) {
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
