import * as d3 from 'd3'
import loadJson from "../components/load-json"
import * as topojson from 'topojson'
import json2016 from "../assets/data/pollutionSummariesAllSites2016.json"

loadJson(process.env.PATH + "/assets/data/pollutionSummariesAllSites.json").then((data) => {
    const el = d3.select(".interactive-atom").append("div").classed(".key-sites", true);

    const timeScale = d3.scaleLinear()
        .domain([0, 31])
        .range([0, 300])

    const yScale = d3.scaleLinear()
        .domain([0, 18])
        .range([150, 0])
        .clamp(true);

    data.forEach((site, i) => {

    	const prevYearData = json2016.find(d => d.siteMeta["@SiteCode"] === site.siteMeta["@SiteCode"])

        var exceeded = false;
        site.dailyCountsCumulative = site.dailyCounts.reduce((r, a) => {
            if (!exceeded) {
                if (r.length > 0) {
                    a += r[r.length - 1];
                }
                r.push(a);

                if (r[r.length - 1] >= 18) {
                    exceeded = true;
                }
            }
            return r;
        }, []);

        exceeded = false;

        prevYearData.dailyCountsCumulative = prevYearData.dailyCounts.reduce((r, a) => {
            if (!exceeded) {
                if (r.length > 0) {
                    a += r[r.length - 1];
                }
                r.push(a);

                if (r[r.length - 1] >= 18) {
                    exceeded = true;
                }
            }
            return r;
        }, []);

        const svg = el.append("svg")
            .attr("height", 150)
            .attr("width", 300)
            .classed("line-chart", true);

        const line = d3.line()
            .y(d => yScale(d))
            .x((d, i) => timeScale(i))
            .curve(d3.curveStepAfter);

        const xAxis = d3.axisBottom(timeScale)
        	.ticks(3);

       	const yAxis = d3.axisLeft(yScale)
        	.ticks(2);

        svg.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(150px)")

        const yAxisEl = svg.append("g").classed("y-axis", true);

        yAxisEl.call(yAxis)

        svg.selectAll(".domain").remove();
        svg.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start");
        svg.selectAll(".y-axis line").attr("x", 0).attr("x2", "5")

        svg.select(".y-axis").append("line")
        	.attr("x1", 0)
        	.attr("x2", 300)
        	.attr("y1", 150)
        	.attr("y2", 150)

       	svg.select(".y-axis").append("line")
        	.attr("x1", 0)
        	.attr("x2", 300)
        	.attr("y1", 0)
        	.attr("y2", 0)
        	.classed("target-line", true)

       	if(i === 0) {
       		svg.append("text")
       			.text("Annual target")
       			.attr("x", 0)
       			.attr("y", "-6")
       			.classed("annual-target", true);
       	}

       	if(site.dailyCountsCumulative[site.dailyCountsCumulative.length - 1] >= 18) {
       		svg.append("text")
       			.text(site.dailyCountsCumulative.length + " days")
       			.attr("x", timeScale(site.dailyCountsCumulative.length - 1))
       			.attr("y", "-6")
       			.classed("days-passed", true);
       	}

        svg.append("path")
            .datum(prevYearData.dailyCountsCumulative)
            .attr("fill", "none")
            .attr("stroke", "#c5d4ea")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        svg.append("circle")
        	.attr("cx", timeScale(prevYearData.dailyCountsCumulative.length - 1))
        	.attr("cy", yScale(prevYearData.dailyCountsCumulative[prevYearData.dailyCountsCumulative.length - 1]))
        	.attr("r", "3")
        	.style("fill", "#c5d4ea");

        svg.append("path")
            .datum(site.dailyCountsCumulative)
            .attr("fill", "none")
            .attr("stroke", "#005689")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        svg.append("circle")
        	.attr("cx", timeScale(site.dailyCountsCumulative.length - 1))
        	.attr("cy", yScale(site.dailyCountsCumulative[site.dailyCountsCumulative.length - 1]))
        	.attr("r", "3")
        	.style("fill", "#005689");


       	svg.append("text")
   			.text(site.siteMeta["@SiteName"])
   			.attr("x", 0)
   			.attr("y", "-24")
   			.classed("site-name", true);
    });
});

Promise.all([
        loadJson(process.env.PATH + "/assets/data/pollutionSummaryTotalsAllSites.json"),
        loadJson(process.env.PATH + "/assets/london5.geojson"),
        // loadJson(process.env.PATH + "/assets/londonRoadsClippedGeo.json"),
        // loadJson(process.env.PATH + "/assets/parksgeojson.geojson")
    ])
    .then((data) => {
        const londonTopojson = data[1];
        const pollutionSummaries = data[0];
        const roads = data[2];
        const parks = data[3];

        const width = d3.select(".map-wrapper").node().clientWidth;
        const height = width;

        const svg = d3.select(".map-wrapper").append("svg")
            .attr("width", width)
            .attr("height", height);

        const projection = d3.geoMercator()
            .fitSize([width, height], {
                type: 'MultiPoint',
                coordinates: [
                    [-0.510375069372048, 51.286760162469804],
                    [0.33401556363443, 51.69187411610748]
                ]
            });

        const path = d3.geoPath()
            .projection(projection);

        const circleScale = d3.scaleSqrt().domain([0, 100]).range([3, 25]);

        //   svg.append("g").selectAll("path")
        //   	.data(londonTopojson.features)
        //   	.enter()
        //   	.append("path")
        // .attr("d", path)
        // .style("fill", "#f6f6f6")
        // .style("stroke", "#eaeaea")
        // .style("stroke-width", "0px");

        // svg.append("g").selectAll("path")
        //       	.data(parks.features)
        //       	.enter()
        //       	.append("path")
        //     .attr("d", path)
        //     .style("fill", "#e3efe4")
        //     .style("stroke", "none");

        // svg.append("g")
        // 	.selectAll("path")
        //       	.data(roads.features)
        //       	.enter()
        //       	.append("path")
        //     .attr("d", path)
        //     .style("fill", "none")
        //     .style("stroke", "#eaeaea")
        //     .style("stroke-width", "0.5px");

        const circles = svg.append("g")
            .selectAll("circle")
            .data(pollutionSummaries)
            .enter()
            .append("circle")
            .attr("r", d => circleScale(d.totalCount))
            .attr("cx", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[0])
            .attr("cy", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[1])
            .style("fill", d => circleColour(d.totalCount))
            .style("fill-opacity", "0.3")
            .style("stroke", d => circleColour(d.totalCount))
            .style("stroke-width", "1px");

        const labels = svg.append("g")

        circles.each(function(c) {
            if (c.totalCount > 18) {
                const labelProj = projection([c.siteMeta["@Longitude"], c.siteMeta["@Latitude"]]);

                labels.append("text")
                    .text(c.siteMeta["@SiteName"].split(" - ")[1])
                    .attr("x", labelProj[0])
                    .attr("y", labelProj[1])
                    .attr("dy", -circleScale(c.totalCount) - 6)
                    .style("text-anchor", "middle")
                    .classed("text-label-bg", true);

                labels.append("text")
                    .text(c.siteMeta["@SiteName"].split(" - ")[1])
                    .attr("x", labelProj[0])
                    .attr("y", labelProj[1])
                    .attr("dy", -circleScale(c.totalCount) - 6)
                    .style("text-anchor", "middle")
                    .classed("text-label", true);
            }
        });
    });


function circleColour(val) {
    if (val > 18) {
        return "#cc2b12"
    } else if (val > 0) {
        return "#ffce4b"
    } else {
        return "#bdbdbd"
    }
}