from services.RealTimeDispatch import RealTimeDispatch
from services.GeneratorDescriptions import GeneratorDescriptions
from services.SubstationDescriptions import SubstationDescriptions

skipList = ["BOT2201", "BOT2202", "NGA1101"]

class LiveSubstations:
    def __init__(self, realTimeDispatch: RealTimeDispatch, generatorDescriptions: GeneratorDescriptions, substationDescriptions: SubstationDescriptions) -> None:
        self.realTimeDispatch = realTimeDispatch
        self.generatorDescriptions = generatorDescriptions
        self.substationDescriptions = substationDescriptions

    def getLiveSubstationOutput(self):
        output = {
            'sites': [],
            'lastUpdated': self.realTimeDispatch.lastUpdated()
        }

        for substation in self.substationDescriptions.descriptions:
            totalLoad = 0
            totalGeneration = 0
            totalGenerationCapacity = 0

            rtdInfo = self.realTimeDispatch.getBySite(substation['siteId'])

            if len(rtdInfo) == 0:
                print('No Real Time Dispatch Information for Substation - ' + substation['siteId'])
                continue

            busbars = {}

            for node in rtdInfo:
                node['claimedSubstation'] = True

                pointOfConnectionCodeSegments = node['PointOfConnectionCode'].split(' ')
                nodeVoltage = pointOfConnectionCodeSegments[0][3:6]
                nodeNumber = pointOfConnectionCodeSegments[0][6:]
                identifier = nodeVoltage + 'kV - ' + nodeNumber
                
                if identifier not in busbars:
                    busbars[identifier] = {
                        'connections': [],
                        "priceDollarsPerMegawattHour": node['DollarsPerMegawattHour'],
                        "voltage": nodeVoltage,
                        "busNumber": nodeNumber,
                        "voltage": nodeVoltage,
                        "totalGenerationMW": 0,
                        "totalLoadMW": 0,
                        "netImportMW": 0,
                    }

                busbars[identifier]['totalLoadMW'] += node['SPDLoadMegawatt']
                busbars[identifier]['totalGenerationMW'] += node['SPDGenerationMegawatt']
                busbars[identifier]['netImportMW'] += busbars[identifier]['totalLoadMW'] - busbars[identifier]['totalGenerationMW']

                totalLoad += node['SPDLoadMegawatt']
                totalGeneration += node['SPDGenerationMegawatt']
                
                busbars[identifier]['connections'].append({
                    "identifier": node['PointOfConnectionCode'],
                    "loadMW": node['SPDLoadMegawatt'],
                    "generationMW": node['SPDGenerationMegawatt'],
                    "generatorInfo": {},
                })

                if len(pointOfConnectionCodeSegments) > 1:
                    generator = self.generatorDescriptions.getByPointOfConnection(node['PointOfConnectionCode'])

                    if generator is not None:
                        thisUnit = {}
                        for unit in generator['units']:
                            if unit['node'] == node['PointOfConnectionCode']:
                                thisUnit = unit
                                break
                        busbars[identifier]['connections'][-1]['generatorInfo'] = {
                            "plantName": thisUnit['name'],
                            "operator": generator['operator'],
                            "technology": "",
                            "fuel": thisUnit['fuel'],
                            "location": {
                                "lat": generator['location']['lat'],
                                "long": generator['location']['long']
                            },
                            "nameplateCapacityMW": thisUnit['capacity'],
                        }

                        totalGenerationCapacity += thisUnit['capacity']
                    else:
                        print('Generator not found for PointOfConnectionCode - ' + node['PointOfConnectionCode'])
                        busbars[identifier]['connections'][-1]['generatorInfo'] = {
                            "plantName": "Unknown"
                        }

            substation['busbars'] = busbars
            substation['netImportMW'] = totalLoad - totalGeneration
            substation['totalGenerationMW'] = totalGeneration
            substation['totalGenerationCapacityMW'] = totalGenerationCapacity
            substation['totalLoadMW'] = totalLoad
            output['sites'].append(substation)

        for node in self.realTimeDispatch.unclaimedSubstation():
            if(node['PointOfConnectionCode'] in skipList and node['SPDLoadMegawatt'] == 0 and node['SPDGenerationMegawatt'] == 0):
                continue
            print('No Substation Information for PointOfConnectionCode - ' + node['PointOfConnectionCode'] + ' ' + str(node['SPDLoadMegawatt']) + 'MW ' + str(node['SPDGenerationMegawatt']) + 'MW')

        return output