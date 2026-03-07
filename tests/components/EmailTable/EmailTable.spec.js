import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installParticipantNames,
  installGivers,
  resetState,
  shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar,
} from "../../specHelper";
import "../../../src/components/Name";
import {assignRecipients, nextStep, startExchange, getState} from "../../../src/exchangeState";
import {alex, whitney} from "../../testData";
import {
  emailInput,
  init,
} from "../../../src/components/EmailTable/EmailTable";
import {init as initSnackbar} from "../../../src/components/Snackbar";

const apiTokenResponse = {
  exchangeId: "test-exchange-id",
  participants: [
    {name: "Alex", email: "arootroatch@gmail.com", token: "token-alex"},
    {name: "Whitney", email: "whitney@gmail.com", token: "token-whitney"},
    {name: "Hunter", email: "hunter@gmail.com", token: "token-hunter"},
    {name: "Megan", email: "megan@gmail.com", token: "token-megan"},
  ]
};

function stubExchangeApiFetch() {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(apiTokenResponse)
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

    it("renders on NEXT_STEP when step is 4", () => {
      installGivers([{...alex}, {...whitney}]);
      getState().step = 3;

      nextStep();

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("does not render on NEXT_STEP when step is not 4", () => {
      installGivers([{...alex}, {...whitney}]);
      getState().step = 1;

      nextStep();

      expect(document.querySelector("#emailTable")).toBeNull();
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
      getState().step = 3;

      nextStep();

      const hideButton = document.querySelector("#hideEmails");
      expect(hideButton.style.display).toBe("block");
    });

    it("hides dismiss button in secret santa mode", () => {
      getState().isSecretSanta = true;
      installGivers([{...alex}, {...whitney}]);

      assignRecipients(["Whitney", "Alex"]);

      const hideButton = document.querySelector("#hideEmails");
      expect(hideButton.style.display).toBe("none");
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

    it('sets button text to Loading...', () => {
      const submitEmailsButton = document.querySelector("#submitEmails");
      expect(submitEmailsButton.innerHTML).toBe('Loading...');
    })

    it("sets button color to #808080", () => {
      const submitEmailsButton = document.querySelector("#submitEmails");
      expectColor(submitEmailsButton.style.color, "rgb(128, 128, 128)", "#808080");
    })

    it("sets email for each participant", async () => {
      await vi.waitFor(() => {
        expect(getState().participants[0].email).toBe("arootroatch@gmail.com");
      });

      const expectedEmails = ["arootroatch@gmail.com", "whitney@gmail.com", "hunter@gmail.com", "megan@gmail.com"];

      getState().participants.forEach((participant, i) => {
        expect(participant.email).toBe(expectedEmails[i]);
      })
    })

    it("posts exchange data to new API endpoint", () => {
      expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/api-exchange-post", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          exchangeId: getState().exchangeId,
          isSecretSanta: getState().isSecretSanta,
          houses: getState().houses,
          participants: getState().participants,
          assignments: getState().assignments
        })
      });
    })

    it("stores token map from API response on state", async () => {
      await vi.waitFor(() => {
        expect(getState()._tokenMap).toEqual(apiTokenResponse.participants);
      });
    })

    it("hides email table on EMAILS_ADDED", async () => {
      const table = document.querySelector("#emailTable");

      await vi.waitFor(() => {
        expect(table.classList).toContain("hide");
      });

      vi.advanceTimersByTime(500);

      expect(document.querySelector("#emailTable")).toBeNull();
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

    it("does not add emails to participants when postToServer returns non-200 status", async () => {
      const initialEmail0 = getState().participants[0].email;
      const initialEmail1 = getState().participants[1].email;

      submitEmailForm();

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      expect(getState().participants[0].email).toBe(initialEmail0);
      expect(getState().participants[1].email).toBe(initialEmail1);
    });

    it("displays error snackbar when postToServer returns non-200 status", async () => {
      submitEmailForm();

      await vi.waitFor(() => {
        shouldDisplayErrorSnackbar("Failed to submit emails");
      });
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

  it("hideEmailTable hides the table and button", () => {
    triggerEmailTableRender();
    const table = document.querySelector("#emailTable");
    const hideButton = document.querySelector("#hideEmails");
    hideButton.style.display = "block";

    click("#hideEmails");

    expect(hideButton.style.display).toBe("none");
    expect(table.classList).toContain("hide");
    expect(table.classList).not.toContain("show");

    vi.advanceTimersByTime(500);

    expect(document.querySelector("#emailTable")).toBeNull();
  });
})
