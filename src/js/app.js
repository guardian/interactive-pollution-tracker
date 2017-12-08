import * as d3 from 'd3'
import loadJson from "../components/load-json"

Promise.all([loadJson(process.env.PATH + "/assets/data/pollutionSummaryTotalsAllSites.json"), loadJson(process.env.PATH + "/assets/london.topojson")])
	.then((data) => {
		const londonTopojson = data[1];
		const pollutionSummaries = data[0];
		console.log(data)
	});