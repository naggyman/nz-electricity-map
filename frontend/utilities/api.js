import { getCurrentTimeInNZ } from "./units.js";

let localUrl = (path) => `http://[::]:8000/backend/output/${path}`;
let prodUrl = (path) => `https://api.frenchsta.gg/v1/${path}`;
let isProd = (window.location.origin === 'https://electricitymap.frenchsta.gg');

isProd = true;

let timeseriesGenerationDataCache = {};

export async function fetchJson(path){
    let data = {};

    if (isProd) {
        data = await fetch(prodUrl(path));
    } else {
        data = await fetch(localUrl(path));
    }

    return data.json();
}

function formatDate(date){
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export async function getTimeseriesGenerationData(date){
    var currentTimeFormatted = formatDate(getCurrentTimeInNZ());
    var dateStr = formatDate(date);

    if(timeseriesGenerationDataCache[dateStr] && (dateStr != currentTimeFormatted)){
        return timeseriesGenerationDataCache[dateStr];
    }

    const response = await fetchJson(`generator-history/5-min/${dateStr}.json`)

    timeseriesGenerationDataCache[dateStr] = response;

    return response;
}

export async function getLiveGenerationData(){
    if (!isProd) {
        return fetchJson('generators.json');
    }

    return fetchJson('generators');
}
