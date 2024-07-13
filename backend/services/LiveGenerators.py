from services.GeneratorDescriptions import GeneratorDescriptions
from services.RealTimeDispatch import RealTimeDispatch
from services.Outages import Outages

class LiveGenerators:
    def __init__(self, generatorDescriptions: GeneratorDescriptions, realTimeDispatch: RealTimeDispatch, outages: Outages):
        self.generatorDescriptions = generatorDescriptions
        self.realTimeDispatch = realTimeDispatch
        self.outages = outages

    def getLiveGeneratorOutput(self):
        output = {
            'generators': [],
            'lastUpdate': ''
        }

        output['lastUpdate'] = self.realTimeDispatch.lastUpdated()

        # Real Time Dispatch
        for generator in self.generatorDescriptions.descriptions:
            for unit in generator['units']:
                rtd = self.realTimeDispatch.get(unit['node'])

                unit['outage'] = []
                unit['generation'] = 0

                if rtd is None:
                    print('Node not found in RealTimeDispatch - ' + unit['node'])
                    continue
                
                unit['generation'] = rtd['SPDGenerationMegawatt'] - rtd['SPDLoadMegawatt']
                
                rtd['claimedGeneration'] = True
        
        for node in self.realTimeDispatch.unclaimedGeneration():
            if len(node['PointOfConnectionCode'][7:]) > 0:
                print('Unclaimed node - ' + node['PointOfConnectionCode'])


        # Outages
        for outage in self.outages.outages:
            outageTo = outage['outageBlock'][:3]
            generator = self.generatorDescriptions.get(outageTo)

            if generator is None:
                mwLost = str(outage['mwattLost']) if 'mwattLost' in outage else 'Unknown'
                print('Generator not found for Outage - ' + outageTo + ' ' + mwLost + ' (' + outage['outageBlock'] + ') - Skipping')
                continue

            if(len(generator['units']) == 1):
                # since there is only one unit, we can assume that the outage is for that unit
                generator['units'][0]['outage'].append(self.createOutageOutput(outage))
            else:
                # Seach for the unit that the outage is for, and apply it to that unit
                found = False
                unitToFind = outageTo + outage['outageBlock'][4:]

                for unit in generator['units']:
                    if unit['unitCode'] == unitToFind:
                        unit['outage'].append(self.createOutageOutput(outage))
                        found = True
                        
                if not found:
                    # the 'outage block' is using a different scheme than the 'unit code'. Let's give up being too accurate and just add the outage to the first unit
                    generator['units'][0]['outage'].append(self.createOutageOutput(outage))
            
        for generator in self.generatorDescriptions.descriptions:
            output['generators'].append(generator)

        return output
    
    def createOutageOutput(self, outage):
        return {
            'block': outage['outageBlock'][4:].upper(),
            'mwLost': outage['mwattLost'],
            'mwRemain': outage['mwattRemaining'] if 'mwattRemaining' in outage else None,
            'from': outage['timeStart'],
            'until': outage['timeEnd']
        }
    
    def getIntervalGenerationSummary(self, existingSummary):
        live = self.getLiveGeneratorOutput()
        lastUpdated = live['lastUpdate']

        if lastUpdated in existingSummary:
            print('Last Updated already in existingSummary')
            return existingSummary

        existingSummary[lastUpdated] = []

        for generator in live['generators']:
            totalGeneration = {}
            for unit in generator['units']:
                if unit['fuelCode'] not in totalGeneration:
                    totalGeneration[unit['fuelCode']] = 0
                totalGeneration[unit['fuelCode']] += unit['generation']
            
            for fuel in totalGeneration:
                if totalGeneration[fuel] != 0:
                    existingSummary[lastUpdated].append({
                        "site": generator['site'],
                        "fuel": fuel,
                        "gen": totalGeneration[fuel],
                    })

        return existingSummary
