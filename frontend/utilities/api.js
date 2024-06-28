import { getCurrentTimeInNZ } from "./units.js";

var statusSpan = document.getElementById("graph-status");

let localUrl = (path) => `http://[::]:8000/backend/output/${path}`;
let prodUrl = (path) => `https://api.frenchsta.gg/v1/${path}`;

let isProd = (new URLSearchParams(window.location.search)).get('local') !== 'true';

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

const spinnerHtml = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';

export async function getTimeseriesGenerationData(date){
    var currentTimeFormatted = formatDate(getCurrentTimeInNZ());
    var dateStr = formatDate(date);

    if(timeseriesGenerationDataCache[dateStr] && (dateStr != currentTimeFormatted)){
        return timeseriesGenerationDataCache[dateStr];
    }

    statusSpan.innerHTML = `${spinnerHtml} Fetching data for ${date.toLocaleDateString('en-NZ')}`;

    if(!isProd){
        const response = await fetchJson(`5min/${dateStr}.json`)

        timeseriesGenerationDataCache[dateStr] = response;
        return response;
    }
    const response = await fetchJson(`generator-history/5-min/${dateStr}.json`)

    timeseriesGenerationDataCache[dateStr] = response;

    return response;
}

export async function getLiveGenerationData(){
    if (!isProd) {
        return fetchJson('generatorOutput.json');
    }

    return fetchJson('generators');
}

export async function getLiveSubstationData(){
    if (!isProd) {
        return fetchJson('substationOutput.json');
    }

    return fetchJson('nzgrid');
}
