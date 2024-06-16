import json

fileName = 'data/substations.json'

class SubstationDescriptions:
    def __init__(self) -> None:
        with open(fileName) as f:
            self.descriptions = json.load(f)