
import { getRelativeTimeseriesData } from './graphData.js';
import { getChartSeriesDataByFuel, getTooltipForFuelFilteredGraph } from './graphByFuel.js';
import { FUELS_KEY } from '../utilities/units.js';
import { getLiveGenerationData } from '../utilities/api.js';

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

const timeframeSelectDropdown = document.getElementById('timeframe-select');
timeframeSelectDropdown.addEventListener('change', () => onTimeframeDropdownSelect(timeframeSelectDropdown));

const powerStationFilterDropdown = document.getElementById('power-station-select');
const regionSelectDropdown = document.getElementById('region-select');
const clearButton = document.getElementById('clear-button');
const statusSpan = document.getElementById("graph-status");
const navbarStatus = document.getElementById("status");

regionSelectDropdown.addEventListener('change', () => onRegionDropdownSelect(regionSelectDropdown));
powerStationFilterDropdown.addEventListener('change', () => onGeneratorDropdownSelect(powerStationFilterDropdown));
clearButton.addEventListener('click', () => onClearButtonSelect());

let graphLastUpdatedTimestamp = "";

let updateInProgress = false;

/**
 * Checks for any gaps in the data and fills them in with empty objects
 * @param {*} data 
 * @returns 
 */
function fillInGaps(data) {
    const maximumDataGapAllowed = FIFTEEN_MINUTES_IN_MS;
    var timestamps = Object.keys(data);
    var returnData = {};

    let previousTimestamp = new Date(timestamps[0]);
    timestamps.forEach((timestamp) => {
        var currentTimestamp = previousTimestamp;

        while (currentTimestamp < (new Date(timestamp) - maximumDataGapAllowed)) {
            currentTimestamp = new Date(currentTimestamp.getTime() + FIVE_MINUTES_IN_MS);
            let date = currentTimestamp;

            let monthWithLeadingZero = (date.getMonth() + 1).toString().padStart(2, '0');
            let dateWithLeadingZero = date.getDate().toString().padStart(2, '0');
            let hoursWithLeadingZero = date.getHours().toString().padStart(2, '0');
            let minutesWithLeadingZero = date.getMinutes().toString().padStart(2, '0');

            let formattedDateString = `${date.getFullYear()}-${monthWithLeadingZero}-${dateWithLeadingZero}T${hoursWithLeadingZero}:${minutesWithLeadingZero}:00`
            returnData[formattedDateString] = {};
        }

        returnData[timestamp] = data[timestamp];
        previousTimestamp = new Date(timestamp);
    })

    return returnData;
}

async function onGeneratorDropdownSelect(dropdownObject) {
    var selectedSiteCode = dropdownObject.options[dropdownObject.selectedIndex].value;
    setQueryParam("site", selectedSiteCode);
    setQueryParam("fuel", "");
    getTradingPeriodStats(true);
}

async function onRegionDropdownSelect(dropdownObject) {
    var selectedRegion = dropdownObject.options[dropdownObject.selectedIndex].value;

    if (selectedRegion.length === 2) {
        setQueryParam("site", "");
        setQueryParam("island", selectedRegion);
        setQueryParam("zone", "");
    } else if (selectedRegion.length === 3) {
        setQueryParam("site", "");
        setQueryParam("island", "");
        setQueryParam("zone", selectedRegion);
    } else {
        setQueryParam("island", "");
        setQueryParam("zone", "");
    }

    getTradingPeriodStats(true);
}

function onTimeframeDropdownSelect(dropdownObject) {
    var selectedTimeframe = dropdownObject.options[dropdownObject.selectedIndex].value;

    setQueryParam("timeframe", selectedTimeframe);
    getTradingPeriodStats(true);
}

function setQueryParam(param, value) {
    var searchParams = new URLSearchParams(window.location.search);

    if (value === "") {
        searchParams.delete(param);
    } else {
        searchParams.set(param, value);
    }

    var newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
    history.pushState(null, '', newRelativePathQuery);
}

function onClearButtonSelect() {
    setQueryParam("timeframe", "");
    setQueryParam("site", "");
    setQueryParam("island", "");
    setQueryParam("zone", "");
    setQueryParam("fuel", "");
    getTradingPeriodStats(true);
}

function getSubtitleText(oldestTimestamp, newestTimestamp) {
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

function setGeneratorDropdown(liveGenData, zoneToFilterTo = [], islandToFilterTo = []) {
    let sortedGenerationData = liveGenData.generators.sort((a, b) => a.name.localeCompare(b.name));

    //clear generator dropdown
    powerStationFilterDropdown.innerHTML = "";
    var defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerHTML = "Select Power Station";
    powerStationFilterDropdown.appendChild(defaultOption);

    //populate generator dropdown
    sortedGenerationData.forEach(generator => {
        if (generator.site === "SZR") return;
        var thisUnitFuels = [];

        generator.units.forEach(unit => {
            let unitFuel = unit.fuel;
            if (unitFuel === "Battery (Charging)" || unitFuel === "Battery (Discharging)") {
                unitFuel = "Battery";
            }

            if (!thisUnitFuels.includes(unitFuel)) {
                thisUnitFuels.push(unitFuel);
            }
        });

        var opt = document.createElement("option");
        opt.value = generator.site;
        opt.innerHTML = `${generator.name} (${thisUnitFuels.join(", ")})`;

        if (zoneToFilterTo.length > 0 && !zoneToFilterTo.includes(generator.gridZone)) {
            return;
        }

        if (islandToFilterTo.length > 0 && !islandToFilterTo.includes(generator.island)) {
            return;
        }

        powerStationFilterDropdown.appendChild(opt);
    });
}

async function getTradingPeriodStats(forceUpdate = false) {
    if (updateInProgress) {
        console.log("Update already in progress")
        return;
    }

    updateInProgress = true;
    console.debug("Updating trading period stats graph");


    navbarStatus.innerHTML = "Last Updated: .. minutes ago";
    statusSpan.innerHTML = "Fetching data...";
    statusSpan.style.display = "block";

    const siteToFilterTo = (new URLSearchParams(window.location.search)).get("site")?.split(',') || [];
    const islandToFilterTo = (new URLSearchParams(window.location.search)).get("island")?.split(',') || [];
    const zoneToFilterTo = (new URLSearchParams(window.location.search)).get("zone")?.split(',') || [];
    const fuelsToFilterTo = (new URLSearchParams(window.location.search)).get("fuel")?.split(',') || [];
    const timeframe = (new URLSearchParams(window.location.search)).get("timeframe") || "-0d";

    timeframeSelectDropdown.value = timeframe;

    let data = await getRelativeTimeseriesData(timeframe);
    const liveGenData = await getLiveGenerationData();

    statusSpan.innerHTML = "Updating graph...";

    data = fillInGaps(data);

    const tradingPeriodTimestamps = Object.keys(data);

    // populate 'Last updated x minutes ago' on statusbar
    var now = new Date();
    var lastUpdatedDate = new Date(liveGenData.lastUpdate + "+12:00");
    var updatedMinutesAgo = Math.round((now - lastUpdatedDate) / 1000 / 60);
    var minutesAgoString = `${updatedMinutesAgo} minutes ago`;

    navbarStatus.innerHTML = `Last Updated: ${minutesAgoString}`;

    //show back button if this request was directed from the map
    var redirect = (new URLSearchParams(window.location.search)).get("redirect");
    var backButton = document.getElementById("back-link");
    if (redirect) {
        backButton.style.display = "block";
    } else {
        backButton.style.display = "none";
    }

    setGeneratorDropdown(liveGenData, zoneToFilterTo, islandToFilterTo);

    // Build up a string that contains the sites we are filtering to
    let filterDescription = "";
    if (siteToFilterTo.length > 0) {
        powerStationFilterDropdown.value = siteToFilterTo[0];

        siteToFilterTo.forEach(site => {
            var liveGeneratorData = (liveGenData.generators.filter((gen) => gen.site === site))[0];
            if (liveGeneratorData)
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
            switch (zone) {
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
            }
        }
        );

        filterDescription += (filterDescription != "") ? ", " : "";
        filterDescription += zoneNames.join(", ");
    }

    if (islandToFilterTo.length == 0 && zoneToFilterTo.length == 0) {
        regionSelectDropdown.value = "";
    }

    const mostRecentTradingPeriodTimestamp = tradingPeriodTimestamps[tradingPeriodTimestamps.length - 1];

    if (!forceUpdate && mostRecentTradingPeriodTimestamp === graphLastUpdatedTimestamp) {
        updateInProgress = false;
        statusSpan.innerHTML = "";
        statusSpan.style.display = "none";
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
                    text: new Date(time).toLocaleString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" }),
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
                redraw: function (event) {
                    let visibleSeriesCommaSeparatedString = "";
                    const series = this.userOptions.series;
                    series.forEach((series, index) => {

                        if (series.visible !== false) {
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
            align: 'center'
        },

        subtitle: {
            text: subtitleText,
            align: 'center'
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
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
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
                animation: false
            },
            area: {
                stacking: 'normal'
            }
        },

        series: seriesData,

        responsive: {
            rules: [{
                condition: {
                    maxWidth: 900
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        verticalAlign: 'bottom',
                    }
                }
            },
            {
                condition: {
                    maxWidth: 400
                },
                chartOptions: {
                    legend: {
                        enabled: false
                    }
                }
            }]
        }
    });

    updateInProgress = false;
    statusSpan.innerHTML = "";
    statusSpan.style.display = "none";
}

getTradingPeriodStats();
window.setInterval(() => getTradingPeriodStats(), 30000);