
import { getRelativeTimeseriesData } from './graphData.js';
import { getChartSeriesDataByFuel, getTooltipForFuelFilteredGraph } from './graphByFuel.js';
import { displayMegawattsOrGigawatts, RENEWABLE_FUELS, FUELS_KEY } from '../utilities/units.js';
import { getLiveGenerationData } from '../utilities/api.js';

const timeframeSelectDropdown = document.getElementById('timeframe-select');
timeframeSelectDropdown.addEventListener('change', () => onTimeframeDropdownSelect(timeframeSelectDropdown));

const powerStationFilterDropdown = document.getElementById('power-station-select');
const regionSelectDropdown = document.getElementById('region-select');
const clearButton = document.getElementById('clear-button');

regionSelectDropdown.addEventListener('change', () => onRegionDropdownSelect(regionSelectDropdown));
powerStationFilterDropdown.addEventListener('change', () => onGeneratorDropdownSelect(powerStationFilterDropdown));
clearButton.addEventListener('click', () => onClearButtonSelect());

let graphLastUpdatedTimestamp = "";
//let isProd = (window.location.origin === 'https://electricitymap.frenchsta.gg');

let updateInProgress = false;

async function onGeneratorDropdownSelect(dropdownObject) {
    var selectedSiteCode = dropdownObject.options[dropdownObject.selectedIndex].value;
    setQueryParam("site", selectedSiteCode);
    setQueryParam("fuel", "");
    getTradingPeriodStats(true);
}

async function onRegionDropdownSelect(dropdownObject) {
    var selectedRegion = dropdownObject.options[dropdownObject.selectedIndex].value;

    if(selectedRegion.length === 2){
        setQueryParam("site", "");
        setQueryParam("island", selectedRegion);
        setQueryParam("zone", "");
    } else if (selectedRegion.length === 3){
        setQueryParam("site", "");
        setQueryParam("island", "");
        setQueryParam("zone", selectedRegion);
    } else {
        setQueryParam("island", "");
        setQueryParam("zone", "");
    }

    getTradingPeriodStats(true);
}

function onTimeframeDropdownSelect(dropdownObject){
    var selectedTimeframe = dropdownObject.options[dropdownObject.selectedIndex].value;

    setQueryParam("timeframe", selectedTimeframe);
    getTradingPeriodStats(true);
}

function setQueryParam(param, value){
    var searchParams = new URLSearchParams(window.location.search);

    if(value === ""){
        searchParams.delete(param);
    } else {
        searchParams.set(param, value);
    }

    var newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
    history.pushState(null, '', newRelativePathQuery);
}

function onClearButtonSelect(){
    setQueryParam("timeframe", "");
    setQueryParam("site", "");
    setQueryParam("island", "");
    setQueryParam("zone", "");
    setQueryParam("fuel", "");
    getTradingPeriodStats(true);
}

function getSubtitleText(oldestTimestamp, newestTimestamp){
    const formattedOldDate = new Date(oldestTimestamp)
        .toLocaleDateString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric" });

    const formattedOldTime = new Date(oldestTimestamp).toLocaleTimeString('en-NZ', { hour: "numeric", minute: "numeric" });

    const formattedLatestDate = new Date(newestTimestamp)
        .toLocaleDateString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric" });

    const formattedLatestTime = new Date(newestTimestamp).toLocaleTimeString('en-NZ', { hour: "numeric", minute: "numeric" });

    return (formattedOldDate == formattedLatestDate) ? 
        `${formattedOldDate} ${formattedOldTime} - ${formattedLatestTime}` : 
        `${formattedOldDate} ${formattedOldTime} - ${formattedLatestDate} ${formattedLatestTime}`;
}

async function getTradingPeriodStats(forceUpdate = false) {
    if(updateInProgress){
        console.log("Update already in progress")
        return;
    }

    updateInProgress = true;
    console.debug("Updating trading period stats graph");
    
    var status = document.getElementById("status");
    status.innerHTML = "Last Updated: .. minutes ago";

    const siteToFilterTo = (new URLSearchParams(window.location.search)).get("site")?.split(',') || [];
    const islandToFilterTo = (new URLSearchParams(window.location.search)).get("island")?.split(',') || [];
    const zoneToFilterTo = (new URLSearchParams(window.location.search)).get("zone")?.split(',') || [];
    const fuelsToFilterTo = (new URLSearchParams(window.location.search)).get("fuel")?.split(',') || [];
    const timeframe = (new URLSearchParams(window.location.search)).get("timeframe") || "-0d";

    timeframeSelectDropdown.value = timeframe;

    const data = await getRelativeTimeseriesData(timeframe);
    const liveGenData = await getLiveGenerationData();
    const tradingPeriodTimestamps = Object.keys(data);

    // populate 'Last updated x minutes ago' on statusbar
    var now = new Date();
    var lastUpdatedDate = new Date(liveGenData.lastUpdate + "+12:00");
    var updatedMinutesAgo = Math.round((now - lastUpdatedDate) / 1000 / 60);
    var minutesAgoString = `${updatedMinutesAgo} minutes ago`;

    status.innerHTML = `Last Updated: ${minutesAgoString}`;

    let sortedGenerationData = liveGenData.generators.sort((a, b) => a.name.localeCompare(b.name));

    //populate generator dropdown
    sortedGenerationData.forEach(generator => {
        var opt = document.createElement("option");
        opt.value = generator.site;
        opt.innerHTML = generator.name;

        if(zoneToFilterTo.length > 0 && zoneToFilterTo.includes(generator.gridZone)){
            return;
        }

        if(islandToFilterTo.length > 0 && islandToFilterTo.includes(generator.island)){
            return;
        }

        powerStationFilterDropdown.appendChild(opt);
    });

    // Build up a string that contains the sites we are filtering to
    let filterDescription = "";
    if (siteToFilterTo.length > 0) {
        powerStationFilterDropdown.value = siteToFilterTo[0];

        siteToFilterTo.forEach(site => {
            var liveGeneratorData = (liveGenData.generators.filter((gen) => gen.site === site))[0];
            if(liveGeneratorData)
                filterDescription += (filterDescription != "") ? ", " + liveGeneratorData.name : liveGeneratorData.name;
        });
    } else {
        powerStationFilterDropdown.value = "";
    }

    if (islandToFilterTo.length > 0) {
        regionSelectDropdown.value = islandToFilterTo[0];

        var islandNames = islandToFilterTo.map(island => island === "NI" ? "North Island" : "South Island");

        filterDescription += (filterDescription != "") ? ", " : "";
        filterDescription += islandNames.join(", ");
    }

    if (zoneToFilterTo.length > 0) {
        regionSelectDropdown.value = zoneToFilterTo[0];

        var zoneNames = zoneToFilterTo.map(zone => {
                switch(zone){
                    case "UNI":
                        return "Upper North Island"
                    case "CNI":
                        return "Central North Island"
                    case "LNI":
                        return "Lower North Island"
                    case "USI":
                        return "Upper South Island"
                    case "LSI":
                        return "Lower South Island"
                    default:
                        return zone;
            }}
        );

        filterDescription += (filterDescription != "") ? ", " : "";
        filterDescription += zoneNames.join(", ");
    }

    if(islandToFilterTo.length == 0 && zoneToFilterTo.length == 0){
        regionSelectDropdown.value = "";
    }

    const mostRecentTradingPeriodTimestamp = tradingPeriodTimestamps[tradingPeriodTimestamps.length - 1];

    if (!forceUpdate && mostRecentTradingPeriodTimestamp === graphLastUpdatedTimestamp) {
        return;
    }

    graphLastUpdatedTimestamp = mostRecentTradingPeriodTimestamp;

    let plotLines = [];

    tradingPeriodTimestamps.forEach((time, index) => {
        if (time.split("T")[1] === "00:00:00") {
            plotLines.push({
                color: 'black',
                width: 1,
                value: index,
                label: {
                    text: new Date(time).toLocaleString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric"}),
                    align: 'top',
                    x: 10,
                    y: 10
                }
            });
        }
    });

    let subtitleText = getSubtitleText(tradingPeriodTimestamps[0], mostRecentTradingPeriodTimestamp);

    let xAxisLabels = tradingPeriodTimestamps.map(tradingPeriod =>
        new Date(tradingPeriod)
            .toLocaleTimeString('en-NZ', {
                hour: "numeric",
                minute: "numeric"
            })
    );
    
    let seriesData = await getChartSeriesDataByFuel(liveGenData, data, siteToFilterTo, islandToFilterTo, zoneToFilterTo, fuelsToFilterTo);
    
    Highcharts.chart('generation-chart', {
        chart: {
            type: 'area',
            zoomType: 'x',
            
            events: {
                redraw: function(event) {
                    let visibleSeriesCommaSeparatedString = "";
                    const series = this.userOptions.series;
                    series.forEach((series, index) => {
                        
                        if(series.visible !== false){
                            visibleSeriesCommaSeparatedString += (visibleSeriesCommaSeparatedString.length > 0) ? "," : "";
                            visibleSeriesCommaSeparatedString += Object.keys(FUELS_KEY).at(Object.values(FUELS_KEY).indexOf(series.name));
                        }
                        
                    });
                    setQueryParam("fuel", visibleSeriesCommaSeparatedString);
                }
            }
        },

        title: {
            text: `NZ Electricity Generation ${(filterDescription !== "") ? " - " + filterDescription : ""}`,
            align: 'left'
        },

        subtitle: {
            text: subtitleText,
            align: 'left'
        },

        tooltip: {
            shared: true,
            crosshairs: true,
            useHtml: true,
            formatter: getTooltipForFuelFilteredGraph
        },

        credits: {
            enabled: false
        },

        yAxis: {
            title: {
                text: 'Generation (MW)'
            },
        },

        xAxis: {
            categories: xAxisLabels,
            plotLines: plotLines
        },

        legend: {
            layout: 'horizontal',
            align: 'right',
            verticalAlign: 'bottom'
        },

        plotOptions: {
            series: {
                label: {
                    connectorAllowed: true
                },
                pointStart: 0,
                marker: {
                    enabled: false
                },
            },
            area: {
                stacking: 'normal'
            }
        },

        series: seriesData,
    });

    updateInProgress = false;
    //todo - set last updated time
}

getTradingPeriodStats();
window.setInterval(() => getTradingPeriodStats(), 30000);