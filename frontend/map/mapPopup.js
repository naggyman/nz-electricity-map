function roundMw(value) {
    return Math.round(value * 100) / 100;
}

function populatePercentage(percentage, green) {
    let html = '';
    if (isNaN(percentage)) {
        percentage = 0;
    }

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
        ${generatorData.operator} <span class="badge text-bg-primary">${generatorData.site}</span><br><br>
        ${populateGenerationData(generatorData)}
        <i> Last Updated: ${lastUpdated}</i>
        <br><a href="index.html?site=${generatorData.site}&timeframe=-3h&redirect=true">View Generation Chart</a>
            `;
}

function populateGenerationData(generatorData) {
    if (generatorData.units.filter((unit) => unit.capacity != 0).length > 1) {
        return populateGeneratorUnitList(generatorData);
    }

    return populateGenerationUnit(generatorData.units[0], false);
}

function unitHasAnOutageEndDate(unit){
    return "until" in unit.outage[unit.outage.length - 1]
}

function populateGenerationUnit(unit, showName = true) {
    let outageLoss = calculateOutageLoss(unit.outage);
    let totalCapacityIncludingOutage = unit.capacity - outageLoss;
    let name = (showName) ? `<b>${unit.name}</b> - ` : '';

    let hasOutage = unit.outage?.length > 0 && unit.generation <= totalCapacityIncludingOutage;

    if(!hasOutage){
        // sometimes the outage figures make absolutely no sense (e.g 65MW generation, 120MW capacity, 70MW outage)
        // so in those situations we just ignore the outage, since it would result in > 100% generation
        totalCapacityIncludingOutage = unit.capacity;
    }

    let outageEnd = (hasOutage && unitHasAnOutageEndDate(unit)) ? 
        `until ${new Date(unit.outage[unit.outage.length - 1].until).toLocaleDateString('en-NZ', { year: "numeric", month: "short", day: "numeric" })}` 
        : "";

    let outageBadge = (hasOutage) ? 
        `<s>${roundMw(unit.capacity)}MW</s> ${roundMw(totalCapacityIncludingOutage)}MW <span class="badge text-bg-danger">${outageLoss}MW Outage ${outageEnd}</span>` 
        : `${roundMw(totalCapacityIncludingOutage)}MW`

    return `
        <div style="padding-bottom: 5px;">
            ${name} ${unit.fuel} - Generation: ${roundMw(unit.generation)}MW /  ${outageBadge}<br>
            ${populatePercentage(Math.round(unit.generation / totalCapacityIncludingOutage * 100))}
        </div>`
}

function calculateOutageLoss(outages) {
    return outages.reduce((total, outage) => total + outage.mwLost, 0);
}

function populateGeneratorUnitList(generatorData) {
    let totalGeneration = 0;
    let totalCapacity = 0;
    let totalOutage = 0;
    let html = '';

    generatorData.units.sort((a, b) => a.unitCode.localeCompare(b.unitCode)).forEach((unit) => {
        if (unit.generation === undefined || unit.generation === null) {
            return;
        }

        totalGeneration += unit.generation;
        if (!chargingBattery(unit)) totalCapacity += unit.capacity; //if we didn't do this, units with both charging and discharging would show as 0MW capacity.

        totalOutage += calculateOutageLoss(unit.outage);
        html += populateGenerationUnit(unit);
    })

    html += `<br><b>Total:</b> ${roundMw(totalGeneration)}MW /  ${(totalOutage != 0) ? `<s>${roundMw(totalCapacity)}MW</s> ${roundMw(totalCapacity - totalOutage)}MW <span class="badge text-bg-danger">${totalOutage}MW Outage</span>` : `${roundMw(totalCapacity - totalOutage)}MW`}</br>`
    html += populatePercentage(Math.round(totalGeneration / (totalCapacity - totalOutage) * 100), true);

    return html;
}

let chargingBattery = (unit) => unit.fuel === "Battery (Charging)";

export function populateSubstationPopup(substationData) {
    let html = `
        <h5>${substationData.description}</h5>
        <div style="padding-bottom: 0px;"><b>Load:</b> ${substationData.totalLoadMW} MW</div>
    `

    if (substationData.totalGenerationCapacityMW > 0) {
        html += `<div style="padding-bottom: 0px;"><b>Generation:</b> ${substationData.totalGenerationMW} MW / ${substationData.totalGenerationCapacityMW} MW</div>`

        if (substationData.netImportMW > 0) {
            html += `<div style="padding-bottom: 0px;"><b>Net Import:</b> ${substationData.netImportMW} MW</div>`
        } else {
            html += `<div style="padding-bottom: 0px;"><b>Net Export:</b> ${0 - substationData.netImportMW} MW</div>`
        }
    }

    html += '<br>';

    Object.keys(substationData.busbars).forEach((busbar) => {
        const details = substationData.busbars[busbar];

        html += `<div style="padding-bottom: 0px;"><b>${busbar}:</b> Load: ${details.totalLoadMW} MW ($${details.priceDollarsPerMegawattHour}/MWh)</div>`

        details.connections.forEach(connection => {
            if (connection.generatorInfo.plantName != undefined) {
                html += `<div style="padding-bottom: 0px;">-- Generation: ${connection.generationMW}MW / ${connection.generatorInfo.nameplateCapacityMW}MW (${connection.generatorInfo.plantName} - ${connection.generatorInfo.fuel})</div>`
            }
        })

    })

    return html;
}