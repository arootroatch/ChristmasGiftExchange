import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installGiverNames,
  installGivers,
  resetState,
  shouldDisplayEmailTable,
  shouldDisplaySuccessSnackbar,
  stubFetch
} from "../specHelper";
import "../../resources/js/components/name";
import {assignRecipients, Giver, nextStep, startExchange, state} from "../../resources/js/state";
import {alex, hunter, megan, whitney} from "../testData";
import {
  displaySendEmails,
  emailInput,
  getEmails,
  handleEmailSubmitError,
  hideElement,
  init,
} from "../../resources/js/components/emailTable";

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
  installGivers([new Giver("Alex", "Whitney"), new Giver("Whitney", "Alex")]);
  assignRecipients(["Whitney", "Alex"]);
}

describe('emailTable', () => {
  stubFetch(true, 200, {});
  Math.random = vi.fn(() => 123456789);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2023, 0, 1));
  vi.mock(import("/resources/js/components/emailTable"), async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      getEmails: vi.fn(actual.getEmails),
      postToServer: vi.fn(actual.postToServer),
    }
  })

  beforeAll(() => {
    init();
  });

  beforeEach(() => {
    resetState();
    state.isSecretSanta = true;
  });

  describe("reactive rendering", () => {
    it("renders on RECIPIENTS_ASSIGNED when isSecretSanta", () => {
      state.isSecretSanta = true;
      installGivers([new Giver("Alex", "Whitney"), new Giver("Whitney", "Alex")]);

      assignRecipients(["Whitney", "Alex"]);

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("does not render on RECIPIENTS_ASSIGNED when not isSecretSanta", () => {
      state.isSecretSanta = false;
      installGivers([new Giver("Alex", "Whitney"), new Giver("Whitney", "Alex")]);

      assignRecipients(["Whitney", "Alex"]);

      expect(document.querySelector("#emailTable")).toBeNull();
    });

    it("renders on NEXT_STEP when step is 4", () => {
      installGivers([new Giver("Alex", "Whitney"), new Giver("Whitney", "Alex")]);
      state.step = 3;

      nextStep();

      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it("does not render on NEXT_STEP when step is not 4", () => {
      installGivers([new Giver("Alex", ""), new Giver("Whitney", "")]);
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
      installGivers([new Giver("Alex", "Whitney"), new Giver("Whitney", "Alex")]);
      state.step = 3;

      nextStep();

      const hideButton = document.querySelector("#hideEmails");
      expect(hideButton.style.display).toBe("block");
    });

    it("hides dismiss button in secret santa mode", () => {
      state.isSecretSanta = true;
      installGivers([new Giver("Alex", "Whitney"), new Giver("Whitney", "Alex")]);

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

      const emailTableBody = document.getElementById("emailTableBody");
      const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
      emailTableBody.dispatchEvent(submitEvent);
    });

    it('sets button text to Loading...', () => {
      const submitEmailsButton = document.querySelector("#submitEmails");
      expect(submitEmailsButton.innerHTML).toBe('Loading...');
    })

    it("sets button color to #808080", () => {
      const submitEmailsButton = document.querySelector("#submitEmails");
      expectColor(submitEmailsButton.style.color, "rgb(128, 128, 128)", "#808080");
    })

    it("sets email, id, and date for each giver", () => {
      const date = new Date().toISOString();
      const givers = [
        [state.givers[0], "arootroatch@gmail.com"],
        [state.givers[1], "whitney@gmail.com"],
        [state.givers[2], "hunter@gmail.com"],
        [state.givers[3], "megan@gmail.com"]];

      givers.forEach(([giver, email]) => {
        expect(giver.email).toBe(email);
        expect(giver.date).toBe(date);
        expect(giver.id).toBe(`4_1ibc1j9_${date}`);
      })
    })

    it("invokes postToServer", async () => {
      expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/postToDb",
        {"body": JSON.stringify(state.givers), "method": "POST", "mode": "cors"});
    })

    it("displays saved emails success message", async () => {
      const sendDiv = document.querySelector("#sendEmails");
      expect(sendDiv.innerHTML).toContain("4 email addresses added successfully!");
      expect(sendDiv.innerHTML).toContain("Now let's send out those emails:");
      expect(sendDiv.innerHTML).toContain(`<button class="button" id="sendEmailsBtn">Send Emails</button>`);
      expect(sendDiv.classList).not.toContain("hidden");
      expect(sendDiv.classList).toContain("show");
    })

    it("hides email table after saving emails", async () => {
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

  describe("batchEmails", () => {
    let sendEmailsButton;
    beforeEach(() => {
      alex.recipient = "Whitney";
      whitney.recipient = "Hunter";
      hunter.recipient = "Megan";
      megan.recipient = "Alex";
      installGivers([alex, whitney, hunter, megan]);
      displaySendEmails();
      sendEmailsButton = document.querySelector("#sendEmailsBtn");
      click("#sendEmailsBtn");
    })

    it("sets button text to Loading...", () => {
      expect(sendEmailsButton.innerHTML).toContain('Loading...');
      expectColor(sendEmailsButton.style.color, "rgb(128, 128, 128)", "#808080");
    });

    it("sends emails for each giver", () => {
      state.givers.forEach((giver) => {
        expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/dispatchEmail", {
          "body": JSON.stringify({
            name: giver.name,
            recipient: giver.recipient,
            email: giver.email
          }),
          "method": "POST",
          "mode": "cors"
        });
      })
    })

    it("hides sendEmails popup", () => {
      const sendEmails = document.querySelector("#sendEmails");
      expect(sendEmails.classList).toContain("hide");
      setTimeout(() => {
        expect(sendEmails.classList).not.toContain("hide");
        expect(sendEmails.classList).not.toContain("show");
        expect(sendEmails.classList).toContain("hidden");
      }, 500);
    })

    it("displays success snackbar with number of emails sent", () => {
      shouldDisplaySuccessSnackbar("Sent 4 of 4 emails successfully!");
    });
  })

  it("handleEmailSubmitError logs response body", () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
    });
    const response = {status: 500, body: "Server error message"};

    handleEmailSubmitError(response);

    expect(consoleSpy).toHaveBeenCalledWith("Server error message");
    consoleSpy.mockRestore();
  });

  describe("submitEmails error handling", () => {
    beforeEach(() => {
      triggerEmailTableRender();
      renderEmailTableInputs([
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "whitney@test.com"}
      ]);
      installGiverNames("Alex", "Whitney");
    });

    it("logs error when postToServer returns non-200 status", async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      });
      global.fetch = vi.fn(() => Promise.resolve({
        status: 500,
        body: "Database connection failed"
      }));

      const emailTableBody = document.getElementById("emailTableBody");
      const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
      emailTableBody.dispatchEvent(submitEvent);

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Database connection failed");
      });

      consoleSpy.mockRestore();
    });
  });

  it("hideElement replaces classes after timeout", () => {
    triggerEmailTableRender();
    const table = document.querySelector("#emailTable");

    hideElement("emailTable");

    expect(table.classList).toContain("hide");

    vi.advanceTimersByTime(500);

    expect(table.classList).toContain("hidden");
    expect(table.classList).not.toContain("show");
    expect(table.classList).not.toContain("hide");
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
