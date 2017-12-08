import async from 'async'
import _ from 'lodash'
import rp from 'request-promise'
import fs from 'fs'
import * as d3 from "d3"

const loadSiteData = (sitesList) => {
    return new Promise((resolve, reject) => {
        async.mapLimit(sitesList, 10, async.asyncify(async(siteInfo) => {
            const siteCode = siteInfo["@SiteCode"];

            console.log(siteCode + " ...");
            const site = await rp({ "uri": `http://api.erg.kcl.ac.uk/AirQuality/Data/Wide/Site/SiteCode=${siteCode}/StartDate=01%20jan%202017/EndDate=01%20feb%202017/Json`, "json": true });
            console.log(siteCode + " ✓");

            // clean the data - abstract into a function
            site.AirQualityData.Columns.Column = (Array.isArray(site.AirQualityData.Columns.Column)) ? site.AirQualityData.Columns.Column : [site.AirQualityData.Columns.Column];

            const key = site.AirQualityData.Columns.Column.find(c => c["@ColumnName"].indexOf("Nitrogen Dioxide") > -1)["@ColumnId"];

            return {
                "siteMeta": siteInfo,
                "data": site.AirQualityData.RawAQData.Data.map(d => {
                    return {
                        "date": d["@MeasurementDateGMT"],
                        "NO2": d["@" + key]
                    }
                })
            }

        }), (err, results) => {
            if (err) {
                // need to do something real with errors here, retry?
                throw err;
            }
            resolve(results);
        })
    });
}

const generateSitesData = async(sitesList) => {
    const siteData = await loadSiteData(sitesList)

    fs.writeFileSync("./src/assets/data/pollutionDataAllSites.json", JSON.stringify(siteData));

    const summaryDays = generateSummary(siteData);

    fs.writeFileSync("./src/assets/data/pollutionSummariesAllSites.json", JSON.stringify(summaryDays));

    const summaryDaysTotals = summaryDays.map(d => {
        delete d.dailyCounts;
        return d;
    });

    fs.writeFileSync("./src/assets/data/pollutionSummaryTotalsAllSites.json", JSON.stringify(summaryDaysTotals));
}

const generateSummary = (siteData) => {
    return siteData.map(site => {
        const summary = d3.nest()
            .key(d => d.date.split(" ")[0])
            .entries(site.data)

        const dailyCounts = summary.map((d) => {
            const numAbove200 = d.values.filter(v => Number(v.NO2) > 200).length;

            return {"date" : d.key, "numLimitExceeded": numAbove200};
        });

        const totalCount = d3.sum(dailyCounts, d => d.numLimitExceeded);

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