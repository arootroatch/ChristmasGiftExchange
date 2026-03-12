import {escape, escapeAttr, apiFetch} from './utils.js';
import * as snackbar from './Snackbar.js';

async function searchExchanges() {
    const email = document.getElementById("reuse-email").value.trim();
    if (!email) return;

    const btn = document.getElementById("reuse-search-btn");
    btn.textContent = "Searching...";
    btn.disabled = true;

    await apiFetch(`/.netlify/functions/api-exchange-get?email=${encodeURIComponent(email)}`, {
        onSuccess: (data) => {
            if (data.length === 0) {
                snackbar.showError("No past exchanges found for that email");
                return;
            }
            renderResults(data);
        },
        onError: (msg) => snackbar.showError(msg),
        fallbackMessage: "Failed to search exchanges. Please try again.",
    });

    btn.textContent = "Search";
    btn.disabled = false;
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

export function main() {
    snackbar.init();

    document.getElementById("reuse-search-btn").addEventListener("click", searchExchanges);
    document.getElementById("reuse-email").addEventListener("keydown", (e) => {
        if (e.key === "Enter") searchExchanges();
    });
}

