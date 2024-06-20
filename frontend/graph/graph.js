
import { getRelativeTimeseriesData } from './graphData.js';
import { getChartSeriesDataByFuel, getTooltipForFuelFilteredGraph } from './graphByFuel.js';
import { FUELS_KEY, SKIP_LIST } from '../utilities/units.js';
import { getLiveGenerationData } from '../utilities/api.js';
import { getCurrentTimeInNZ } from '../utilities/units.js';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

const powerStationFilterDropdown = document.getElementById('power-station-select');
const regionSelectDropdown = document.getElementById('region-select');
const clearButton = document.getElementById('clear-button');
const statusSpan = document.getElementById("graph-status");

regionSelectDropdown.addEventListener('change', () => onRegionDropdownSelect(regionSelectDropdown));
powerStationFilterDropdown.addEventListener('change', () => onGeneratorDropdownSelect(powerStationFilterDropdown));
clearButton.addEventListener('click', () => onClearButtonSelect());

let buttons = [];

addButton('1h-button', '-1h');
addButton('3h-button', '-3h');
addButton('1d-button', '-0d');
addButton('24h-button', '-24h');
addButton('3d-button', '-3d');
addButton('7d-button', '-7d');

console.log(buttons)

function addButton(id, timeframeValue) {
    let button = document.getElementById(id);
    buttons.push(button);
    button.addEventListener('click', (event) => onDateButtonPressed(timeframeValue, event));

    if (((new URLSearchParams(window.location.search)).get("timeframe") || "-0d") === timeframeValue) {
        button.classList.remove("btn-secondary");
        button.classList.add("btn-primary");
    }
}

function onDateButtonPressed(timeframe, button) {
    setQueryParam("timeframe", timeframe);
    getTradingPeriodStats(true);

    buttons.forEach((button) => {
        button.classList.remove("btn-primary");
        button.classList.add("btn-secondary");
    });

    button.target.classList.remove("btn-secondary");
    button.target.classList.add("btn-primary");
}

function isMidnight(time) {
    return time.split("T")[1] === "00:00:00";
}

let graphLastUpdatedTimestamp = "";

let updateInProgress = false;

/**
 * Checks for any gaps in the data and fills them in with empty objects
 * @param {*} data 
 * @returns 
 */
function fillInGaps(data) {
    let maximumDataGapAllowed = THIRTY_MINUTES_IN_MS;

    if ((new URLSearchParams(window.location.search)).get("gaps") === "true") {
        maximumDataGapAllowed = FIVE_MINUTES_IN_MS;
    }

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

function setQueryParam(param, value) {
    var searchParams = new URLSearchParams(window.location.search);

    if (value === "") {
        searchParams.delete(param);
    } else {
        searchParams.set(param, value);
    }

    var newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
    history.replaceState(null, '', newRelativePathQuery);
}

function onClearButtonSelect() {
    setQueryParam("timeframe", "");
    setQueryParam("site", "");
    setQueryParam("island", "");
    setQueryParam("zone", "");
    setQueryParam("fuel", "");
    setQueryParam("redirect", "");
    onDateButtonPressed("-0d", { target: document.getElementById("1d-button") });
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
        if (SKIP_LIST.includes(generator.site)) {
            return;
        }

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

    statusSpan.innerHTML = "Fetching data...";
    statusSpan.style.display = "block";

    const siteToFilterTo = (new URLSearchParams(window.location.search)).get("site")?.split(',') || [];
    const islandToFilterTo = (new URLSearchParams(window.location.search)).get("island")?.split(',') || [];
    const zoneToFilterTo = (new URLSearchParams(window.location.search)).get("zone")?.split(',') || [];
    const fuelsToFilterTo = (new URLSearchParams(window.location.search)).get("fuel")?.split(',') || [];
    const timeframe = (new URLSearchParams(window.location.search)).get("timeframe") || "-0d";

    let data = await getRelativeTimeseriesData(timeframe);
    const liveGenData = await getLiveGenerationData();

    statusSpan.innerHTML = "Updating graph...";

    data = fillInGaps(data);

    const tradingPeriodTimestamps = Object.keys(data);

    // populate 'Last updated x minutes ago' on statusbar
    var lastUpdatedDate = Date.parse(liveGenData.lastUpdate);
    var lastUpdatedString = `Last Updated: ${Math.round((getCurrentTimeInNZ() - lastUpdatedDate) / 1000 / 60)} minutes ago`;

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
        // don't update the graph if nothing has changed (forces a re-render)
        updateInProgress = false;
        statusSpan.innerHTML = lastUpdatedString;
        return;
    }

    graphLastUpdatedTimestamp = mostRecentTradingPeriodTimestamp;

    let plotLines = [];
    let xAxisLabels = [];

    tradingPeriodTimestamps.forEach((time, index) => {
        xAxisLabels.push(
            new Date(time)
                .toLocaleTimeString('en-NZ', {
                    hour: "numeric",
                    minute: "numeric"
                }));

        if (isMidnight(time) && index > 0) {
            // adds a 'plotline' to the graph at Midnight to delineate when the date changes
            plotLines.push({
                color: 'black',
                width: 1,
                value: index,
                label: {
                    text: new Date(time).toLocaleString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric" }),
                    align: 'top',
                    x: 10,
                    y: 10
                }
            });
        }
    });

    let subtitleText = getSubtitleText(tradingPeriodTimestamps[0], mostRecentTradingPeriodTimestamp);
    let seriesData = await getChartSeriesDataByFuel(liveGenData, data, siteToFilterTo, islandToFilterTo, zoneToFilterTo, fuelsToFilterTo);

    Highcharts.chart('generation-chart', {
        chart: {
            type: 'area',
            zoomType: 'x',

            events: {
                redraw: function (event) {
                    // if the user has manually hidden a series, update the URL query parameter to reflect this
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
            startOnTick: false,
            endOnTick: false,
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
    statusSpan.innerHTML = lastUpdatedString;
}

getTradingPeriodStats();
window.setInterval(() => getTradingPeriodStats(), 30000);