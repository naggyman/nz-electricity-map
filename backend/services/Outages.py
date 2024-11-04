import requests
import datetime

# Retrieved from Transpower POCP: https://customerportal.transpower.co.nz/pocp/outages
pocpApiUrl = 'https://api.transpower.co.nz/v2/so/api/pocp/guest/outages?category=EMBEDDED_GENERATION&category=GENERATION&page=0&planningStatus=CONFIRMED&planningStatus=COMPLETED&size=1000&sort=outageBlock%2Casc'

class Outages:
    def __init__(self) -> None:
        fromDate = (datetime.date.today() - datetime.timedelta(days=14)).strftime("%Y-%m-%d")
        toDate = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        apiQuery = pocpApiUrl + '&dateOption=absolute&outageAtFrom=' + fromDate + 'T00%3A00%3A00.000Z&outageAtTo=' + toDate + 'T00%3A00%3A00.000Z'

        response = requests.get(apiQuery)

        if response.status_code == 200:
            self.outages = response.json()['items']
        else:
            self.outages = []

        # add a fake outage for generators not yet commissioned
        self.outages.append({
            "orgId": "6d8eda92-ed4c-4a1d-b816-eb0f9fafba4e",
            "outageBlock": "TAC_0",
            "timeStart": "2024-01-01T00:00:00+13:00",
            "timeEnd": "2024-12-31T23:59:59+13:00",
            "mwattRemaining": 0,
            "mwattLost": 51.4
            })
            
        # Ruakaka BESS
        self.outages.append({
            "orgId": "f246144f-ec9b-4c32-8b92-5f78ddc7a641",
            "outageBlock": "RUK_0",
            "timeStart": "2024-01-01T00:00:00+13:00",
            "timeEnd": "2025-03-31T23:59:59+13:00",
            "mwattRemaining": 0,
            "mwattLost": 100
            })

        self.outages.append({
            "orgId": "f246144f-ec9b-4c32-8b92-5f78ddc7a641",
            "outageBlock": "RUK_99",
            "timeStart": "2024-01-01T00:00:00+13:00",
            "timeEnd": "2025-03-31T23:59:59+13:00",
            "mwattRemaining": 0,
            "mwattLost": 100
            })
        
        self.outages.append({
            "orgId": "b7d81762-b73e-490d-a2f4-f805ab95d167",
            "outageBlock": "RWI_0",
            "timeStart": "2024-01-01T00:00:00+13:00",
            "timeEnd": "2024-12-31T23:59:59+13:00",
            "mwattRemaining": 0,
            "mwattLost": 14
            })