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
