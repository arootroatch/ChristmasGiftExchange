async function searchExchanges() {
    const email = document.getElementById("reuse-email").value.trim();
    if (!email) return;

    const btn = document.getElementById("reuse-search-btn");
    btn.textContent = "Searching...";
    btn.disabled = true;

    try {
        const response = await fetch(
            `/.netlify/functions/api-exchange-search?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
            showSnackbar("Something went wrong. Please try again.", "error");
            return;
        }

        const exchanges = await response.json();
        if (exchanges.length === 0) {
            showSnackbar("No past exchanges found for that email", "error");
            return;
        }
        renderResults(exchanges);
    } catch (error) {
        showSnackbar("Something went wrong. Please try again.", "error");
    } finally {
        btn.textContent = "Search";
        btn.disabled = false;
    }
}

function renderResults(exchanges) {
    const container = document.getElementById("results-section");
    container.innerHTML = exchanges.map(ex => `
        <div class="exchange-result">
            <h3>${new Date(ex.createdAt).toLocaleDateString()}</h3>
            <p><strong>Participants:</strong> ${escape(ex.participantNames.join(", "))}</p>
            ${ex.houses.length > 0 ? `<p><strong>Groups:</strong> ${ex.houses.map(h => `${escape(h.name)} (${escape(h.members.join(", "))})`).join("; ")}</p>` : ""}
            <button class="button use-exchange-btn" data-exchange='${escapeAttr(JSON.stringify(ex))}'>
                Use This Exchange
            </button>
        </div>
    `).join("");

    container.querySelectorAll(".use-exchange-btn").forEach(btn => {
        btn.addEventListener("click", useExchange);
    });
}

function useExchange(event) {
    const exchangeData = JSON.parse(event.currentTarget.dataset.exchange);
    sessionStorage.setItem("reuseExchange", JSON.stringify(exchangeData));
    window.location.href = "/";
}

function showSnackbar(message, type) {
    const bar = document.getElementById("snackbar");
    bar.textContent = message;
    bar.className = type;
    setTimeout(() => { bar.className = "hidden"; }, 3000);
}

function escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("reuse-search-btn").addEventListener("click", searchExchanges);
document.getElementById("reuse-email").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchExchanges();
});
