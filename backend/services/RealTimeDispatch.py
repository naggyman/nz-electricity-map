import requests
import os

# Uses the EMI Real Time Dispatch API
# Documentation Available here: https://emi.developer.azure-api.net/api-details#api=5f98fa890cf73b31bad09e10&operation=5f98fa8b243aa88e0dbe9741

emiApiUrl = 'https://emi.azure-api.net/real-time-dispatch/'
apiKey = os.environ['EMI_API_KEY']

class RealTimeDispatch:
    response = {}

    def __init__(self) -> None:
        response = requests.get(emiApiUrl, headers={'Ocp-Apim-Subscription-Key': apiKey})

        if response.status_code != 200:
            raise Exception('Failed to get Real Time Dispatch data')

        self.response = response.json()
    
    def get(self, node):
        return next((x for x in self.response if x['PointOfConnectionCode'] == node), None)
    
    def getBySite(self, site):
        return list(filter(lambda x: x['PointOfConnectionCode'][:3] == site, self.response))
    
    def lastUpdated(self):
        return self.response[0]['FiveMinuteIntervalDatetime']
    
    def unclaimedGeneration(self):
        return [x for x in self.response if not x.get('claimedGeneration', False)]
    
    def unclaimedSubstation(self):
        return [x for x in self.response if not x.get('claimedSubstation', False)]