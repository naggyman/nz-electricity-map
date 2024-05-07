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
            </div>
            <br>`
    } else {
        html +=
            `<div class="progress" role="progressbar" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar ${(green) ? "bg-success" : ""}" style="width: ${percentage}%"></div>
                <div style="margin-left: 4px;">${percentage}% </div>
            </div>
        <br>`
    }

    return html;
}

export function populateGeneratorPopup(generatorData, lastUpdated) {
    return `
        <h5>${generatorData.name}</h5>
        ${generatorData.operator} (${generatorData.site})<br><br>
        ${populateGenerationData(generatorData)}
        <i> Last Updated: ${lastUpdated}</i>
        <br><a href="index.html?site=${generatorData.site}">View Generation Chart</a>
            `;
}

function populateGenerationData(generatorData){
    if(generatorData.units.length > 1){
        return populateGeneratorUnitList(generatorData);
    }

    return populateGenerationUnit(generatorData.units[0]);
}

function populateGenerationUnit(unit){
    return `
        <div style="padding-bottom: 5px;">
            <b>${unit.name}</b> - ${unit.fuel} - Generation: ${roundMw(unit.generation)}MW / ${roundMw(unit.capacity)}MW<br>
        </div>`
}

function populateGeneratorUnitList(generatorData) {
    let totalGeneration = 0;
    let totalCapacity = 0;
    let totalOutage = 0;
    let html = '';

    generatorData.units.forEach((unit) => {
        if (unit.generation === undefined || unit.generation === null) {
            return;
        }

        totalGeneration += unit.generation;
        if (!chargingBattery(unit)) totalCapacity += unit.capacity;

        html += populateGenerationUnit(unit);

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

    return html;
}

let chargingBattery = (unit) => unit.fuel === "Battery (Charging)";

export function populateSubstationPopup(substationData) {
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