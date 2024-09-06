import { chartConfig } from "./chartConfig.js";
import { formatDate, getCurrentTimeInNZ } from "../utilities/units.js";

const RELATIVE_SELECTOR = "relative";
const ABSOLUTE_SELECTOR = "absolute";

const MIN_DATE = '2020-09-11'; //earliest I have historical data for currently

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
        if(this.selectionType === RELATIVE_SELECTOR) {
            this.renderRelativeTimeframeSelector(element);
        } else if (this.selectionType === ABSOLUTE_SELECTOR) {
            this.renderDatePicker(element);
        }
    }

    renderRelativeTimeframeSelector(element) {
        chartConfig.relativeTimeframeOptions.forEach((option) => {
            this.addButton(element, option.label, RELATIVE_SELECTOR, option.value, this.relativeTimeframe === option.value);
        });
    }

    renderDatePicker(element){
        //////////
        /// Previous Button
        //////////
        let previous = document.createElement("button");
        previous.classList.add("btn", "btn-secondary");
        previous.innerText = "<-";
        previous.type = "button";
        previous.addEventListener("click", () => this.changeDate(-1));

        element.appendChild(previous)

        //////////
        /// Text Box
        //////////
        let textBox = document.createElement("span");
        textBox.id = "date"
        textBox.classList.add("input-group-text");
        textBox.innerHTML = new Date(this.absoluteTimeframe).toLocaleDateString('en-NZ', { year: "numeric", month: "short", day: "numeric" });
        
        element.appendChild(textBox)


        //////////
        /// Next Button
        //////////
        let next = document.createElement("button");
        next.classList.add("btn", "btn-secondary");
        next.innerText = "->";
        next.type = "button";
        next.addEventListener("click", () => this.changeDate(+1));

        element.appendChild(next)

        //////////
        /// Datepicker Itself
        //////////
        new Datepicker('#date', {
            onChange: ((date) => this.datePickerChanged(date, this)),
            min: (() => new Date(MIN_DATE))(),
            max: (() => getCurrentTimeInNZ())(),
            openOn: (() => new Date(this.absoluteTimeframe))()
        })
    }

    changeDate(modifier){
        let currentSelectedDate = new Date(this.absoluteTimeframe);
        let modifiedDate = new Date(currentSelectedDate.getTime());
        modifiedDate.setDate(currentSelectedDate.getDate() + modifier);

        if(modifiedDate.getTime() > getCurrentTimeInNZ().getTime()){
            return;
        }

        if(modifiedDate.getTime() < new Date(MIN_DATE).getTime()){
            return;
        }

        this.update(ABSOLUTE_SELECTOR, formatDate(modifiedDate));
    }

    datePickerChanged(date){
        if(date === undefined) return;
        this.update(ABSOLUTE_SELECTOR, formatDate(date));
    }

    addButton(element, label, type, value, selected) {
        let button = document.createElement("button");
        button.classList.add("btn");
        button.classList.add(selected ? "btn-primary" : "btn-secondary");
        button.innerText = label;
        button.type = "button";
        button.style = "font-size: 0.875rem; padding: 0.25rem 0.5rem;"
        button.addEventListener("click", () => {
            this.update(type, value);
        });

        element.appendChild(button);
    }

    update(type = RELATIVE_SELECTOR, value = chartConfig.defaultTimeframe) {
        if(type === RELATIVE_SELECTOR) {
            this.setRelativeTimeframe(value);
        }

        if(type === ABSOLUTE_SELECTOR) {
            this.setAbsoluteDate(value);
        }

        this.render();
        this.notify();
    }

    setRelativeTimeframe(timeframe) {
        this.selectionType = RELATIVE_SELECTOR;
        this.relativeTimeframe = timeframe;
    }

    setAbsoluteDate(date) {
        this.selectionType = ABSOLUTE_SELECTOR;
        this.absoluteTimeframe = date;
    }
}