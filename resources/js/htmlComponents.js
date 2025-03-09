export function emailQueryInit() {
    return `
        <label for="emailQuery">
            Need to know who you're buying a gift for?
        </label>
        ${emailQueryInput()}
    `;
}

export function emailQueryInput() {
    return `
    <div>
        <input
            type="email"
            maxlength="100"
            id="emailQuery"
            placeholder="Enter your email to search"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="emailQueryBtn"
        >
        Search it!
        </button>
    </div>
    `;
}

export function emailQueryError() {
    return `
    <div style="color:#b31e20">
        Email address not found!
    </div>`;
}

export function emailQueryResult(date, recipient) {
    return `
    <div>
        As of ${date.toDateString()}, you're buying a gift for <span>${recipient}!</span>
    </div>
    ${emailQueryInput()}`;
}