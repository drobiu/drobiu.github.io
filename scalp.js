
import loc from './data/locations.json' assert { type: 'json' };

var size = 170;
var dotsize = 10;
var scale_up = 2;

var xy_transform = size/2;

var svg = d3.select("#scalp_map")
    .attr("width", size * scale_up)
    .attr("height", size * scale_up);

svg.append("circle")
    .attr("id", "scalp_map")
    .attr("cx", size/2 * scale_up)
    .attr("cy", size/2 * scale_up)
    .attr("r", size/2 * scale_up)
    .attr("fill", "white")
    .attr("stroke", "black");

var tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden");

function showTooltip(label, event){
    d3.select("#tooltip")
    .text(label)
    .style("top", (event.pageY-40)+"px").style("left",(event.pageX-25)+"px");
}

for (var i = 0; i <= 31; i++){
    svg.append("circle")
    .attr("id", loc[i].label)
    .on("mousemove", function(){
        d3.select("#tooltip").style("visibility", "visible");
    })
    .on("mouseover", function(){
        showTooltip(this.id, event);
        d3.select(this).style("r", 12);
    })
    .on("mouseout", function(){
        d3.select("#tooltip").style("visibility", "hidden");
        d3.select(this).style("r", 10);
    })
    .attr("cx", (loc[i].x + 85) * scale_up)
    .attr("cy", (loc[i].y + 85) * scale_up)
    .attr("r", dotsize)
    .attr("fill", "red");
}

var rows = [];
var j = 0;
var single_values = [];
var single_names = [];

d3.csv("/data/eeg-lab-sample-export.csv", function (data) {
    rows.push(data);
    var time = Object.keys(data);
    var values = Object.values(data);
    var value_name = values[0]

    time.shift();
    values.shift();

    var data_obj = {
        time: time,
        values: values,
        value_name: value_name
    }


    single_values.push(data_obj.values[0]);
    single_names.push(data_obj.value_name);

    j++;

    //red, yellow, green, light_blue, blue
    var colors = ["#fbff00","#fbff00","#00ff1a","#00f7ff","#0400ff"]

    var domain = [-1];
    var increment = 2/(colors.length-1);
    for (var i=0; i<colors.length-2; i++){
        var previous = domain[domain.length-1];
        domain.push(previous+increment);
    }
    domain.push(1);

    if (j == 32){

        var getColor = d3.scaleLinear()
            .domain(domain)
            .range(colors);

        var max = Math.max.apply(null, single_values);
        var min = Math.min.apply(null, single_values);
        for (i = 0; i < single_values.length; i++){
            var norm = 2*((single_values[i]-min)/(max - min))-1;
            single_values[i] = norm;
            d3.select("#" + single_names[i]).attr("fill", getColor(norm));
        }
    }
});

