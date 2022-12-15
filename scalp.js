
import loc from './data/locations.json' assert { type: 'json' };

console.log(loc);


var margin = {top: 10, right: 30, bottom: 30, left: 60}

var size = 170;
var dotsize = 4;
var scale_up = 2;

var xy_transform = size/2;

var svg = d3.select("body")
    .append("svg")
    .attr("width", size * scale_up)
    .attr("height", size * scale_up);

svg.append("circle")
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
    .style("top", (event.pageY-35)+"px").style("left",(event.pageX-20)+"px");
}

for (var i = 0; i <= 31; i++){
    svg.append("circle")
    .attr("id", loc[i].label)
    .on("mousemove", function(){
        d3.select("#tooltip").style("visibility", "visible");
    })
    .on("mouseover", function(){
        showTooltip(this.id, event);
        d3.select(this).style("r", 6);
    })
    .on("mouseout", function(){
        d3.select("#tooltip").style("visibility", "hidden");
        d3.select(this).style("r", 4);
    })
    .attr("cx", (loc[i].x + 85) * scale_up)
    .attr("cy", (loc[i].y + 85) * scale_up)
    .attr("r", dotsize)
    .attr("fill", "red");
}