import { chartConfig } from "./chartConfig.js";

const RELATIVE_SELECTOR = "relative";
const ABSOLUTE_SELECTOR = "absolute";

export class TimeFrameSelector {
    constructor(timeframeSelection, dateSelection) {
        if(timeframeSelection != null){
            this.selectionType = RELATIVE_SELECTOR;
            this.relativeTimeframe = timeframeSelection;
        } else if(dateSelection != null){
            this.selectionType = ABSOLUTE_SELECTOR;
            this.absoluteTimeframe = dateSelection;
        } else {
            this.selectionType = RELATIVE_SELECTOR;
            this.relativeTimeframe = chartConfig.defaultTimeframe;
        }

        this.subscribers = [];
        this.render();
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify() {
        this.subscribers.forEach((callback) => {
            callback(this);
        });
    }

    render() {
        let element = document.getElementById("timeframe-selector");
        element.innerHTML = "";
        if(this.selectionType === "relative") {
            this.renderRelativeTimeframeSelector(element);
        }
    }

    renderRelativeTimeframeSelector(element) {
        chartConfig.relativeTimeframeOptions.forEach((option) => {
            this.addButton(element, option.label, RELATIVE_SELECTOR, option.value, this.relativeTimeframe === option.value);
        });
    }

    addButton(element, label, type, value, selected) {
        let button = document.createElement("button");
        button.classList.add("btn", "btn-sm");
        button.classList.add(selected ? "btn-primary" : "btn-secondary");
        button.innerText = label;
        button.type = "button";
        button.addEventListener("click", () => {
            this.update(type, value);
        });

        element.appendChild(button);
    }

    update(type = RELATIVE_SELECTOR, value = chartConfig.defaultTimeframe) {
        if(type === RELATIVE_SELECTOR) {
            this.setRelativeTimeframe(value);
        }
        this.render();
        this.notify();
    }

    setRelativeTimeframe(timeframe) {
        this.selectionType = RELATIVE_SELECTOR;
        this.relativeTimeframe = timeframe;
    }
}