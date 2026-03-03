const token = window.location.pathname.split("/").pop();
const params = new URLSearchParams(window.location.search);
const exchangeId = params.get("exchange");

async function loadWishlist() {
    if (!token || !exchangeId) {
        redirectWithError("Invalid link");
        return;
    }

    const response = await fetch(
        `/.netlify/functions/api-exchange-get/${exchangeId}?token=${token}`
    );

    if (response.status === 403) {
        redirectWithError("You don't have access to view that participant's wish list");
        return;
    }

    if (!response.ok) {
        redirectWithError("Something went wrong");
        return;
    }

    const data = await response.json();
    document.getElementById("heading").textContent = `${data.recipientName}'s Wishlist`;

    const content = document.getElementById("wishlist-content");

    if (data.wishlists.length === 0 && data.wishItems.length === 0) {
        content.innerHTML = "<p>No wishlist submitted yet.</p>";
        return;
    }

    let html = "";

    if (data.wishlists.length > 0) {
        html += "<h2>Wishlists</h2><ul>";
        data.wishlists.forEach(w => {
            html += `<li><a href="${escapeAttr(w.url)}" target="_blank">${escape(w.title || w.url)}</a></li>`;
        });
        html += "</ul>";
    }

    if (data.wishItems.length > 0) {
        html += "<h2>Individual Items</h2><ul>";
        data.wishItems.forEach(item => {
            html += `<li><a href="${escapeAttr(item.url)}" target="_blank">${escape(item.title || item.url)}</a></li>`;
        });
        html += "</ul>";
    }

    content.innerHTML = html;
}

function redirectWithError(message) {
    sessionStorage.setItem("snackbarError", message);
    window.location.href = "/";
}

function escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

loadWishlist();
