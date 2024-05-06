import { detemineMapColour } from "../utilities/colours.js";

const apiKey = 'c01hrv1pebxm8k47wfehxa7kg8h'; //for LINZ basemap

var isProd = (window.location.origin === 'https://electricitymap.frenchsta.gg');
isProd = true;

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
    
    const overlays = {
        "Power Stations": generatorMarkers,
        "Substations": substationLayer
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

function roundMw(value) {
    return Math.round(value * 100) / 100;
}

function populatePercentage(percentage, green) {
    let html = '';
    if (percentage > 15) {
        html +=
            `<div class="progress" role="progressbar" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar ${(green) ? "bg-success" : ""}" style="width: ${percentage}%">
        <div style="margin-left: 4px;">${percentage}% </div>
        </div>
    </div><br>`
    } else {
        html +=
            `<div class="progress" role="progressbar" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar ${(green) ? "bg-success" : ""}" style="width: ${percentage}%"></div>
        <div style="margin-left: 4px;">${percentage}% </div>
    </div><br>`
    }

    return html;
}

function populateGeneratorPopup(generatorData, lastUpdated) {
    let html = `<h5>${generatorData.name}</h5>`
    html += `${generatorData.operator} (${generatorData.site})<br><br>`

    if (generatorData.units.length > 1) {
        let totalGeneration = 0;
        let totalCapacity = 0;
        let totalOutage = 0;

        generatorData.units.forEach((unit) => {
            if (unit.generation === undefined || unit.generation === null) {
                return;
            }

            var chargingBattery = unit.fuel === 'Battery (Charging)';

            html += `<div style="padding-bottom: 5px;"><b>${unit.name}</b> - ${unit.fuel} - Generation: ${roundMw(unit.generation)}MW / ${roundMw(unit.capacity)}MW<br></div>`;

            totalGeneration += unit.generation;

            if (!chargingBattery) totalCapacity += unit.capacity;

            html += populatePercentage(Math.round(unit.generation / unit.capacity * 100));

            if (unit.outage.length > 0) {
                unit.outage.forEach((outage) => {
                    html += `<div">Outage: ${outage.mwLost}MW</div><br><br>`
                    totalOutage += outage.mwLost;
                })
            }
        })

        html += `<br><b>Total:</b> ${roundMw(totalGeneration)}MW / ${roundMw(totalCapacity)}MW - <b>Outage:</b> ${totalOutage}MW</br>`
        html += populatePercentage(Math.round(totalGeneration / totalCapacity * 100), true);
    } else {
        let unit = generatorData.units[0];
        html += `<div style="padding-bottom: 5px;">${unit.fuel} - Generation: ${roundMw(unit.generation)}MW / ${roundMw(unit.capacity)}MW<br></div>`;
        html += populatePercentage(Math.round(unit.generation / unit.capacity * 100));
    }

    html += `<i> Last Updated: ${lastUpdated}</i>`;
    html += `<br><a href="index.html?site=${generatorData.site}">View Generation Chart</a>`
    return html;
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

        var markerColour = detemineMapColour(generator);
        var generatorHtml = populateGeneratorPopup(generator, formattedLastUpdated);

        L.circleMarker([generator.location.lat, generator.location.long], {
            color: '#ffffff',
            radius: 5,
            weight: 1,
            fill: true,
            fillOpacity: 1,
            fillColor: markerColour
        }).bindPopup(generatorHtml, { maxWidth: 800 }).addTo(generationLayer)
    });
}

async function getGenerationData(substationMarkers) {
    setNavStatus(`Loading...`);

    var generationApiResponse;
    if (!isProd) {
        generationApiResponse = await fetch('/backend/output/generators.json');
    } else {
        generationApiResponse = await fetch('https://api.frenchsta.gg/v1/generators');
    }

    const generationData = await generationApiResponse.json();

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
    let substationApiResponse;

    if (!isProd) {
        substationApiResponse = await fetch('/backend/output.json');
      } else {
        substationApiResponse = await fetch('https://api.frenchsta.gg/v1/nzgrid');
      }

    const substationData = await substationApiResponse.json();
    
    updateSubstationMap(substationData, substationLayer);
}

function populateSubstationPopup(substationData) {
    let html = `<h5>${substationData.description}</h5>`

    html += `<div style="padding-bottom: 0px;"><b>Load:</b> ${substationData.totalLoadMW} MW</div>`

    if(substationData.totalGenerationCapacityMW > 0){
        html += `<div style="padding-bottom: 0px;"><b>Generation:</b> ${substationData.totalGenerationMW} MW / ${substationData.totalGenerationCapacityMW} MW</div>`

        if(substationData.netImportMW > 0){
            html += `<div style="padding-bottom: 0px;"><b>Net Import:</b> ${substationData.netImportMW} MW</div>`
        } else {
            html += `<div style="padding-bottom: 0px;"><b>Net Export:</b> ${0 - substationData.netImportMW} MW</div>`
        }
    }

    Object.keys(substationData.busbars).forEach((busbar) => {
        const details = substationData.busbars[busbar];

        if(details.totalLoadMW > 0 || details.totalGenerationMW > 0){
            html += `<br>`
        }

        if(details.totalLoadMW > 0) {
            html += `<div style="padding-bottom: 0px;"><b>${busbar}:</b> Load: ${details.totalLoadMW} MW ($${details.priceDollarsPerMegawattHour}/MWh)</div>`
        };
        
        if(details.totalGenerationMW > 0){
            details.connections.forEach(connection => {
                if(connection.generatorInfo.plantName != undefined){
                    html += `<div style="padding-bottom: 0px;"><b>${busbar}:</b> Generation: ${connection.generationMW}MW / ${connection.generatorInfo.nameplateCapacityMW}MW (${connection.generatorInfo.plantName} - ${connection.generatorInfo.fuel})</div>`
                }
            })
        }
    })

    return html;
}

function updateSubstationMap(substationData, substationLayer) {
    substationLayer.clearLayers();
    substationLayer.setZIndex(2);

    substationData.sites.forEach((substation) => {
        if(substation.type !== 'ACSTN'  && substation.totalLoadMW == 0){
            return;
          }
        
        var substationHtml = populateSubstationPopup(substation);

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