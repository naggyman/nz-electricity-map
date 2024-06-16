import json

fileName = 'data/generators.json'

class GeneratorDescriptions:
    def __init__(self) -> None:
        with open(fileName) as f:
            self.descriptions = json.load(f)

    def get(self, generator):
        return next((x for x in self.descriptions if x['site'] == generator or (x.get('alias') == generator)), None)
    
    def getByPointOfConnection(self, poc):
        for generator in self.descriptions:
            for unit in generator['units']:
                if unit['node'] == poc:
                    return generator
        return None