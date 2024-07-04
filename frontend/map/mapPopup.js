import { underConstruction } from '../utilities/underConstruction.js';
import { displayMegawattsOrGigawatts } from '../utilities/units.js';

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
    let popup = `
        <h5>${generatorData.name}</h5>
        ${generatorData.operator} <span class="badge text-bg-primary">${generatorData.site}</span><br><br>
        ${populateGenerationData(generatorData)}
        <i> Last Updated: ${lastUpdated}</i>
        <br><a href="index.html?site=${generatorData.site}&timeframe=-0d&redirect=true">View Generation Chart</a>
            `;

    if(generatorData.units.some((unit) => unit.outage.length > 0)){
        let pocpPrePopulatedSearch = `https://customerportal.transpower.co.nz/pocp/outages?displayedFilters=%7B%22category%22%3Atrue%2C%22planningStatus%22%3Atrue%7D&filter=%7B%22dateOption%22%3A%22relative%22%2C%22nextUnit%22%3A%22days%22%2C%22nextCount%22%3A1%2C%22category%22%3A%5B%22GENERATION%22%5D%2C%22planningStatus%22%3A%5B%22CONFIRMED%22%5D%2C%22q%22%3A%22${generatorData.site}%22%7D&order=ASC&page=1&perPage=10&sort=timeStart&viewType=list`;

        popup += `| <a href="${pocpPrePopulatedSearch}" target="_blank">View Outage Info</a>`
    }

    let underConstructionData = underConstruction.find((uc) => uc.site === generatorData.site);
    if(underConstructionData){
        popup += `<br><br><i><b>Under Construction</b></i><br>${underConstructionData.name}<br><b>Capacity: </b>${underConstructionData.capacity}<br><b>Opening: </b>${underConstructionData.opening}`
    }
    
    return popup;
}

function populateGenerationData(generatorData) {
    if (generatorData.units.filter((unit) => unit.capacity != 0).length > 1) {
        return populateGeneratorUnitList(generatorData);
    }

    return populateGenerationUnit(generatorData.units[0], false);
}

function populateGenerationUnit(unit, showName = true) {
    let outageLoss = calculateOutageLoss(unit.outage);
    let unitCapacity = unit.capacity;

    if(outageLoss > Math.abs(unitCapacity)){
        // outage figures can sometimes sum up to more than the capacity of the unit, let's assume that in that situation the unit is just fully in outage.
        console.warn(`Outage loss (${outageLoss}MW) for ${unit.name} is greater than the capacity (${unitCapacity}MW) of the unit, assuming the unit is fully in outage.`);
        outageLoss = unitCapacity;
    }

    let totalCapacityIncludingOutage = unitCapacity - outageLoss;

    if("installedCapacity" in unit){
        // outages are sometimes calculated based off the installed capacity, not the actual maximum service generation capacity of the unit
        // example is Manapouri, which has an installed capacity of 896MW across all units but is only allowed to generate 800MW through resource consent limits.
        // in that scenario we use the installed capacity to calculate the total capacity including outage
        totalCapacityIncludingOutage = unit.installedCapacity - outageLoss;
    }

    //let hasOutage = unit.outage?.length > 0;
    let hasOutage = outageLoss > 0;

    if(hasOutage && unit.generation > totalCapacityIncludingOutage){
        // sometimes the outage figures make absolutely no sense (e.g 65MW generation, 120MW capacity, 70MW outage)
        // so in those situations we just ignore the outage, since it would result in > 100% generation
        console.warn(`Generation (${unit.generation}MW) for ${unit.name} is greater than the capacity (${totalCapacityIncludingOutage}MW) of the unit, ignoring outage (${outageLoss}MW).`);
        hasOutage = false;
        totalCapacityIncludingOutage = unitCapacity;
    }

    let capacityText = `${displayMegawattsOrGigawatts(totalCapacityIncludingOutage)}`;

    if(hasOutage){
        let outages = filterOutages(unit.outage).sort((a,b) => new Date(a.until) - new Date(b.until));
        let outageEndDate = new Date(outages[0].until);
        let formattedOutageEndDate = outageEndDate.toLocaleDateString('en-NZ', { year: "numeric", month: "short", day: "numeric" });

        let today = new Date();

        if(today.getFullYear() == outageEndDate.getFullYear() && today.getMonth() == outageEndDate.getMonth() && today.getDate() == outageEndDate.getDate()){
            formattedOutageEndDate = outageEndDate.toLocaleTimeString('en-NZ', { hour: "numeric", minute: "numeric" });
        }

        capacityText = 
            `<s>${displayMegawattsOrGigawatts(unitCapacity)}</s> ${capacityText} ` + 
            `<span class="badge text-bg-danger">${outageLoss}MW Outage until ${formattedOutageEndDate}</span>`;
    }

    let name = (showName) ? `<b>${unit.name}</b> - ` : '';

    return `
        <div style="padding-bottom: 5px;">
            ${name} ${unit.fuel} - Generation: ${displayMegawattsOrGigawatts(unit.generation)} /  ${capacityText}<br>
            ${populatePercentage(Math.round(unit.generation / totalCapacityIncludingOutage * 100))}
        </div>`
}

function calculateOutageLoss(outages) {
    return filterOutages(outages).reduce((total, outage) => total + outage.mwLost, 0);
}

function filterOutages(outages){
    return outages.filter((outage) => {
        var current = new Date(outage.from) < new Date() && new Date(outage.until) > new Date();
        return current;
    })
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
        if (!chargingBattery(unit)){ //if we didn't check this, generators with both charging and discharging units would show as 0MW capacity (as they'd cancel eachother out).
            totalCapacity += unit.capacity; 
        }

        totalOutage += calculateOutageLoss(unit.outage);
        html += populateGenerationUnit(unit);
    })

    let outageText = (totalOutage != 0) ? `<s>${displayMegawattsOrGigawatts(totalCapacity)}</s> ${displayMegawattsOrGigawatts(totalCapacity - totalOutage)} <span class="badge text-bg-danger">${totalOutage}MW Outage</span>` 
    : `${displayMegawattsOrGigawatts(totalCapacity)}`;

    html += `<br><b>Total:</b> ${displayMegawattsOrGigawatts(totalGeneration)} <br><b>Capacity:</b> ${outageText}</br>`
    html += populatePercentage(Math.round(Math.abs(totalGeneration) / (totalCapacity - totalOutage) * 100), true);

    return html;
}

let chargingBattery = (unit) => unit.fuel === "Battery (Charging)";

function getSubstationBusbarRows(substationData){
    let html = '';

    Object.keys(substationData.busbars).forEach((busbar) => {
        const details = substationData.busbars[busbar];

        html += `<tr>
            <td>${busbar}</td>
            <td>${displayMegawattsOrGigawatts(details.totalLoadMW)}</td>
            <td>$${details.priceDollarsPerMegawattHour}/MWh</td>
        </tr>`
    })
    return html;
}

function getSubstationGenerationRows(substationData){
    let html = '';

    Object.keys(substationData.busbars).forEach((busbar) => {
        substationData.busbars[busbar].connections.forEach(connection => {
            if (connection.generatorInfo.plantName != undefined) {
                let percentage = Math.round(connection.generationMW / connection.generatorInfo.nameplateCapacityMW * 100);
                let percentageDiv = `<div style="margin-left: 4px;">${percentage}% </div>`

                html += `<tr>
                    <td>${connection.generatorInfo.plantName}</td>
                    <td>${connection.generatorInfo.fuel}</td>
                    <td>${displayMegawattsOrGigawatts(connection.generationMW)}</td>
                    <td>${displayMegawattsOrGigawatts(connection.generatorInfo.nameplateCapacityMW)}</td>
                    <td>
                         <div class="progress" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar bg-success" style="width: ${percentage}%">
                                ${(percentage >= 40) ? percentageDiv : ''}
                            </div>
                            ${(percentage < 40 && percentage > 0) ? percentageDiv : ''}
                        </div>
                    </td>
                </tr>`
            }
    })});

    return html;
}

export function populateSubstationPopup(substationData, lastUpdated) {
    let html = `
        <div style="min-width: 500px;">
        <div>
            <h5>${substationData.description}</h5>
            
        </div>
        <span class="badge text-bg-primary">${substationData.siteId}</span>
        <br>
        <br>
    `

    html += `
        <h6>Load</h6>
        <table style="width:100%" class="table table-sm table-striped">
            <tr>
                <th style="width:30%">Busbar</th>
                <th style="width:40%">Load</th>
                <th style="width:30%">Price</th>
            </tr>
            ${getSubstationBusbarRows(substationData)}
            <tr>
                <th>Total</td>
                <th>${displayMegawattsOrGigawatts(substationData.totalLoadMW)}</td>
                <th></td>
            </tr>
        </table>`;

    if(substationData.totalGenerationCapacityMW > 0){
        html += `
            <h6>Generation</h6>
            <table style="width:100%" class="table table-sm table-striped">
                <tr>
                    <th style="width:25%">Generator</th>
                    <th style="width:25%">Fuel</th>
                    <th style="width:15%">Generation</th>
                    <th style="width:15%">Capacity</th>
                    <th style="width:20%">%</th>
                </tr>
                ${getSubstationGenerationRows(substationData)}
                <tr>
                    <th>Total</td>
                    <th></td>
                    <th>${displayMegawattsOrGigawatts(substationData.totalGenerationMW)}</td>
                    <th>${displayMegawattsOrGigawatts(substationData.totalGenerationCapacityMW)}</td>
                    <th>${Math.round(substationData.totalGenerationMW / substationData.totalGenerationCapacityMW * 100)}%</td>
                </tr>
            </table>`;
        
        html += `
        <h6>Summary</h6>
        <table style="width:100%" class="table table-sm table-striped">
            <tr>
                <th style="width:30%">Type</th>
                <th style="width:40%">Amount</th>
            </tr>
            <tr>
                <td>Generation</td>
                <td>${displayMegawattsOrGigawatts(substationData.totalGenerationMW)}</td>
            </tr>
            <tr>
                <td>Load</td>
                <td>${displayMegawattsOrGigawatts(substationData.totalLoadMW)}</td>
            </tr>
            <tr>
                <th>Net ${(substationData.netImportMW < 0) ? 'Export' : 'Import'}</td>
                <th>${displayMegawattsOrGigawatts(Math.abs(substationData.netImportMW))}</td>
            </tr>
        </table>`
    }

    html += `<i> Last Updated: ${lastUpdated}</i></div>`;
    

    return html;
}