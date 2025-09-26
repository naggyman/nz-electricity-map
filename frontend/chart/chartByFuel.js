import { Chart } from '../chart/chart.js';

const chartSeries = [
    "BESS",
    "DIE",
    "HYD",
    "SOL",
    "WIN",
    "GAS",
    "CLG",
    "GEO",
    "BESS-C"
];

export class ChartByFuel extends Chart {
    constructor(){
        super(chartSeries)
        this.siteFilter = []
    }

    filterFunction(dataPoint){
        if(this.siteFilter.length === 0){
            return true;
        }

        return this.siteFilter.includes(dataPoint.site)
    }

    setSiteFilter(sites){
        this.siteFilter = sites;
    }

    getSeriesForDatapoint(dataPoint){
        return dataPoint.fuel;
    }

    getValueForDatapoint(dataPoint){
        return dataPoint.gen;
    }
}