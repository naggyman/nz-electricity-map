export class Chart {
    constructor(series){
        this.timestamps = {};
        this.series = series;
    }

    setTimestamp(chartTimestamp){
        this.timestamps[chartTimestamp.timestamp] = chartTimestamp;
    }

    getSeriesAggregatedData(){
        let seriesAggregated = {};
        this.series.forEach((series) => {
            seriesAggregated[series] = []
        });
        
        Object.keys(this.timestamps).forEach((chartTimestamp) => {
            var valuesForThisDatapointPerSeries = {};
            this.series.forEach((series) => {valuesForThisDatapointPerSeries[series] = 0})

            this.timestamps[chartTimestamp].data.forEach((dataPoint) => {
                if(this.filterFunction(dataPoint)){
                    var seriesOfThisDatapoint = this.getSeriesForDatapoint(dataPoint);
                    var valueOfThisDatapoint = this.getValueForDatapoint(dataPoint);
                    valuesForThisDatapointPerSeries[seriesOfThisDatapoint] += valueOfThisDatapoint;
                }
            })

            this.series.forEach((series) => {
                seriesAggregated[series].push(valuesForThisDatapointPerSeries[series])
            })
        })

        return seriesAggregated;
    }
    

    getHighchartSeriesData(){
        var aggregatedData = this.getSeriesAggregatedData();

        console.log(aggregatedData)
        return {}
    }

}