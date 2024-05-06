export function displayMegawattsOrGigawatts(input) {
    return (input > 1000) ? Math.round(input) / 1000 + " GW" : Math.round(input) + " MW";
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

export function getCurrentTimeInNZ(){
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
}

export function getDateRelativeToNowInNZ(daysAgo = 0, hoursAgo = 0){
    var currentTimeInNZ = getCurrentTimeInNZ();

    const adjustedByDaysAgo = new Date(currentTimeInNZ.setDate(currentTimeInNZ.getDate() - daysAgo));
    return new Date(adjustedByDaysAgo.setHours(currentTimeInNZ.getHours() - hoursAgo));
}