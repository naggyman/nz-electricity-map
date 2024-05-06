import { RENEWABLE_FUELS, displayMegawattsOrGigawatts, FUELS_KEY } from '../utilities/units.js';
import { getColourForFuel } from '../utilities/colours.js';

// defines the order that the fuels will be displayed in the chart
const keyOrder = [
    "SOL",
    "WIN",
    "HYD",
    "GAS",
    "CLG",
    "GEO",
    "DIE",
    "BESS",
    "BESS-C"
];

export async function getChartSeriesDataByFuel(liveGenData, data, siteFilter = [], islandFilter = [], zoneFilter = [], fuelFilter = []){
    var tradingPeriodTimestamps = Object.keys(data);
    var allFuels = [];
    var fuels = {};

    var summarisedGenerationPerTradingPeriod = tradingPeriodTimestamps.map(tradingPeriod => summariseGenerationByFuelForThisTradingPeriod(liveGenData, data[tradingPeriod], allFuels, siteFilter, islandFilter, zoneFilter))

    summarisedGenerationPerTradingPeriod.forEach(tradingPeriodGeneration => {
        allFuels.forEach(fuel => {
            if (fuels[fuel] === undefined) {
                fuels[fuel] = [];
            }

            fuels[fuel].push(tradingPeriodGeneration[fuel] || 0);
        });
    });

    return orderedFuelList(fuels).map(fuel => getDatapointForFuelFilteredGraph(fuel, fuels, fuelFilter));
}

function summariseGenerationByFuelForThisTradingPeriod(liveGenData, tradingPeriodData, allFuels, siteFilter, islandFilter, zoneFilter){
    var generationByFuel = {};

    filterGeneratorList(liveGenData, tradingPeriodData, siteFilter, islandFilter, zoneFilter)
    .forEach(generator => {
        if (generationByFuel[generator.fuel] === undefined) {
            generationByFuel[generator.fuel] = 0;
        }

        generationByFuel[generator.fuel] += generator.gen;

        if (!allFuels.includes(generator.fuel)) {
            allFuels.push(generator.fuel);
        }
    });

    return generationByFuel;
}

export function getTooltipForFuelFilteredGraph(){
    let header = `<b>${this.x}</b><br>`;
    var renewableGeneration = 0;
    var totalGeneration = 0;

    let body = "";

    this.points.forEach(point => {
        if(RENEWABLE_FUELS.includes(point.series.name)){
            renewableGeneration += point.y;
        }
        totalGeneration += point.y;
    })

    this.points.forEach(point => {
        const percentage = Math.round(point.y / totalGeneration * 100);

        body += `<span style="color: ${point.color}">\u25CF</span> ${point.series.name}: <b>${displayMegawattsOrGigawatts(point.y)}</b> (${percentage}%)<br>`;
    })
    
    let footer = `<br>Total Generation: <b>${displayMegawattsOrGigawatts(totalGeneration)}</b><br>`;
    footer += `Renewable: <b>${Math.round(renewableGeneration / totalGeneration * 100)}%</b><br>`;

    return header + body + footer;

}

function orderedFuelList(fuels){
    return keyOrder.filter(fuel => Object.keys(fuels).includes(fuel));
}

function getDatapointForFuelFilteredGraph(fuel, fuels, fuelFilter){
    var fuelName = FUELS_KEY[fuel] || fuel;
    var fuelGenerationListMW = fuels[fuel].map(gen => Math.round(gen));
    return {
        name: fuelName,
        data: fuelGenerationListMW,
        visible: fuelFilter.length == 0 || fuelFilter.includes(fuel),
        color: getColourForFuel(fuel)
    }
}

function isGeneratorInFilter(site, liveGenData, siteFilter, islandFilter, zoneFilter){
    var generator = (liveGenData.generators.filter((gen) => gen.site === site))[0];

    if(siteFilter.length > 0 && !siteFilter.includes(generator.site)){
        return false;
    }

    if(islandFilter.length > 0 && !islandFilter.includes(generator.island)){
        return false;
    }

    if(zoneFilter.length > 0 && !zoneFilter.includes(generator.gridZone)){
        return false;
    }

    return true;
}

function filterGeneratorList(liveGenData, generators, siteFilter, islandFilter, zoneFilter){
    return generators.filter(generator => {
        return isGeneratorInFilter(generator.site, liveGenData, siteFilter, islandFilter, zoneFilter);
    });
}
