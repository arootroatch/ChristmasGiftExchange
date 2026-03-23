import {apiFetch} from "./utils.js";

export function authGateTemplate({heading, showName} = {}) {
    return `
        <div id="auth-gate">
            <h2>${heading || "Verify Your Email"}</h2>
            <div id="auth-email-step">
                ${showName ? '<label>Your name<input type="text" id="auth-name" required></label>' : ''}
                <label>Your email<input type="email" id="auth-email" required></label>
                <button id="auth-send-code" class="btn">Send Verification Code</button>
            </div>
            <div id="auth-code-step" style="display: none;">
                <p>Check your email for a verification code</p>
                <label>Verification code<input type="text" id="auth-code" inputmode="numeric" maxlength="8" required></label>
                <button id="auth-verify-code" class="btn">Verify</button>
            </div>
        </div>`;
}

export function initAuthGate({onSuccess, onError, showName} = {}) {
    const sendBtn = document.getElementById("auth-send-code");
    const verifyBtn = document.getElementById("auth-verify-code");

    sendBtn.addEventListener("click", () => {
        const email = document.getElementById("auth-email").value.trim();
        if (!email) return;
        apiFetch("/.netlify/functions/api-auth-code-post", {
            method: "POST",
            body: {email},
            onSuccess: () => {
                document.getElementById("auth-email-step").style.display = "none";
                document.getElementById("auth-code-step").style.display = "";
            },
            onError: onError || (() => {}),
        });
    });

    verifyBtn.addEventListener("click", () => {
        const email = document.getElementById("auth-email").value.trim();
        const code = document.getElementById("auth-code").value.trim();
        const name = showName ? document.getElementById("auth-name")?.value.trim() : undefined;
        if (!code) return;
        apiFetch("/.netlify/functions/api-auth-verify-post", {
            method: "POST",
            body: {email, code, ...(name && {name})},
            onSuccess: () => onSuccess({email, name}),
            onError: onError || (() => {}),
        });
    });
}
