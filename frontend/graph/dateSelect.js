import { getCurrentTimeInNZ, formatApiDate } from '../utilities/units.js';
import { setQueryParam } from '../utilities/url.js';

//set query param

export function setupDatepicker(onChangeCallback, buttons) {
    new Datepicker('#date-select', {
        ranged: true,

        min: new Date(2024, 3, 27), //date I started storing historical data
        max: getCurrentTimeInNZ(),

        openOn: new Date(2024, 4, 7),
        
        onChange: function (dates) {
            if(dates !== undefined && dates.length > 0){
                setQueryParam("timeframe", "");
                setQueryParam("dateFrom", formatApiDate(dates[0]));
                
                if(dates.length > 1){
                    setQueryParam("dateTo", formatApiDate(dates[dates.length-1]));
                } else {
                    setQueryParam("dateTo", "");
                }

                onChangeCallback();
                buttons.forEach((button) => {
                    button.classList.remove("btn-primary");
                    button.classList.add("btn-secondary");
                });
            }
        }
    });
}