import {describe, it, expect, beforeEach, vi} from "vitest";
import {authGateTemplate, initAuthGate} from "../src/authGate.js";

vi.mock("../src/session.js", () => ({setSessionUser: vi.fn()}));

const flush = () => new Promise(r => setTimeout(r, 0));

describe("authGate", () => {
    describe("authGateTemplate", () => {
        it("renders email input and send button", () => {
            const html = authGateTemplate();
            expect(html).toContain('id="auth-email"');
            expect(html).toContain('id="auth-send-code"');
        });

        it("renders name input when showName is true", () => {
            const html = authGateTemplate({showName: true});
            expect(html).toContain('id="auth-name"');
        });

        it("does not render name input by default", () => {
            const html = authGateTemplate();
            expect(html).not.toContain('id="auth-name"');
        });

        it("uses custom heading", () => {
            const html = authGateTemplate({heading: "Custom"});
            expect(html).toContain("Custom");
        });

        it("renders code step hidden initially", () => {
            const html = authGateTemplate();
            expect(html).toContain('id="auth-code-step" style="display: none;"');
        });

        it("renders send button with 'button' class", () => {
            const html = authGateTemplate();
            expect(html).toContain('class="button"');
        });

        it("renders verify button with 'button' class", () => {
            const html = authGateTemplate();
            const codeStep = html.slice(html.indexOf('auth-code-step'));
            expect(codeStep).toContain('class="button"');
        });
    });

    describe("initAuthGate", () => {
        let mockFetch;

        function stubFetch(body) {
            mockFetch = vi.fn(() => Promise.resolve({
                ok: true, status: 200,
                json: () => Promise.resolve(body),
            }));
            global.fetch = mockFetch;
        }

        beforeEach(() => {
            document.body.innerHTML = authGateTemplate({showName: true});
            stubFetch({sent: true});
        });

        it("calls api-auth-code-post on send button click", async () => {
            initAuthGate({onSuccess: vi.fn(), showName: true});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(mockFetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-auth-code-post",
                expect.objectContaining({method: "POST"})
            );
        });

        it("shows code step after successful code send", async () => {
            initAuthGate({onSuccess: vi.fn(), showName: true});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(document.getElementById("auth-email-step").style.display).toBe("none");
            expect(document.getElementById("auth-code-step").style.display).toBe("");
        });

        it("calls api-auth-verify-post on verify button click", async () => {
            stubFetch({success: true});
            initAuthGate({onSuccess: vi.fn(), showName: true});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-code").value = "12345678";
            document.getElementById("auth-name").value = "Alex";
            document.getElementById("auth-verify-code").click();

            await flush();
            const call = mockFetch.mock.calls[0];
            const body = JSON.parse(call[1].body);
            expect(body.email).toBe("test@test.com");
            expect(body.code).toBe("12345678");
            expect(body.name).toBe("Alex");
        });

        it("calls onSuccess after successful verification", async () => {
            stubFetch({success: true});
            const onSuccess = vi.fn();
            initAuthGate({onSuccess, showName: true});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-code").value = "12345678";
            document.getElementById("auth-name").value = "Alex";
            document.getElementById("auth-verify-code").click();

            await flush();
            expect(onSuccess).toHaveBeenCalledWith({email: "test@test.com", name: "Alex"});
        });

        it("calls setSessionUser after successful verification", async () => {
            const {setSessionUser} = await import("../src/session.js");
            stubFetch({success: true});
            initAuthGate({onSuccess: vi.fn(), showName: true});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-code").value = "12345678";
            document.getElementById("auth-name").value = "Alex";
            document.getElementById("auth-verify-code").click();

            await flush();
            expect(setSessionUser).toHaveBeenCalledWith({name: "Alex", email: "test@test.com"});
        });

        it("does not call API when email is empty", async () => {
            initAuthGate({onSuccess: vi.fn()});

            document.getElementById("auth-email").value = "";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("does not call API when code is empty", async () => {
            initAuthGate({onSuccess: vi.fn()});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-code").value = "";
            document.getElementById("auth-verify-code").click();

            await flush();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("calls onError when verification fails", async () => {
            mockFetch = vi.fn(() => Promise.resolve({
                ok: false, status: 400,
                json: () => Promise.resolve({error: "Invalid code"}),
            }));
            global.fetch = mockFetch;

            const onError = vi.fn();
            initAuthGate({onSuccess: vi.fn(), onError});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-code").value = "00000000";
            document.getElementById("auth-verify-code").click();

            await flush();
            expect(onError).toHaveBeenCalledWith("Invalid code");
        });

        it("does not call onSuccess when verification fails", async () => {
            mockFetch = vi.fn(() => Promise.resolve({
                ok: false, status: 400,
                json: () => Promise.resolve({error: "Invalid code"}),
            }));
            global.fetch = mockFetch;

            const onSuccess = vi.fn();
            initAuthGate({onSuccess, onError: vi.fn()});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-code").value = "00000000";
            document.getElementById("auth-verify-code").click();

            await flush();
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it("calls onError when code send fails", async () => {
            mockFetch = vi.fn(() => Promise.resolve({
                ok: false, status: 429,
                json: () => Promise.resolve({error: "Too many requests"}),
            }));
            global.fetch = mockFetch;

            const onError = vi.fn();
            initAuthGate({onSuccess: vi.fn(), onError});

            document.getElementById("auth-email").value = "test@test.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(onError).toHaveBeenCalledWith("Too many requests");
        });
    });
});
