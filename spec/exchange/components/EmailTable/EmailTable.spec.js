import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installParticipantNames,
  installGivers,
  resetState,
  shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar,
  shouldDisplaySuccessSnackbar,
} from "../../../specHelper";
import "../../../../src/exchange/components/Name";
import {assignRecipients, startExchange, getState, requestEmailResults} from "../../../../src/exchange/state";
import * as state from "../../../../src/exchange/state";
import {alex, whitney, hunter} from "../../../testData";
import {
  emailInput,
  init,
  renderWithSubset,
} from "../../../../src/exchange/components/EmailTable/EmailTable";
import {init as initSnackbar} from "../../../../src/Snackbar";

function stubExchangeApiFetch() {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({exchangeId: "test-exchange-id"})
  }));
}

function renderEmailTableInputs(participants) {
  const body = document.querySelector("#emailTableBody");
  for (let i = 0; i < participants.length; i++) {
    body.insertAdjacentHTML(
      "afterbegin",
      `<div class="emailDiv">
          <label for=${i}>${participants[i].name}</label>
          <input type="email" class="emailInput" maxlength="100" name=${participants[i].name} id=${i} value=${participants[i].email} required/>
        </div>
        `
    );
  }
}

function triggerEmailTableRender() {
  installGivers([{...alex}, {...whitney}]);
  assignRecipients(["Whitney", "Alex"]);
}

function triggerEmailTableRenderWith3() {
  installGivers([{...alex}, {...whitney}, {...hunter}]);
  assignRecipients(["Whitney", "Hunter", "Alex"]);
}

function triggerNonSecretSantaEmailTable() {
  getState().isSecretSanta = false;
  installGivers([{...alex}, {...whitney}]);
  assignRecipients(["Whitney", "Alex"]);
  requestEmailResults();
}

function submitEmailForm() {
  const emailTableBody = document.getElementById("emailTableBody");
  const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
  emailTableBody.dispatchEvent(submitEvent);
}

describe('emailTable', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2023, 0, 1));

  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    stubExchangeApiFetch();
    resetState();
    getState().isSecretSanta = true;
    document.querySelector("#sendResultsConfirm")?.remove();
    document.querySelector("#sendResults")?.remove();
    vi.spyOn(state, "completeExchange");
  });

  describe("reactive rendering", () => {
    it("renders on RECIPIENTS_ASSIGNED when isSecretSanta", () => {
      getState().isSecretSanta = true;
      installGivers([{...alex}, {...whitney}]);

      assignRecipients(["Whitney", "Alex"]);

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("does not render on RECIPIENTS_ASSIGNED when not isSecretSanta", () => {
      getState().isSecretSanta = false;
      installGivers([{...alex}, {...whitney}]);

      assignRecipients(["Whitney", "Alex"]);

      expect(document.querySelector("#emailTable")).toBeNull();
    });

    it("renders on EMAIL_RESULTS_REQUESTED", () => {
      getState().isSecretSanta = false;
      installGivers([{...alex}, {...whitney}]);
      assignRecipients(["Whitney", "Alex"]);

      requestEmailResults();

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("clears container on EXCHANGE_STARTED", () => {
      triggerEmailTableRender();
      expect(document.querySelector("#emailTable")).not.toBeNull();

      startExchange();

      expect(document.querySelector("#emailTable")).toBeNull();
    });

    it("displays dismiss button when not secret santa", () => {
      getState().isSecretSanta = false;
      installGivers([{...alex}, {...whitney}]);
      assignRecipients(["Whitney", "Alex"]);

      requestEmailResults();

      expect(document.querySelector("#hideEmails")).not.toBeNull();
    });

    it("does not render dismiss button in secret santa mode", () => {
      getState().isSecretSanta = true;
      installGivers([{...alex}, {...whitney}]);

      assignRecipients(["Whitney", "Alex"]);

      expect(document.querySelector("#hideEmails")).toBeNull();
    });

    it("includes send results button in template", () => {
      triggerEmailTableRender();

      const btn = document.querySelector("#emailTable #sendResultsBtn");
      expect(btn).not.toBeNull();
      expect(document.querySelector("#emailTable").textContent).toContain("Don't want to send out emails to everyone?");
    });
  });

  describe("submitEmails", () => {
    beforeEach(() => {
      triggerEmailTableRender();
      // Clear render-generated inputs and givers, replace with test data
      const body = document.querySelector("#emailTableBody");
      body.querySelectorAll(".emailDiv").forEach(el => el.remove());
      getState().participants = [];
      installParticipantNames("Alex", "Whitney", "Hunter", "Megan");
      renderEmailTableInputs([
        {name: "Alex", email: "arootroatch@gmail.com"},
        {name: "Whitney", email: "whitney@gmail.com"},
        {name: "Hunter", email: "hunter@gmail.com"},
        {name: "Megan", email: "megan@gmail.com"}]);

      submitEmailForm();
    });

    it('shows spinner and disables button', () => {
      const submitEmailsButton = document.querySelector("#submitEmails");
      expect(submitEmailsButton.innerHTML).toContain('class="spinner"');
      expect(submitEmailsButton.disabled).toBe(true);
    })

    it("posts exchange data to new API endpoint", () => {
      expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/api-exchange-post", expect.objectContaining({
        method: "POST",
        headers: {"Content-Type": "application/json"},
      }));
      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.exchangeId).toBe(getState().exchangeId);
      expect(body.isSecretSanta).toBe(getState().isSecretSanta);
      expect(body.participants.length).toBe(4);
    })

  })

  describe("submitEmails error handling", () => {
    beforeEach(() => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({error: "Database connection failed"})
      }));
      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
    });

    it("displays error snackbar when postToServer returns non-200 status", async () => {
      submitEmailForm();

      await vi.advanceTimersByTimeAsync(0);
      shouldDisplayErrorSnackbar("Aw shucks!");
    });
  });

  describe("duplicate email validation", () => {
    beforeEach(() => {
      triggerEmailTableRender();
      const body = document.querySelector("#emailTableBody");
      body.querySelectorAll(".emailDiv").forEach(el => el.remove());
      getState().participants = [];
      installParticipantNames("Alex", "Whitney", "Hunter");
      renderEmailTableInputs([
        {name: "Alex", email: "same@test.com"},
        {name: "Whitney", email: "same@test.com"},
        {name: "Hunter", email: "hunter@test.com"},
      ]);
    });

    it("prevents submission when emails are duplicated", () => {
      submitEmailForm();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("shows error snackbar for duplicate emails", () => {
      submitEmailForm();

      shouldDisplayErrorSnackbar("Each participant must have a unique email address");
    });

    it("adds duplicate-email class to inputs with duplicate emails", () => {
      submitEmailForm();

      const inputs = document.querySelectorAll(".emailInput");
      // renderEmailTableInputs uses afterbegin, so DOM order is reversed: Hunter, Whitney, Alex
      expect(inputs[0].classList).not.toContain("duplicate-email");
      expect(inputs[1].classList).toContain("duplicate-email");
      expect(inputs[2].classList).toContain("duplicate-email");
    });

    it("removes duplicate-email class on input event", () => {
      submitEmailForm();
      // inputs[1] is Whitney (same@test.com) — has duplicate class
      const input = document.querySelectorAll(".emailInput")[1];
      expect(input.classList).toContain("duplicate-email");

      input.value = "different@test.com";
      input.dispatchEvent(new Event("input", {bubbles: true}));

      expect(input.classList).not.toContain("duplicate-email");
    });
  });

  describe("send results confirmation", () => {
    beforeEach(() => {
      triggerEmailTableRender();
    });

    it("shows as modal overlay on body when button clicked", () => {
      document.querySelector("#sendResultsBtn").click();

      const confirm = document.querySelector("#sendResultsConfirm");
      expect(confirm).not.toBeNull();
      expect(confirm.classList).toContain("sendEmails");
      expect(confirm.textContent).toContain("Your exchange will not be saved");
    });

    it("shows reveal warning in secret santa mode", () => {
      document.querySelector("#sendResultsBtn").click();
      expect(document.querySelector("#sendResultsConfirm").textContent).toContain("reveal all gift exchange assignments");
    });

    it("does not show reveal warning in non-secret-santa mode", () => {
      document.querySelector("#emailTable")?.remove();
      triggerNonSecretSantaEmailTable();

      document.querySelector("#sendResultsBtn").click();
      expect(document.querySelector("#sendResultsConfirm").textContent).not.toContain("reveal all gift exchange assignments");
    });

    it("Cancel dismisses the confirmation modal", () => {
      document.querySelector("#sendResultsBtn").click();
      expect(document.querySelector("#sendResultsConfirm")).not.toBeNull();

      document.querySelector("#sendResultsCancelBtn").click();

      expect(document.querySelector("#sendResultsConfirm")).toBeNull();
      expect(document.querySelector("#emailTable")).not.toBeNull();
    });

    it("is removed on EXCHANGE_STARTED", () => {
      document.querySelector("#sendResultsBtn").click();
      expect(document.querySelector("#sendResultsConfirm")).not.toBeNull();

      startExchange(false);

      expect(document.querySelector("#sendResultsConfirm")).toBeNull();
    });
  });

  describe("send results form", () => {
    beforeEach(() => {
      triggerEmailTableRenderWith3();
      document.querySelector("#sendResultsBtn").click();
      document.querySelector("#sendResultsConfirmBtn").click();
    });

    it("removes emailTable and shows form as standalone component", () => {
      expect(document.querySelector("#emailTable")).toBeNull();
      expect(document.querySelector("#sendResultsConfirm")).toBeNull();
      const form = document.querySelector("#sendResults");
      expect(form).not.toBeNull();
      expect(form.classList).toContain("sendEmails");
    });

    it("shows form with name text input and email input", () => {
      const nameInput = document.querySelector("#sendResultsName");
      const emailInput = document.querySelector("#sendResultsEmail");

      expect(nameInput).not.toBeNull();
      expect(nameInput.type).toBe("text");
      expect(emailInput).not.toBeNull();
    });

    it("shows results table in secret santa mode", () => {
      const resultsCard = document.querySelector("#sendResults .results-card");
      expect(resultsCard).not.toBeNull();
      expect(resultsCard.textContent).toContain("Alex");
      expect(resultsCard.textContent).toContain("Whitney");
    });

    it("is removed on EXCHANGE_STARTED", () => {
      expect(document.querySelector("#sendResults")).not.toBeNull();

      startExchange(false);

      expect(document.querySelector("#sendResults")).toBeNull();
    });
  });

  describe("send results form non-secret-santa", () => {
    beforeEach(() => {
      document.querySelector("#emailTable")?.remove();
      triggerNonSecretSantaEmailTable();
      document.querySelector("#sendResultsBtn").click();
      document.querySelector("#sendResultsConfirmBtn").click();
    });

    it("does not show results table", () => {
      expect(document.querySelector("#sendResults .results-card")).toBeNull();
    });

    it("shows form with select and email input", () => {
      expect(document.querySelector("#sendResultsName")).not.toBeNull();
      expect(document.querySelector("#sendResultsEmail")).not.toBeNull();
    });
  });

  describe("send results submit", () => {
    beforeEach(() => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({success: true})
      }));
      triggerEmailTableRenderWith3();
      document.querySelector("#sendResultsBtn").click();
      document.querySelector("#sendResultsConfirmBtn").click();
      document.querySelector("#sendResultsName").value = "Alex";
      document.querySelector("#sendResultsEmail").value = "alex@test.com";
    });

    it("sends request to api-results-email-post", () => {
      document.querySelector("#sendResultsSubmit").click();

      expect(global.fetch).toHaveBeenCalledWith(
        "/.netlify/functions/api-results-email-post",
        expect.objectContaining({method: "POST"})
      );
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.name).toBe("Alex");
      expect(body.email).toBe("alex@test.com");
      expect(body.assignments).toHaveLength(3);
    });

    it("shows spinner on submit button", () => {
      document.querySelector("#sendResultsSubmit").click();
      expect(document.querySelector("#sendResultsSubmit").innerHTML).toContain('class="spinner"');
      expect(document.querySelector("#sendResultsSubmit").disabled).toBe(true);
    });

    it("removes form on success", async () => {
      document.querySelector("#sendResultsSubmit").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(document.querySelector("#sendResults")).toBeNull();
    });

    it("calls completeExchange with success mode when send results succeeds", async () => {
      document.querySelector("#sendResultsSubmit").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(state.completeExchange).toHaveBeenCalledWith("success");
    });

    it("shows error snackbar on API failure", async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({error: "Server error"})
      }));
      document.querySelector("#sendResultsSubmit").click();

      const {serverErrorMessage} = await import("../../../../src/utils");
      await vi.advanceTimersByTimeAsync(0);
      shouldDisplayErrorSnackbar(serverErrorMessage);
    });

    it("re-enables send button on API failure", async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({error: "Bad request"})
      }));
      document.querySelector("#sendResultsSubmit").click();

      await vi.advanceTimersByTimeAsync(0);
      const btn = document.querySelector("#sendResultsSubmit");
      expect(btn.textContent).toBe("Send");
    });

    it("shows error when no name entered", () => {
      document.querySelector("#sendResultsName").value = "";
      document.querySelector("#sendResultsSubmit").click();

      shouldDisplayErrorSnackbar("Please enter your name");
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("shows error when no email entered", () => {
      document.querySelector("#sendResultsEmail").value = "";
      document.querySelector("#sendResultsSubmit").click();

      shouldDisplayErrorSnackbar("Please enter your email");
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it("emailInput returns correct HTML template", () => {
    getState().participants = [{name: "Alex", email: ""}, {name: "Whitney", email: ""}];
    const result = emailInput(getState().participants[0], 0);

    expect(result).toContain('<div class="emailDiv">');
    expect(result).toContain('<label for=0>Alex</label>');
    expect(result).toContain('type="email"');
    expect(result).toContain('class="emailInput"');
    expect(result).toContain('maxlength="100"');
    expect(result).toContain('placeholder="Alex@example.com"');
    expect(result).toContain('name=Alex');
    expect(result).toContain('id=0');
    expect(result).toContain('required');
  });

  it("emailInput pre-fills value when participant has email", () => {
    const participant = {name: "Alex", email: "alex@gmail.com"};
    const result = emailInput(participant, 0);

    expect(result).toContain('value="alex@gmail.com"');
  });

  it("emailInput has empty value when participant has no email", () => {
    const participant = {name: "Alex", email: ""};
    const result = emailInput(participant, 0);

    expect(result).toContain('value=""');
  });

  describe("renderWithSubset", () => {
    const subsetParticipants = [
      {name: "Alex", email: "alex@test.com"},
    ];
    const subsetAssignments = [
      {giver: "Alex", recipient: "Whitney"},
    ];

    beforeEach(() => {
      document.querySelector("#emailTable")?.remove();
      document.querySelector("#failedEmails")?.remove();
    });

    it("renders an email table with the subset participants", () => {
      renderWithSubset(subsetParticipants, subsetAssignments);

      const table = document.querySelector("#emailTable");
      expect(table).not.toBeNull();
      expect(table.textContent).toContain("Alex");
    });

    it("does not show the Send Me the Results section", () => {
      renderWithSubset(subsetParticipants, subsetAssignments);

      expect(document.querySelector("#sendResultsBtn")).toBeNull();
    });

    it("does not show the Dismiss button", () => {
      renderWithSubset(subsetParticipants, subsetAssignments);

      const dismissBtn = document.querySelector("#hideEmails");
      expect(dismissBtn === null || dismissBtn.style.display === "none").toBe(true);
    });

    it("submits to api-giver-retry-post on submit", () => {
      renderWithSubset(subsetParticipants, subsetAssignments);

      const emailTableBody = document.getElementById("emailTableBody");
      const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
      emailTableBody.dispatchEvent(submitEvent);

      expect(global.fetch).toHaveBeenCalledWith(
        "/.netlify/functions/api-giver-retry-post",
        expect.objectContaining({method: "POST"})
      );
    });

    it("calls completeExchange with success when subset emails all succeed", async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({sent: 1, total: 1, emailsFailed: []})
      }));
      renderWithSubset(subsetParticipants, subsetAssignments);

      const emailTableBody = document.getElementById("emailTableBody");
      emailTableBody.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
      await vi.advanceTimersByTimeAsync(0);

      expect(state.completeExchange).toHaveBeenCalledWith("success");
    });
  });

  it("hideEmailTable hides the table and button", () => {
    triggerNonSecretSantaEmailTable();
    const table = document.querySelector("#emailTable");
    const hideButton = document.querySelector("#hideEmails");

    click("#hideEmails");

    expect(table.classList).toContain("hide");
    expect(table.classList).not.toContain("show");

    vi.advanceTimersByTime(500);

    expect(document.querySelector("#emailTable")).toBeNull();
  });

  it("hides email table when all emails sent", async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: []})
    }));
    triggerEmailTableRender();
    renderEmailTableInputs([
      {name: "Alex", email: "alex@test.com"},
      {name: "Whitney", email: "whitney@test.com"}
    ]);
    installParticipantNames("Alex", "Whitney");

    submitEmailForm();

    const table = document.querySelector("#emailTable");
    await vi.advanceTimersByTimeAsync(0);
    expect(table.classList).toContain("hide");
    vi.advanceTimersByTime(500);
    expect(document.querySelector("#emailTable")).toBeNull();
  });

  it("calls completeExchange with success mode when all emails sent", async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: []})
    }));
    triggerEmailTableRender();
    renderEmailTableInputs([
      {name: "Alex", email: "alex@test.com"},
      {name: "Whitney", email: "whitney@test.com"}
    ]);
    installParticipantNames("Alex", "Whitney");

    submitEmailForm();
    await vi.advanceTimersByTimeAsync(0);

    expect(state.completeExchange).toHaveBeenCalledWith("success");
  });

  describe("failed emails", () => {
    beforeEach(() => {
      document.querySelector("#failedEmails")?.remove();
    });

    it("shows failed emails component when some emails fail", async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
      }));
      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");

      submitEmailForm();

      await vi.advanceTimersByTimeAsync(0);
      const failedEl = document.querySelector("#failedEmails");
      expect(failedEl).not.toBeNull();
      expect(failedEl.textContent).toContain("alex@test.com");
      expect(failedEl.textContent).toContain("recipient search");
    });

    it("removes failed emails on retry success", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({sent: 1, total: 1, emailsFailed: []})
        });

      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();

      await vi.advanceTimersByTimeAsync(0);
      expect(document.querySelector("#retryEmailsBtn")).not.toBeNull();
      document.querySelector("#retryEmailsBtn").click();

      await vi.advanceTimersByTimeAsync(0);
      expect(document.querySelector("#failedEmails")).toBeNull();
    });

    it("removes failed emails on retry failure", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({error: "Server error"})
        });

      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();

      await vi.advanceTimersByTimeAsync(0);
      expect(document.querySelector("#retryEmailsBtn")).not.toBeNull();
      document.querySelector("#retryEmailsBtn").click();

      await vi.advanceTimersByTimeAsync(0);
      expect(document.querySelector("#failedEmails")).toBeNull();
    });

    it("calls completeExchange with success mode when retry succeeds", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({sent: 1, total: 1, emailsFailed: []})
        });

      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();
      await vi.advanceTimersByTimeAsync(0);

      document.querySelector("#retryEmailsBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(state.completeExchange).toHaveBeenCalledWith("success");
    });

    it("calls completeExchange with error mode on retry failure", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({error: "Server error"})
        });

      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();
      await vi.advanceTimersByTimeAsync(0);

      document.querySelector("#retryEmailsBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(state.completeExchange).toHaveBeenCalledWith("error");
    });

    it("calls completeExchange with results mode on final failure View Results click", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({sent: 0, total: 1, emailsFailed: ["alex@test.com"]})
        });

      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();
      await vi.advanceTimersByTimeAsync(0);

      document.querySelector("#retryEmailsBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      const viewResultsBtn = document.querySelector("#viewResultsBtn");
      expect(viewResultsBtn).not.toBeNull();

      viewResultsBtn.click();

      expect(state.completeExchange).toHaveBeenCalledWith("results");
    });

    it("shows updated failed emails when retry partially fails", async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com", "whitney@test.com"]})
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({sent: 1, total: 2, emailsFailed: ["whitney@test.com"]})
        });

      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();

      await vi.advanceTimersByTimeAsync(0);
      expect(document.querySelector("#retryEmailsBtn")).not.toBeNull();

      const failedEl = document.querySelector("#failedEmails");
      expect(failedEl.textContent).toContain("alex@test.com");
      expect(failedEl.textContent).toContain("whitney@test.com");

      document.querySelector("#retryEmailsBtn").click();

      await vi.advanceTimersByTimeAsync(0);
      const updatedFailed = document.querySelector("#failedEmails");
      expect(updatedFailed).not.toBeNull();
      expect(updatedFailed.textContent).toContain("whitney@test.com");
      expect(updatedFailed.textContent).not.toContain("alex@test.com");
    });

    it("removes failed emails on EXCHANGE_STARTED", async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({exchangeId: "test-id", participants: [], emailsFailed: ["alex@test.com"]})
      }));
      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installParticipantNames("Alex", "Whitney");
      submitEmailForm();

      await vi.advanceTimersByTimeAsync(0);
      expect(document.querySelector("#failedEmails")).not.toBeNull();

      startExchange(false);

      expect(document.querySelector("#failedEmails")).toBeNull();
    });
  });
})
