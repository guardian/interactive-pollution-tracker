import templateHTML from "./src/templates/main.html!text"
import rp from "request-promise"
import Mustache from "mustache"
// import pollutionSummariesAllSites from "./src/assets/data/pollutionSummariesAllSites.json!text"
import D3Node from 'd3-node'
import * as d3 from 'd3'
import fs from 'fs'
import mkdirp from 'mkdirp'

export async function render() {
    const data = JSON.parse(fs.readFileSync("./src/assets/data/pollutionSummariesAllSites-2017.json"));

    const d3n = new D3Node()

    const svg = d3n.createSVG(620, 600).append('g');

    const xScale = d3.scaleLinear()
        .domain([0, 365])
        .range([0, 620])

    const yScale = d3.scaleLinear()
        .domain([0, 10])
        .range([100, 0]);

    const line = d3.line()
        .x(function(d, i) { return xScale(i); })
        .y(function(d) { return yScale(d); })
        .curve(d3.curveStepAfter);

    const path = line;

    data.forEach((datum, i) => {
        svg.append("path")
            .attr("d", path(datum.dailyCounts))
            .style("fill", "#005689")
            .style("fill-opacity", "0.2")
            .style("stroke", "#005689")
            .style("stroke-width", "1")
            .attr("data-foo", "foo")
            .attr("transform", `translate(0 ${i*60})`)
    });

    // console.log(data[0].data)
    // console.log(path(data[0].data))
// ${d3n.svgString()}
    
    mkdirp('./.build/', function (err) {
        if (err) console.error(err)
        else fs.writeFileSync("./.build/lastUpdated.txt", new Date(), "utf-8");
    });

    return `<div class="map-meta">
	    		<div class="num-exceeded">0</div>
	    		<div class="buttons">
	    			<button class="year-button" id="switch-2016">2016</button><button class="year-button active" id="switch-2017">2017 so far</button>
	    		</div>
	    		<div class="key">
	    			<div class="key-item key-item--1">Within hourly limits</div>
	    			<div class="key-item key-item--2">Hourly limit exceeded</div>
	    			<div class="key-item key-item--3">Annual limit exceeded</div>
                    <div class="key-item key-item--text">Circle size is proportional to the number of times the hourly limit has been exceeded</div>
	    		</div>
    		</div>
    		<div class="map-wrapper">
    			<div class="base-map">
    				<img src="<%= path %>/assets/baseMap-03.png">
    			</div>
    		</div>`;
}