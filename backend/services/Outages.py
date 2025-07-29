import requests
import datetime

# Retrieved from Transpower POCP: https://customerportal.transpower.co.nz/pocp/outages
pocpApiUrl = 'https://api.transpower.co.nz/v2/so/api/pocp/guest/outages?category=EMBEDDED_GENERATION&category=GENERATION&page=0&planningStatus=CONFIRMED&planningStatus=COMPLETED&size=1000&sort=outageBlock%2Casc'

class Outages:
    def __init__(self) -> None:
        fromDate = (datetime.date.today() - datetime.timedelta(days=14)).strftime("%Y-%m-%d")
        toDate = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        apiQuery = pocpApiUrl + '&dateOption=absolute&outageAtFrom=' + fromDate + 'T00%3A00%3A00.000Z&outageAtTo=' + toDate + 'T00%3A00%3A00.000Z'

        try:
            print("getting outage data from POCP...")
            response = requests.get(apiQuery, timeout=10)

            if response.status_code == 200:
                self.outages = response.json()['items']
            else:
                print("Did not get outage data from POCP - Status Code: " + str(response.status_code))

                with open('output/error.log', 'a') as file:
                    file.write(str(datetime.datetime.now(datetime.timezone.utc)) + ' Failed to get Outage data from POCP - Status Code: ' + str(response.status_code) + '\n')

                self.outages = []
        except Exception as Argument:
            print("Did not get outage data from POCP - Exception")

            with open('output/error.log', 'a') as file:
                file.write(str(datetime.datetime.now(datetime.timezone.utc)) + ' Failed to get Outage data from POCP (Exception): ' + str(Argument) + ' \n')
            self.outages = []

        self.outages.append({
            "orgId": "974531a4-e2e5-49ce-8681-292d353265c8",
            "outageBlock": "TOH_0",
            "timeStart": "2025-01-01T00:00:00+13:00",
            "timeEnd": "2025-09-30T00:00:00+13:00",
            "mwattRemaining": 0,
            "mwattLost": 22.4
            })