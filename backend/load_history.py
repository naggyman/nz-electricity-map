import requests
import csv
import json
import datetime
from services.RealTimeDispatch import RealTimeDispatch
from services.GeneratorDescriptions import GeneratorDescriptions
from services.LiveGenerators import LiveGenerators

def getNodalData(year, month, day):
    genDesc = GeneratorDescriptions()

    combined = year + month + day

    url = 'https://www.emi.ea.govt.nz/Wholesale/Datasets/DispatchAndPricing/NodalPricesAndVolumes/' + year + '/' + combined + '_DispatchNodalPricesAndVolumes.csv'
    print(url)

    response = requests.get(url)

    if response.status_code != 200:
        print('Failed to get Nodal Data')
        return

    rows = csv.reader(response.content.decode('utf-8').splitlines())

    timestamps = {}

    for row in rows:
        timestamp = row[2]

        if timestamp == 'IntervalDateTime':
            continue #skip the header row in the csv

        if timestamp not in timestamps:
            timestamps[timestamp] = []

        pointOfConnectionCode = row[6]
        unitCode = (' ' + row[7]) if row[7] != 'N/A' else ''
        pointOfConnectionAndUnitCode = pointOfConnectionCode + unitCode

        # if (len(pointOfConnectionCode) != 7):
        #     print('Invalid Point of Connection Code: ' + pointOfConnectionAndUnitCode)
        #     return

        timestamps[timestamp].append({
            "PointOfConnectionCode": pointOfConnectionAndUnitCode,
            "FiveMinuteIntervalDatetime": row[2],
            "FiveMinuteIntervalNumber": 0,
            "RunDateTime": row[3],
            "SPDLoadMegawatt": float(row[10]),
            "SPDGenerationMegawatt": float(row[12]),
            "DollarsPerMegawattHour": row[14]
        })

    output = {}

    for timestamp in timestamps:
        rtd = RealTimeDispatch(timestamps[timestamp])
        liveGen = LiveGenerators(genDesc, rtd, None)
        output = liveGen.getIntervalGenerationSummary(output)
        print('Processed ' + timestamp)

    with open('output/5min/' + year + '-' + month + '-' + day + '.json', 'w') as file:
        file.write(json.dumps(output, indent=1))


def main():
    now = datetime.datetime.now()

    current_day = datetime.datetime(2020, 9, 10)

    while current_day < datetime.datetime(2024, 1, 1):
        print('Checking: ' + current_day.strftime('%Y-%m-%d %H:%M:%S'))
        getNodalData(current_day.strftime('%Y'), current_day.strftime('%m'), current_day.strftime('%d'))
        current_day = current_day + datetime.timedelta(days=1)
        

    #print('Starting: ' + current_day.strftime('%Y-%m-%d %H:%M:%S'))
    #getNodalData('2020', '09', '18')


if __name__ == '__main__':
    main()