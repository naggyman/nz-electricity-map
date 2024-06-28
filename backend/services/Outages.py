import requests

# Retrieved from Transpower POCP: https://customerportal.transpower.co.nz/pocp/outages
pocpApiUrl = 'https://api.transpower.co.nz/v2/so/api/pocp/guest/outages?category=GENERATION&dateOption=relative&nextCount=1&nextUnit=days&page=0&planningStatus=CONFIRMED&planningStatus=COMPLETED&size=1000&sort=outageBlock%2Casc'

class Outages:
    def __init__(self) -> None:
        response = requests.get(pocpApiUrl)

        if response.status_code == 200:
            self.outages = response.json()['items']
        else:
            self.outages = []
