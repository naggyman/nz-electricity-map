import json
from os import path
from services.LiveGenerators import LiveGenerators
from services.LiveSubstations import LiveSubstations
from services.GeneratorDescriptions import GeneratorDescriptions
from services.SubstationDescriptions import SubstationDescriptions
from services.RealTimeDispatch import RealTimeDispatch
from services.Outages import Outages

pathPrefix = 'output/'
generatorOutput = pathPrefix + 'generatorOutput.json'
substationOutput = pathPrefix + 'substationOutput.json'

def __init__():
    genDesc = GeneratorDescriptions()
    substationDescriptions = SubstationDescriptions()
    realTimeDispatch = RealTimeDispatch()
    outages = Outages()
    
    liveGenerators = LiveGenerators(genDesc, realTimeDispatch, outages)
    liveSubstations = LiveSubstations(realTimeDispatch, genDesc, substationDescriptions)

    createGeneratorOutputFile(liveGenerators)
    create5MinuteIntervalFile(liveGenerators, realTimeDispatch)
    createSubstationOutputFile(liveSubstations)

def create5MinuteIntervalFile(liveGenerators: LiveGenerators, realTimeDispatch: RealTimeDispatch):
    lastUpdated = realTimeDispatch.lastUpdated()

    existingData = {}
    dailyFile = pathPrefix + lastUpdated.split('T')[0] + '.json'

    if path.isfile(dailyFile) is True:
        with open(dailyFile) as fp:
            existingData = json.load(fp)

    with open(dailyFile, 'w') as file:
        file.write(json.dumps(liveGenerators.getIntervalGenerationSummary(existingData), indent=1))

def createGeneratorOutputFile(liveGenerators: LiveGenerators):
    with open(generatorOutput, 'w') as file:
        file.write(json.dumps(liveGenerators.getLiveGeneratorOutput(), indent=1))

def createSubstationOutputFile(liveSubstations: LiveSubstations):
    with open(substationOutput, 'w') as file:
        file.write(json.dumps(liveSubstations.getLiveSubstationOutput(), indent=1))

__init__()