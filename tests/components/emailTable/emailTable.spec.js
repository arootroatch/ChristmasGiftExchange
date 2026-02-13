import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installGiverNames,
  installGivers,
  resetState,
  shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar,
  stubFetch
} from "../../specHelper";
import "../../../resources/js/components/name";
import {assignRecipients, nextStep, startExchange, state} from "../../../resources/js/state";
import {alex, whitney} from "../../testData";
import {
  emailInput,
  init,
} from "../../../resources/js/components/emailTable/emailTable";
import {init as initSnackbar} from "../../../resources/js/components/snackbar";

function renderEmailTableInputs(givers) {
  const body = document.querySelector("#emailTableBody");
  for (let i = 0; i < givers.length; i++) {
    body.insertAdjacentHTML(
      "afterbegin",
      `<div class="emailDiv">
          <label for=${i}>${givers[i].name}</label>
          <input type="email" class="emailInput" maxlength="100" name=${givers[i].name} id=${i} value=${givers[i].email} required/>
        </div>
        `
    );
  }
}

function triggerEmailTableRender() {
  installGivers([{...alex, recipient: whitney.name}, {...whitney, recipient: alex.name}]);
  assignRecipients(["Whitney", "Alex"]);
}

function submitEmailForm() {
  const emailTableBody = document.getElementById("emailTableBody");
  const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
  emailTableBody.dispatchEvent(submitEvent);
}

describe('emailTable', () => {
  stubFetch(true, 200, {});
  Math.random = vi.fn(() => 123456789);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2023, 0, 1));

  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    resetState();
    state.isSecretSanta = true;
  });

  describe("reactive rendering", () => {
    it("renders on RECIPIENTS_ASSIGNED when isSecretSanta", () => {
      state.isSecretSanta = true;
      installGivers([{...alex, recipient: whitney.name}, {...whitney, recipient: alex.name}]);

      assignRecipients(["Whitney", "Alex"]);

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("does not render on RECIPIENTS_ASSIGNED when not isSecretSanta", () => {
      state.isSecretSanta = false;
      installGivers([{...alex, recipient: whitney.name}, {...whitney, recipient: alex.name}]);

      assignRecipients(["Whitney", "Alex"]);

      expect(document.querySelector("#emailTable")).toBeNull();
    });

    it("renders on NEXT_STEP when step is 4", () => {
      installGivers([{...alex, recipient: whitney.name}, {...whitney, recipient: alex.name}]);
      state.step = 3;

      nextStep();

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("does not render on NEXT_STEP when step is not 4", () => {
      installGivers([{...alex}, {...whitney}]);
      state.step = 1;

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
      state.isSecretSanta = false;
      installGivers([{...alex, recipient: whitney.name}, {...whitney, recipient: alex.name}]);
      state.step = 3;

      nextStep();

      const hideButton = document.querySelector("#hideEmails");
      expect(hideButton.style.display).toBe("block");
    });

    it("hides dismiss button in secret santa mode", () => {
      state.isSecretSanta = true;
      installGivers([{...alex, recipient: whitney.name}, {...whitney, recipient: alex.name}]);

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
      state.givers = [];
      installGiverNames("Alex", "Whitney", "Hunter", "Megan");
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

    it("sets email, id, and date for each giver", async () => {
      await vi.waitFor(() => {
        expect(state.givers[0].email).toBe("arootroatch@gmail.com");
      });

      const expectedEmails = ["arootroatch@gmail.com", "whitney@gmail.com", "hunter@gmail.com", "megan@gmail.com"];
      const date = state.givers[0].date;

      state.givers.forEach((giver, i) => {
        expect(giver.email).toBe(expectedEmails[i]);
        expect(giver.date).toBe(date);
        expect(giver.id).toBe(`4_1ibc1j9_${date}`);
      })
    })

    it("invokes postToServer", async () => {
      expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/postToDb",
        {"body": JSON.stringify(state.givers), "method": "POST", "mode": "cors"});
    })

    it("hides email table on EMAILS_ADDED", async () => {
      const table = document.querySelector("#emailTable");

      await vi.waitFor(() => {
        expect(table.classList).toContain("hide");
      });

      vi.advanceTimersByTime(500);

      expect(table.classList).not.toContain("hide");
      expect(table.classList).not.toContain("show");
      expect(table.classList).toContain("hidden");
    })

  })

  describe("submitEmails error handling", () => {
    beforeEach(() => {
      global.fetch = vi.fn(() => Promise.resolve({
        status: 500,
        body: "Database connection failed"
      }));
      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installGiverNames("Alex", "Whitney");
    });

    it("does not add emails to givers when postToServer returns non-200 status", async () => {
      const initialEmail0 = state.givers[0].email;
      const initialEmail1 = state.givers[1].email;

      submitEmailForm();

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      expect(state.givers[0].email).toBe(initialEmail0);
      expect(state.givers[1].email).toBe(initialEmail1);
    });

    it("displays error snackbar when postToServer returns non-200 status", async () => {
      submitEmailForm();

      await vi.waitFor(() => {
        shouldDisplayErrorSnackbar("Failed to submit emails");
      });
    });
  });

  it("emailInput returns correct HTML template", () => {
    state.givers = [{name: "Alex"}, {name: "Whitney"}];
    const result = emailInput(state.givers[0], 0);

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

    expect(table.classList).toContain("hidden");
    expect(table.classList).not.toContain("hide");
  });
})
