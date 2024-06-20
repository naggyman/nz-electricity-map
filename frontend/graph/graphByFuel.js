import { RENEWABLE_FUELS, displayMegawattsOrGigawatts, FUELS_KEY, SKIP_LIST } from '../utilities/units.js';
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
    var outputGenerationByFuel = {};
    
    var filteredGeneratorList = liveGenData.generators.filter(generator => {
        return isGeneratorInFilter(generator, siteFilter, islandFilter, zoneFilter);
    });
    
    // find all of the fuels that we will need to chart
    var allFuels = [];
    filteredGeneratorList.forEach(generator => {
        generator.units.forEach(unit => {
            const fuelKey = Object.keys(FUELS_KEY).at(Object.values(FUELS_KEY).indexOf(unit.fuel));
            
            if(fuelKey === "BESS" && !allFuels.includes("BESS-C")){
                allFuels.push("BESS-C");
                outputGenerationByFuel["BESS-C"] = [];
            }

            if (!allFuels.includes(fuelKey)) {
                allFuels.push(fuelKey);
                outputGenerationByFuel[fuelKey] = [];
            }
        });
    });

    tradingPeriodTimestamps.forEach(tradingPeriodTimestamp => {
        var gens = Object.keys(data[tradingPeriodTimestamp]);
        if(gens.length === 0){ //do generation data for this trading period - leave a gap in the graph
            allFuels.forEach(fuel => {
                outputGenerationByFuel[fuel].push(null);
            });
            return;
        }

        var generationData = data[tradingPeriodTimestamp];
        var thisTradingPeriodSummaryByFuel = {};

        filteredGeneratorList.forEach(generator => {
            // find the data from this trading period for this generator
            var genData = generationData.filter(gen => gen.site === generator.site);
            if(genData.length == 0){
                return;
            }

            genData.forEach(generationDataPoint => {
                if(generationDataPoint.fuel === "BESS" && generationDataPoint.gen < 0){
                    // negative generation from a battery is charging
                    generationDataPoint.fuel = "BESS-C";
                }

                // append it - to the relevant fuel
                thisTradingPeriodSummaryByFuel[generationDataPoint.fuel] = (thisTradingPeriodSummaryByFuel[generationDataPoint.fuel] || 0) + generationDataPoint.gen;
            });
        });
 
        // for all fuels we will graph, find their summarised generation for this trading period
        allFuels.forEach(fuel => {
            outputGenerationByFuel[fuel].push(thisTradingPeriodSummaryByFuel[fuel] || 0);
        });
    });

    return orderedFuelList(outputGenerationByFuel)
        .map(fuel => getHighchartDatapointForFuel(fuel, outputGenerationByFuel, fuelFilter));
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
        if(point.y == 0){
            body += `
                <span style="color: ${point.color}">\u25CF</span> 
                ${point.series.name}: 0 MW
                <br>`;
        } else {
            const generationSum = point.y;
            const percentage = (totalGeneration != 0) ? Math.round(generationSum / totalGeneration * 100) : 0;

            body += `
                <span style="color: ${point.color}">\u25CF</span> 
                ${point.series.name}: <b>${displayMegawattsOrGigawatts(generationSum)}</b> (${percentage}%)
                <br>`;
        }
    })

    const renewablePercentage = (totalGeneration != 0) ? Math.round(renewableGeneration / totalGeneration * 100) : 0;
    
    let footer = `<br>Total Generation: <b>${displayMegawattsOrGigawatts(totalGeneration)}</b><br>`;
    footer += `Renewable: <b>${renewablePercentage}%</b><br>`;

    return header + body + footer;

}

function orderedFuelList(fuels){
    return keyOrder.filter(fuel => Object.keys(fuels).includes(fuel));
}

function getHighchartDatapointForFuel(fuel, fuels, fuelFilter){
    var fuelName = FUELS_KEY[fuel] || fuel;
    return {
        name: fuelName,
        stack: (fuels[fuel].some((x) => x > 0)) ? "positive": "negative",
        data: fuels[fuel],
        visible: fuelFilter.length == 0 || fuelFilter.includes(fuel),
        color: getColourForFuel(fuel)
    }
}

function isGeneratorInFilter(generator, siteFilter, islandFilter, zoneFilter){
    if(SKIP_LIST.includes(generator.site)){
        return false;
    }

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
