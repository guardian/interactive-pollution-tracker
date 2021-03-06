import loadJson from "../components/load-json"
import * as topojson from 'topojson'

import * as d3Array from "d3-array"
import * as d3Geo from "d3-geo"
import * as d3Select from "d3-selection"
import * as d3Scale from "d3-scale"
import * as d3Shape from "d3-shape"
import * as d3Transition from "d3-transition"
import * as d3Axis from "d3-axis"

const d3 = Object.assign({}, d3Array, d3Geo, d3Select, d3Scale, d3Shape, d3Transition, d3Axis);

console.log(d3);

Promise.all([
        loadJson(process.env.PATH + "/assets/data/pollutionSummariesAllSites-2018.json"),
        loadJson(process.env.PATH + "/assets/data/pollutionSummariesAllSites-2017.json"),
        loadJson("https://interactive.guim.co.uk/docsdata-test/1tEp3Lz1zgr6eiZUixZM_SmmZ_zIWV8MPZVtqwjCQEHw.json")
    ])
    .then((allData) => {
        const data = allData[0];
        const prevData = allData[1];
        const text = allData[2].sheets.Sheet1;

        const el = d3.select("#interactive-slot-1").append("div").classed("key-sites", true);
        const clientWidth = el.node().clientWidth;

        const width = clientWidth < 620 ? clientWidth : 300;
        const height = clientWidth < 620 ? 75 : 100;

        const timeScale = d3.scaleLinear()
            .domain([0, 31])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, 18])
            .range([height, 0])
            .clamp(true);

        data.forEach((site, i) => {

            const prevYearData = prevData.find(d => d.siteMeta["@SiteCode"] === site.siteMeta["@SiteCode"])

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
            }, []).slice(0, 31);

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
            }, []).slice(0, 31);

            const wrapper = el.append("div")
                .classed("line-wrapper", true);

            wrapper.append("h3")
                .html(site.siteMeta["@SiteName"])
                .classed("line-header", true);

            // wrapper.append("div")
            //     .html(text.filter(d => d.code === site.siteMeta["@SiteCode"])[0].text)
            //     .classed("line-desc", true)

            const svg = wrapper
                .append("svg")
                .attr("height", height)
                .attr("width", width)
                .classed("line-chart", true);

            const line = d3.line()
                .y(d => yScale(d))
                .x((d, i) => timeScale(i))
                .curve(d3.curveStepAfter);

            const xAxis = d3.axisBottom(timeScale)
                .tickValues([0, 30]);

            const yAxis = d3.axisLeft(yScale)
                .ticks(0);

            svg.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(" + height + "px)")

            const yAxisEl = svg.append("g").classed("y-axis", true);

            yAxisEl.call(yAxis)

            svg.selectAll(".domain").remove();
            svg.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start");
            svg.selectAll(".y-axis line").attr("x", 0).attr("x2", "5")

            svg.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", height)
                .attr("y2", height)

            svg.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", 0)
                .attr("y2", 0)
                .classed("target-line", true)

            svg.selectAll(".x-axis .tick text")
                .text("")

            svg.selectAll(".x-axis .tick:first-of-type text")
                .text("Jan 1")

            svg.selectAll(".x-axis .tick:last-of-type text")
                .text("31")

            if (i === 0) {
                svg.append("text")
                    .text("Annual limit, 18 times")
                    .attr("x", 0)
                    .attr("y", "-6")
                    .classed("annual-target", true);
            }

            if (site.dailyCountsCumulative.length === 0) {
                site.dailyCountsCumulative.push(0)
            }

            if (prevYearData.dailyCountsCumulative[prevYearData.dailyCountsCumulative.length - 1] >= 18) {
                // check this if statement is correct!
                if (Math.abs(timeScale(site.dailyCountsCumulative.length - 1) - timeScale(prevYearData.dailyCountsCumulative.length - 1)) > 20) {
                    svg.append("text")
                        .text(prevYearData.dailyCountsCumulative.length + " days")
                        .attr("x", timeScale(prevYearData.dailyCountsCumulative.length - 1))
                        .attr("y", "-6")
                        .classed("days-passed-prev", true);

                    svg.append("text")
                        .text("2017")
                        .attr("x", timeScale(prevYearData.dailyCountsCumulative.length - 1))
                        .attr("y", "-20")
                        .classed("days-passed-prev", true);
                }
            } else {

            }

            svg.append("path")
                .datum(prevYearData.dailyCountsCumulative)
                .attr("fill", "none")
                .attr("stroke", "#929297")
                .attr("stroke-width", 1.5)
                .attr("d", line);

            svg.append("circle")
                .attr("cx", timeScale(prevYearData.dailyCountsCumulative.length - 1))
                .attr("cy", yScale(prevYearData.dailyCountsCumulative[prevYearData.dailyCountsCumulative.length - 1]))
                .attr("r", "3")
                .style("fill", "#929297");

            svg.append("path")
                .datum(site.dailyCountsCumulative)
                .attr("fill", "none")
                .attr("stroke", "#e00000")
                .attr("stroke-width", 1.5)
                .attr("d", line);

            svg.append("circle")
                .attr("cx", timeScale(site.dailyCountsCumulative.length - 1))
                .attr("cy", yScale(site.dailyCountsCumulative[site.dailyCountsCumulative.length - 1]))
                .attr("r", "3")
                .style("fill", "#e00000");

            if (site.dailyCountsCumulative[site.dailyCountsCumulative.length - 1] >= 18) {
                svg.append("text")
                    .text(site.dailyCountsCumulative.length + " days")
                    .attr("x", timeScale(site.dailyCountsCumulative.length - 1))
                    .attr("y", "-6")
                    .classed("days-passed", true);

                svg.append("text")
                    .text("2018")
                    .attr("x", timeScale(site.dailyCountsCumulative.length - 1))
                    .attr("y", "-20")
                    .classed("days-passed", true);
            } else {
                if (i === 0) {
                    svg.append("text")
                        .text("2018")
                        .attr("x", timeScale(site.dailyCountsCumulative.length - 1))
                        .attr("y", yScale(site.dailyCountsCumulative[site.dailyCountsCumulative.length - 1]))
                        .attr("dy", "-6")
                        .style("text-anchor", "start")
                        .classed("days-passed-bg", true);

                    svg.append("text")
                        .text("2018")
                        .attr("x", timeScale(site.dailyCountsCumulative.length - 1))
                        .attr("y", yScale(site.dailyCountsCumulative[site.dailyCountsCumulative.length - 1]))
                        .attr("dy", "-6")
                        .style("text-anchor", "start")
                        .classed("days-passed", true);
                }
            }
        });
    });

Promise.all([
        loadJson(process.env.PATH + "/assets/data/pollutionSummaryTotalsAllSites-2018.json")
        // loadJson(process.env.PATH + "/assets/london6.json"),
        // loadJson(process.env.PATH + "/assets/londonRoadsClippedGeo.json"),
        // loadJson(process.env.PATH + "/assets/parksgeojson.geojson"),
        // loadJson(process.env.PATH + "/assets/dissolved2Geo.geojson"),
    ])
    .then((data) => {
        // const londonTopojson = data[1];
        const pollutionSummaries = data[0];
        const pollutionSummariesOld = data[1];
        // const roads = data[2];
        // const parks = data[2];
        // const outline = data[3]

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

        const circleScale = d3.scaleSqrt().domain([0, 200]).range([(width < 620) ? 2 : 3, width / 30]);

        // svg.append("g").selectAll("path")
        //     .data(parks.features)
        //     .enter()
        //     .append("path")
        //     .attr("d", path)
        //     .style("fill", "#e3efe4")
        //     .style("stroke", "none");

        // svg.append("g").selectAll("path")
        //     .data(londonTopojson.features)
        //     .enter()
        //     .append("path")
        //     .attr("d", path)
        //     .style("fill", "none")
        //     .style("stroke", "#dcdcdc")
        //     .style("stroke-width", "0.5px");

        // svg.append("g").selectAll("path")
        //     .data(outline.features)
        //     .enter()
        //     .append("path")
        //     .attr("d", path)
        //     .style("fill", "none")
        //     .style("stroke", "#bdbdbd")
        //     .style("stroke-width", "1px");

        // svg.append("g")
        //  .selectAll("path")
        //          .data(roads.features)
        //          .enter()
        //          .append("path")
        //     .attr("d", path)
        //     .style("fill", "none")
        //     .style("stroke", "#eaeaea")
        //     .style("stroke-width", "0.5px");

        d3.select(".num-exceeded").html(pollutionSummaries.filter(d => d.totalCount > 18).length);

        if(pollutionSummaries.filter(d => d.totalCount > 18).length === 1) {
            d3.select(".num-exceeded").classed("just-one", true);
        }

        const hoverBox = d3.select(".map-wrapper")
            .append("div")
            .classed("hover-box", true)

        const circlesG = svg.append("g");

        const circles = circlesG.selectAll("circle")
            .data(pollutionSummaries)
            .enter()
            .append("circle")
            .attr("r", 0)
            .attr("cx", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[0])
            .attr("cy", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[1])
            .style("fill", d => circleColour(d.totalCount))
            .style("fill-opacity", "0.3")
            .style("stroke", d => circleColour(d.totalCount))
            .style("stroke-width", "1px")

        circles.transition()
            .duration(300)
            .attr("r", d => circleScale(d.totalCount));

        circles.on("mousemove", function(d) {
            const newHtml = `<h4>${d.siteMeta["@SiteName"]}</h4>
                            <p>Hours NO2 exceeded 200 μg/m3: ${d.totalCount}</p>`;

            hoverBox.html(newHtml)
                .style("top", d3.mouse(this)[1] + "px")
                .style("left", d3.mouse(this)[0] + 10 + "px")
                .style("opacity", "1");
        });

        circles.on("mouseleave", function(d) {
            hoverBox
                .style("opacity", "0");
        });

        const labels = svg.append("g")

        circles.each(function(c) {
            if (["LB4", "WA7"].indexOf(c.siteMeta["@SiteCode"]) > -1) {
                const labelProj = projection([c.siteMeta["@Longitude"], c.siteMeta["@Latitude"]]);

                const highLow = (c.siteMeta["@SiteCode"] !== "LB4") ? -circleScale(c.totalCount) - 6 : circleScale(c.totalCount) + 15;

                labels.append("text")
                    .text(c.siteMeta["@SiteName"].split(" - ")[1])
                    .attr("x", labelProj[0])
                    .attr("y", labelProj[1])
                    .attr("dy", highLow)
                    .style("text-anchor", "middle")
                    .classed("label-to-grab", true)
                    .classed("text-label-bg", true);

                labels.append("text")
                    .text(c.siteMeta["@SiteName"].split(" - ")[1])
                    .attr("x", labelProj[0])
                    .attr("y", labelProj[1])
                    .attr("dy", highLow)
                    .style("text-anchor", "middle")
                    .classed("label-to-grab", true)
                    .classed("text-label", true);
            }
        });

        d3.select("#switch-2017").on("click", function() {
            d3.selectAll(".year-button").classed("active", false);
            d3.select(this).classed("active", true);
            d3.select(document.body).classed("prev-year", false);
            d3.select(".num-exceeded").html(pollutionSummaries.filter(d => d.totalCount > 18).length)
            circles
                .data(pollutionSummaries)
                .transition()
                .duration(300)
                .attr("r", d => circleScale(d.totalCount))
                .attr("cx", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[0])
                .attr("cy", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[1])
                .style("fill", d => circleColour(d.totalCount))
                .style("fill-opacity", "0.3")
                .style("stroke", d => circleColour(d.totalCount))
                .style("stroke-width", "1px");

            d3.selectAll(".label-to-grab").remove();

            circles.each(function(c) {
                if (["LB4", "WA7"].indexOf(c.siteMeta["@SiteCode"]) > -1) {
                    const labelProj = projection([c.siteMeta["@Longitude"], c.siteMeta["@Latitude"]]);

                    const highLow = (c.siteMeta["@SiteCode"] !== "LB4") ? -circleScale(c.totalCount) - 6 : circleScale(c.totalCount) + 15;

                    labels.append("text")
                        .text(c.siteMeta["@SiteName"].split(" - ")[1])
                        .attr("x", labelProj[0])
                        .attr("y", labelProj[1])
                        .attr("dy", highLow)
                        .style("text-anchor", "middle")
                        .classed("label-to-grab", true)
                        .classed("text-label-bg", true);

                    labels.append("text")
                        .text(c.siteMeta["@SiteName"].split(" - ")[1])
                        .attr("x", labelProj[0])
                        .attr("y", labelProj[1])
                        .attr("dy", highLow)
                        .style("text-anchor", "middle")
                        .classed("label-to-grab", true)
                        .classed("text-label", true);
                }
            });

            drawTable(pollutionSummaries);
        });

        loadJson(process.env.PATH + "/assets/data/pollutionSummaryTotalsAllSites-2017.json").then((pollutionSummariesOld) => {
            d3.select("#switch-2016").on("click", function() {
                d3.selectAll(".year-button").classed("active", false);
                d3.select(this).classed("active", true);
                d3.select(document.body).classed("prev-year", true);
                d3.select(".num-exceeded").html(pollutionSummariesOld.filter(d => d.totalCount > 18).length)

                circles
                    .data(pollutionSummariesOld)
                    .transition()
                    .duration(300)
                    .attr("r", d => circleScale(d.totalCount))
                    .attr("cx", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[0])
                    .attr("cy", d => projection([d.siteMeta["@Longitude"], d.siteMeta["@Latitude"]])[1])
                    .style("fill", d => circleColour(d.totalCount))
                    .style("fill-opacity", "0.3")
                    .style("stroke", d => circleColour(d.totalCount))
                    .style("stroke-width", "1px");

                d3.selectAll(".label-to-grab").remove();

                circles.each(function(c) {
                    if (["LB4", "WA7"].indexOf(c.siteMeta["@SiteCode"]) > -1) {
                        const labelProj = projection([c.siteMeta["@Longitude"], c.siteMeta["@Latitude"]]);

                        const highLow = (c.siteMeta["@SiteCode"] !== "LB4") ? -circleScale(c.totalCount) - 6 : circleScale(c.totalCount) + 15;

                        labels.append("text")
                            .text(c.siteMeta["@SiteName"].split(" - ")[1])
                            .attr("x", labelProj[0])
                            .attr("y", labelProj[1])
                            .attr("dy", highLow)
                            .style("text-anchor", "middle")
                            .classed("label-to-grab", true)
                            .classed("text-label-bg", true);

                        labels.append("text")
                            .text(c.siteMeta["@SiteName"].split(" - ")[1])
                            .attr("x", labelProj[0])
                            .attr("y", labelProj[1])
                            .attr("dy", highLow)
                            .style("text-anchor", "middle")
                            .classed("label-to-grab", true)
                            .classed("text-label", true);
                    }
                });

                drawTable(pollutionSummariesOld);
            });
        });

        // map table

        const drawTable = (summaries) => {
            const tableEl = d3.select(".map-table").html("");

            const top5PollutedSites = summaries.slice().sort((a, b) => b.totalCount - a.totalCount).filter(d => d.totalCount > 0);

            if (top5PollutedSites.length > 0) {

                const exceededNotExceeded = [top5PollutedSites.filter(d => d.totalCount > 18), top5PollutedSites.filter(d => d.totalCount <= 18)];

                const headers = tableEl.selectAll("div.grouping")
                    .data(exceededNotExceeded)
                    .enter()
                    .append("div")
                    .classed("block-wrapper", true)

                headers
                    .append("h2")
                    .text((d, i) => (i === 0) ? "Exceeded annual limit" : "Exceeded hourly limits at least once")
                    .style("display", d => (d.length > 0) ? "inline-block" : "none")

                const topRow = headers.append("div")
                    .classed("row-wrapper", true)
                    .style("display", d => (d.length > 0) ? "block" : "none");

                topRow.append("div")
                    .text((d, i) => "Hourly limit breaches")
                    .classed("row-count", true)

                topRow.append("div")
                    .text((d, i) => "Site")
                    .classed("row-name", true)

                const rows = headers.selectAll("div.foo")
                    .data(d => d)
                    .enter()
                    .append("div")
                    .classed("row-wrapper", true)

                rows.append("div")
                    .text(d => d.siteMeta["@SiteName"])
                    .classed("row-name", true)

                rows.append("div")
                    .html((d, i) => d.totalCount)
                    .classed("row-count", true)
            }
        }

        drawTable(pollutionSummaries);

    });


function circleColour(val) {
    if (val > 18) {
        return "#e00000"
    } else if (val > 0) {
        return "#f5be2c"
    } else {
        return "#bdbdbd"
    }
}