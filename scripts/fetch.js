import async from 'async'
import _ from 'lodash'
import rp from 'request-promise'
import fs from 'fs'
import * as d3 from "d3"

const loadSiteData = (sitesList, year) => {
    return new Promise((resolve, reject) => {
        const dates = [
            ["jan", "feb"],
            ["feb", "mar"]
        ];

        // const dates = [
        //     ["jan", "feb"],
        //     ["feb", "mar"],
        //     ["mar", "apr"],
        //     ["apr", "may"],
        //     ["may", "jun"],
        //     ["jun", "jul"],
        //     ["jul", "sep"],
        //     ["sep", "oct"],
        //     ["oct", "nov"],
        //     ["nov", "dec"],
        //     ["dec", "dec"]
        // ];
        // , ["mar", "apr"], ["apr", "may"], ["may", "jun"], ["jul", "sep"], ["sep", "oct"], ["oct", "nov"], ["nov", "dec"]

        var combinations = [];

        dates.forEach(d => {
            sitesList
            // .filter(a => ["LB4", "NB1", "CT6", "WM6", "WA7", "WA8"].indexOf(a["@SiteCode"]) > -1)
                .forEach(e => {
                combinations.push([d, e])
            });
        });

        async.mapLimit(combinations, 10, async.retryable(10, async.asyncify(async(siteInfo) => {
            const siteCode = siteInfo[1]["@SiteCode"];
            const month = siteInfo[0];

            const endDate = (month[0] === month[1]) ? "31" : "01";

            console.log(siteCode + "/" + month[0] + "/" + year + " ...");
            const site = await rp({ "uri": `http://api.erg.kcl.ac.uk/AirQuality/Data/Wide/Site/SiteCode=${siteCode}/StartDate=01%20${month[0]}%20${year}/EndDate=${endDate}%20${month[1]}%20${year}/Json`, "json": true });
            // console.log(siteCode + " ✓");

            // clean the data - abstract into a function
            site.AirQualityData.Columns.Column = (Array.isArray(site.AirQualityData.Columns.Column)) ? site.AirQualityData.Columns.Column : [site.AirQualityData.Columns.Column];

            const key = site.AirQualityData.Columns.Column.find(c => c["@ColumnName"].indexOf("Nitrogen Dioxide") > -1)["@ColumnId"];

            return {
                "siteMeta": siteInfo[1],
                "data": site.AirQualityData.RawAQData.Data.map(d => {
                    return {
                        "date": d["@MeasurementDateGMT"],
                        "NO2": d["@" + key]
                    }
                })
            }

        })), (err, results) => {
            if (err) {
                // need to do something real with errors here, retry?
                throw err;
            }
            resolve(results);
        })
    });
}

const generateSitesData = async(sitesList) => {
    const years = [2018];

    for (let year of years) {
        const input = (await loadSiteData(sitesList, year));

        const siteData = d3.nest()
            .key(d => d.siteMeta["@SiteCode"])
            .entries(input)
            .map(code => {
                return {
                    "siteMeta": code.values[0].siteMeta,
                    "data": _.flatten(code.values.map(d => d.data))
                }
            });

        fs.writeFileSync("./src/assets/data/pollutionDataAllSites-" + year + ".json", JSON.stringify(siteData));

        const summaryDays = generateSummary(siteData);

        fs.writeFileSync("./src/assets/data/pollutionSummariesAllSites-" + year + ".json", JSON.stringify(summaryDays.filter(d => ["LB4", "NB1", "CT6", "WM6", "WA7", "WA8"].indexOf(d.siteMeta["@SiteCode"]) > -1)));

        const summaryDaysTotals = summaryDays.map(d => {
            delete d.dailyCounts;
            return d;
        });

        fs.writeFileSync("./src/assets/data/pollutionSummaryTotalsAllSites-" + year + ".json", JSON.stringify(summaryDaysTotals));
    }
}

const generateSummary = (siteData) => {
    return siteData.map(site => {
        const summary = d3.nest()
            .key(d => d.date.split(" ")[0])
            .entries(site.data)

        const dailyCounts = summary.filter(d => {
            return d.values.filter(f => f.NO2 !== "").length > 0
        }).map((d) => {
            const numAbove200 = d.values.filter(v => Number(v.NO2) > 200).length;

            return numAbove200;
        });

        const totalCount = d3.sum(dailyCounts, d => d);

        return {
            "siteMeta": site.siteMeta,
            dailyCounts,
            totalCount
        }
    });
}

const generator = async() => {
    const sitesResp = await rp({ uri: "http://api.erg.kcl.ac.uk/AirQuality/Information/MonitoringSiteSpecies/GroupName=London/Json", json: true });
    const sitesList = sitesResp.Sites.Site.map(site => {
            site.Species = (Array.isArray(site.Species)) ? site.Species : [site.Species];
            return site;
        })
        .filter(site => site.Species.find(s => s["@SpeciesCode"] === "NO2"))
        .filter(site => site.Species.find(s => s["@SpeciesCode"] === "NO2")["@DateMeasurementFinished"] === "");

    generateSitesData(sitesList);
}

generator();