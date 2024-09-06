export function displayMegawattsOrGigawatts(input) {
    var rounded = input.toFixed(1);

    if (rounded >= 1000) {
        return (input / 1000).toFixed(2) + " GW";
    }

    if((rounded % 1) == 0){
        return Math.floor(input) + " MW";
    }

    return rounded + " MW"
}

export const RENEWABLE_FUELS = ["Hydro", "Geothermal", "Wind", "Solar"];

export const FUELS_KEY = {
    "HYD": "Hydro",
    "GEO": "Geothermal",
    "GAS": "Gas",
    "CLG": "Coal/Gas",
    "WIN": "Wind",
    "SOL": "Solar",
    "BESS": "Battery (Discharging)",
    "BESS-C": "Battery (Charging)",
    "DIE": "Diesel"
}

// units to not show in the UI
export const SKIP_LIST = [
    'SZR' // SolarZero is modelled in a funky way in the data I have. For now, I am removing it.
];

export function getCurrentTimeInNZ(){
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
}

export function getDateRelativeToNowInNZ(daysAgo = 0, hoursAgo = 0){
    var currentTimeInNZ = getCurrentTimeInNZ();

    const adjustedByDaysAgo = new Date(currentTimeInNZ.setDate(currentTimeInNZ.getDate() - daysAgo));
    return new Date(adjustedByDaysAgo.setHours(currentTimeInNZ.getHours() - hoursAgo));
}

export function formatDate(date){
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export function formatFuel(fuel){
    var emoji = "";

    switch(fuel){
        case "Solar": emoji = "☀️"; break;
        case "Hydro": emoji = "🌊"; break;
        case "Battery": 
        case "Battery (Charging)":
            emoji = "🔋"; break;
        case "Battery (Discharging)": emoji = "🪫"; break
        case "Geothermal": emoji = "🌋"; break;
        case "Wind": emoji = "💨"; break;
        case "Gas": emoji = "🔥"; break;
        case "Coal/Gas": emoji = "🏭"; break;
        case "Diesel": emoji = "🛢️"; break;
    }

    return `${emoji} ${fuel}`;
}