import { RENEWABLE_FUELS, displayMegawattsOrGigawatts, FUELS_KEY } from '../utilities/units.js';
import { getColourForFuel } from '../utilities/colours.js';

// defines the order that the fuels will be displayed in the chart
const keyOrder = [
    "BESS",
    "DIE",
    "SOL",
    "WIN",
    "HYD",
    "GAS",
    "CLG",
    "GEO",
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

            //if data was missing for this trading period, we want to leave a gap in the graph
            if(Object.keys(tradingPeriodGeneration).length === 0){
                fuels[fuel].push(null);
                return;
            }

            fuels[fuel].push(tradingPeriodGeneration[fuel] || 0);
        });
    });

    return orderedFuelList(fuels).map(fuel => getDatapointForFuelFilteredGraph(fuel, fuels, fuelFilter));
}

function summariseGenerationByFuelForThisTradingPeriod(liveGenData, tradingPeriodData, allFuels, siteFilter, islandFilter, zoneFilter){
    if(Object.keys(tradingPeriodData).length === 0){
        return {};
    }

    var generationByFuel = {};

    var generatorList = filterGeneratorList(liveGenData, tradingPeriodData, siteFilter, islandFilter, zoneFilter);

    /**
     * Covers the case where there is data for some generators in this trading period,
     * just none for the filters specified.
     * 
     * In this situation we still want to show 0 on the graph, as there is data that proves there was no generation.
     * As opposed to missing data, where we can't say whether or not generation occurred in that period.
     */
    if(generatorList.length === 0){
        allFuels.forEach(fuel => {generationByFuel[fuel] = 0});
    } else {
        generatorList.forEach(generator => {
            if (generationByFuel[generator.fuel] === undefined) {
                generationByFuel[generator.fuel] = 0;
            }
    
            generationByFuel[generator.fuel] += generator.gen;
    
            if (!allFuels.includes(generator.fuel)) {
                allFuels.push(generator.fuel);
            }
        });
    };

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
        const percentage = (totalGeneration != 0) ? Math.round(point.y / totalGeneration * 100) : 0;

        body += `<span style="color: ${point.color}">\u25CF</span> ${point.series.name}: <b>${displayMegawattsOrGigawatts(point.y)}</b> (${percentage}%)<br>`;
    })

    const renewablePercentage = (totalGeneration != 0) ? Math.round(renewableGeneration / totalGeneration * 100) : 0;
    
    let footer = `<br>Total Generation: <b>${displayMegawattsOrGigawatts(totalGeneration)}</b><br>`;
    footer += `Renewable: <b>${renewablePercentage}%</b><br>`;

    return header + body + footer;

}

function orderedFuelList(fuels){
    return keyOrder.filter(fuel => Object.keys(fuels).includes(fuel));
}

function getDatapointForFuelFilteredGraph(fuel, fuels, fuelFilter){
    var fuelName = FUELS_KEY[fuel] || fuel;
    return {
        name: fuelName,
        data: fuels[fuel],
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
