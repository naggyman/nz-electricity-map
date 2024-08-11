import { detemineMapColour } from "../utilities/colours.js";
import { populateGeneratorPopup, populateSubstationPopup, newBuildGenerationCapacityString } from "./mapPopup.js";
import { underConstruction } from "../utilities/underConstruction.js";
import { getLiveGenerationData, getLiveSubstationData } from "../utilities/api.js";
import { SKIP_LIST, formatFuel } from "../utilities/units.js";

const apiKey = 'c01j05pv67hf1tcqnh8xn34jsba'; //for LINZ basemap

setupMap();

function setupMap() {
    const basemapSelection = getQueryParam("basemap") || 'osm';
    const generatorSelection = getQueryParam("generators") || '1';
    const substationSelection = getQueryParam("substations") || '0';

    const startPos = [
        getQueryParam("lat") || -40.5, 
        getQueryParam("long") || 173
    ];
    const startZoom = getQueryParam("zoom") || 6;

    const linz = L.tileLayer(
        'https://basemaps.linz.govt.nz/v1/tiles/aerial/EPSG:3857/{z}/{x}/{y}.webp?api=' + apiKey, 
        { attribution: '<a href="https://www.linz.govt.nz/data/linz-data/linz-basemaps/data-attribution">LINZ CC BY 4.0 © Imagery Basemap contributors</a>' });

    const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
        { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });

    const baseMaps = {
        "Satellite": linz,
        "Streets": osm
    }

    const generatorMarkers = L.layerGroup();
    const substationLayer = L.layerGroup();
    const underConstructionLayer = L.layerGroup();
    
    const overlays = {
        "Power Stations": generatorMarkers,
        "Substations": substationLayer,
        "Under Construction": underConstructionLayer
    }

    const map = L.map('map');
    
    if(basemapSelection === 'linz'){
        linz.addTo(map);
    } else {
        osm.addTo(map);
    }

    if (generatorSelection === '1') {
        map.addLayer(generatorMarkers);
    }

    if (substationSelection === '1') {
        map.addLayer(substationLayer);
    }

    map.addLayer(underConstructionLayer);
    addUnderConstructionSites(underConstructionLayer);

    map.setView(startPos, startZoom);

    map.on('moveend', (event) => onMapMove(map, event));
    map.on('baselayerchange', (event) => onBaselayerChange(map, event));
    map.on('overlayadd', (event) => onOverlayAdd(map, event));
    map.on('overlayremove', (event) => onOverlayRemove(map, event));

    L.control.layers(baseMaps, overlays).addTo(map);

    getSubstationData(substationLayer);
    window.setInterval(() => getSubstationData(substationLayer), 60000);

    getGenerationData(generatorMarkers);
    window.setInterval(() => getGenerationData(generatorMarkers), 60000);
}

function addUnderConstructionSites(layer){
    underConstruction.forEach((site) => {
        if(site.location === undefined || site.location === null || site.location.lat === undefined) return;
        L.circleMarker([site.location.lat, site.location.long], {
            color: '#000000',
            radius: 4,
            weight: 0.4,
            fill: true,
            fillOpacity: 0.9,
            fillColor: detemineMapColour(site)
        }).bindPopup(
                `<h5>${site.name}</h5>` +
                ((site.locationDescription) ? `<b>${site.locationDescription}</b><br>` : '' ) +
                `<b>Type: </b>${formatFuel(site.fuel)}<br>` + 
                `<b>Status: </b>${site.status}<br>` + 
                `<b>Operator: </b>${site.operator}<br>` +
                `<b> Capacity: </b>` +
                newBuildGenerationCapacityString(site) +
                `<br>` + 
                (site.yearlyGenerationGWh ? `<b>Yearly Generation: </b>${site.yearlyGenerationGWh} GWh</br>` : '') +
                `<b>Expected commissioning by: </b>${(site.openBy) ? new Date(site.openBy).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long' }) : 'Unknown'}`,
            { maxWidth: 800 })
        .addTo(layer)
    });

}

function onMapMove(map, event){
    let centerPoint = map.getCenter();
    let zoomLevel = event.target._zoom;

    setQueryParam('zoom', zoomLevel);
    setQueryParam('lat', centerPoint.lat);
    setQueryParam('long', centerPoint.lng);
}

function onBaselayerChange(map, event){
    if(event.name === 'Satellite'){
        setQueryParam('basemap', 'linz');
    } else if (event.name === 'Streets'){
        setQueryParam('basemap', 'osm');
    }
}

function onOverlayAdd(map, event){
    if(event.name === 'Power Stations'){
        setQueryParam('generators', '1');
    }

    if(event.name === 'Substations'){
        setQueryParam('substations', '1');
    }
}

function onOverlayRemove(map, event){
    console.log("Overlay Removed")
    console.log(event);

    if(event.name === 'Power Stations'){
        setQueryParam('generators', '0');
    }

    if(event.name === 'Substations'){
        setQueryParam('substations', '0');
    }
}

function setQueryParam(param, value){
    var searchParams = new URLSearchParams(window.location.search);

    if(value === ""){
        searchParams.delete(param);
    } else {
        searchParams.set(param, value);
    }

    var newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
    history.replaceState(null, '', newRelativePathQuery);
}

function getQueryParam(param){
    var searchParams = new URLSearchParams(window.location.search);
    return searchParams.get(param);
}

function updateGenerationMap(generationData, generationLayer) {
    generationLayer.clearLayers();
    generationLayer.setZIndex(1);

    var lastUpdatedDate = new Date(generationData.lastUpdate);

    var formattedLastUpdated = lastUpdatedDate.toLocaleDateString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })

    generationData.generators.forEach((generator) => {
        if (generator.location === undefined || generator.location === null || generator.location.lat === undefined) {
            return;
        }

        if(SKIP_LIST.includes(generator.site)) return;

        var markerColour = detemineMapColour(generator.units[0]);
        var generatorHtml = populateGeneratorPopup(generator, formattedLastUpdated);

        L.circleMarker([generator.location.lat, generator.location.long], {
            color: (generator.units[0].fuel == "Hydro") ? '#ffffff' : '#000000',
            radius: 5,
            weight: 0.4,
            fill: true,
            fillOpacity: 0.9,
            fillColor: markerColour
        }).bindPopup(generatorHtml, { maxWidth: 1200 }).addTo(generationLayer)
    });
}

async function getGenerationData(substationMarkers) {
    setNavStatus(`Loading...`);

    const generationData = await getLiveGenerationData();
    var now = new Date();

    var lastUpdatedDate = new Date(generationData.lastUpdate + "+12:00");
    var updatedMinutesAgo = Math.round((now - lastUpdatedDate) / 1000 / 60);
    setNavStatus(`Last Updated: ${updatedMinutesAgo} minutes ago`);

    updateGenerationMap(generationData, substationMarkers);
}

function setNavStatus(value){
    var status = document.getElementById("status");
    status.innerHTML = value;
}

async function getSubstationData(substationLayer) {
    const substationData = await getLiveSubstationData();
    
    updateSubstationMap(substationData, substationLayer);
}

function updateSubstationMap(substationData, substationLayer) {
    let lastUpdated = new Date(substationData.lastUpdated).toLocaleDateString('en-NZ', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })

    substationLayer.clearLayers();
    substationLayer.setZIndex(2);

    substationData.sites.forEach((substation) => {
        if(substation.type !== 'ACSTN'  && substation.totalLoadMW == 0){
            return;
          }
        
        var substationHtml = populateSubstationPopup(substation, lastUpdated);

        L.circleMarker([substation.lat, substation.long], {
            color: '#ffffff',
            radius: 3,
            weight: 1,
            fill: true,
            fillOpacity: 1,
            fillColor: '#000000'
        }).bindPopup(substationHtml, { maxWidth: 800 }).addTo(substationLayer)
    });
}