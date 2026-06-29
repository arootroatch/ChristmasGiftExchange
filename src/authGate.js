import {apiFetch, setLoadingState, clearLoadingState, selectElement, addEventListener} from "./utils.js";
import {setSessionUser} from "./session.js";

export function authGateTemplate({heading, showName, buttonClass = 'button', gateClass = ''} = {}) {
    return `
        <div id="auth-gate" class="${gateClass}">
            <h2>${heading || "Verify Your Email"}</h2>
            <div id="auth-email-step">
                ${showName ? '<label>Your name<input type="text" id="auth-name" required></label>' : ''}
                <label>Your email<input type="email" id="auth-email" required></label>
                <button id="auth-send-code" class="${buttonClass}">Send Verification Code</button>
            </div>
            <div id="auth-code-step" style="display: none;">
                <p>Check your email for a verification code</p>
                <label>Verification code<input type="text" id="auth-code" inputmode="numeric" maxlength="8" required></label>
                <button id="auth-verify-code" class="${buttonClass}">Verify</button>
            </div>
        </div>`;
}

export function initAuthGate({onSuccess, onError, showName} = {}) {
    addEventListener("#auth-send-code", "click", () => {
        const email = selectElement("#auth-email").value.trim();
        if (!email) return;
        setLoadingState("#auth-send-code");
        apiFetch("/.netlify/functions/api-auth-code-post", {
            method: "POST",
            body: {email},
            onSuccess: () => {
                clearLoadingState("#auth-send-code");
                selectElement("#auth-email-step").style.display = "none";
                selectElement("#auth-code-step").style.display = "";
            },
            onError: (...args) => {
                clearLoadingState("#auth-send-code");
                (onError || (() => {}))(...args);
            },
        });
    });

    addEventListener("#auth-verify-code", "click", () => {
        const email = selectElement("#auth-email").value.trim();
        const code = selectElement("#auth-code").value.trim();
        const name = showName ? selectElement("#auth-name")?.value.trim() : undefined;
        if (!code) return;
        setLoadingState("#auth-verify-code");
        apiFetch("/.netlify/functions/api-auth-verify-post", {
            method: "POST",
            body: {email, code, ...(name && {name})},
            onSuccess: () => {
                clearLoadingState("#auth-verify-code");
                setSessionUser({name, email});
                onSuccess({email, name});
            },
            onError: (...args) => {
                clearLoadingState("#auth-verify-code");
                (onError || (() => {}))(...args);
            },
        });
    });
}
