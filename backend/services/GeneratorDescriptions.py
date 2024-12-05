import json

fileName = 'data/generators.json'

class GeneratorDescriptions:
    def __init__(self) -> None:
        with open(fileName) as f:
            self.descriptions = json.load(f)

    def getBySiteCodeAndOperator(self, generatorSiteCode, orgId):
        generatorsThatAreConnectedToSubstationCode = []
        operator = self.getOperatorForOrgId(orgId)

        if operator is None:
            print('Operator not found for orgId - ' + orgId + ' - Site:' + generatorSiteCode)

        for generator in self.descriptions:
            if generator['site'] == generatorSiteCode and generator['operator'] == operator:
                return generator
            elif generator.get('alias') == generatorSiteCode and generator['operator'] == operator:
                return generator

            for unit in generator['units']:
                substationCodeThisUnitIsConnectedTo = unit['node'][:3]
                if substationCodeThisUnitIsConnectedTo == generatorSiteCode:
                    generatorsThatAreConnectedToSubstationCode.append(generator)

        if len(generatorsThatAreConnectedToSubstationCode) == 1:
            return generatorsThatAreConnectedToSubstationCode[0]
        elif len(generatorsThatAreConnectedToSubstationCode) > 1:
            for generator in generatorsThatAreConnectedToSubstationCode:
                if generator['operator'] == operator:
                    return generator
            return None
        
        return None
    
    def getByPointOfConnection(self, poc):
        for generator in self.descriptions:
            for unit in generator['units']:
                if unit['node'] == poc:
                    return generator
        return None
    
    def getOperatorForOrgId(self, orgId):
        match orgId:
            case 'e4dee564-46da-4946-ad87-8801b55fa2ab':
                return "Manawa Energy"
            case '6d8eda92-ed4c-4a1d-b816-eb0f9fafba4e':
                return "Contact Energy"
            case 'e6e0c050-4ad3-44fa-b725-fe197d47a30d':
                return "Mercury"
            case 'f246144f-ec9b-4c32-8b92-5f78ddc7a641':
                return "Meridian Energy"
            case '2f9771c8-7a0c-4dcd-aa48-252899acb58a':
                return "Genesis Energy"
            case 'f68f8eb4-1c55-4a94-9540-bbeb61bac32a':
                return "Todd Energy"
            case 'b6a969d1-18b9-4cbf-9dba-67db91bab877':
                return "Lodestone Energy"
            case '09917588-543f-4432-b93b-ab9b79125c7d':
                return "New Zealand Windfarms"
            case '974531a4-e2e5-49ce-8681-292d353265c8':
                return "NewPower Energy"
            case '47a91736-3771-418a-98a7-a7051e026d8d':
                return "Eastland Generation Ltd"
            case 'e3773753-b431-4ddb-9afb-4b8c9ed65bd1':
                return "Alinta Energy"
            case '0b0c2892-64ad-49db-9744-f58518823973':
                return "Top Energy"
            case '1404708d-a04a-495c-880a-82a4caf42f52':
                return "Genesis Energy"
            case 'b7d81762-b73e-490d-a2f4-f805ab95d167':
                return "Northpower Limited"
            case default:
                return None
            
            # 16 overall
            # 8 here
            # missing 7