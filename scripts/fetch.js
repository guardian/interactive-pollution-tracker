import async from 'async'
import _ from 'lodash'
import rp from 'request-promise'
import fs from 'fs'
import * as d3 from "d3"

const loadSiteData = (sitesList, year) => {
    return new Promise((resolve, reject) => {
        const dates = [
            [{ "month": "jan", "day": "01" }, { "month": "jan", "day": "31" }],
            [{ "month": "feb", "day": "01" }, { "month": "feb", "day": "28" }],
            [{ "month": "mar", "day": "01" }, { "month": "mar", "day": "31" }],
            [{ "month": "apr", "day": "01" }, { "month": "apr", "day": "30" }],
            [{ "month": "may", "day": "01" }, { "month": "may", "day": "31" }],
            [{ "month": "june", "day": "01" }, { "month": "june", "day": "30" }],
            [{ "month": "july", "day": "01" }, { "month": "july", "day": "31" }]
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

        async.mapLimit(combinations, 3, async.retryable(5, async.asyncify(async(siteInfo) => {
            const siteCode = siteInfo[1]["@SiteCode"];
            const month = siteInfo[0];

            // console.log(siteInfo)

            console.log(`http://api.erg.kcl.ac.uk/AirQuality/Data/Wide/Site/SiteCode=${siteCode}/StartDate=${month[0].day}%20${month[0].month}%20${year}/EndDate=${month[1].day}%20${month[1].month}%20${year}/Json` + " ... ");
            const site = await rp({ "uri": `http://api.erg.kcl.ac.uk/AirQuality/Data/Wide/Site/SiteCode=${siteCode}/StartDate=${month[0].day}%20${month[0].month}%20${year}/EndDate=${month[1].day}%20${month[1].month}%20${year}/Json`, "json": true });
            console.log(siteCode + " ✓");

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

        // fs.writeFileSync("./src/assets/data/pollutionDataAllSites-" + year + ".json", JSON.stringify(siteData));

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