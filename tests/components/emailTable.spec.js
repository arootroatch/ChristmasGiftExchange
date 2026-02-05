import {beforeEach, beforeAll, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installGiverNames,
  installGivers,
  shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar,
  shouldDisplaySuccessSnackbar,
  stubFetch
} from "../specHelper";
import "../../resources/js/components/name";
import state from "../../resources/js/state";
import {alex, hunter, megan, whitney} from "../testData";
import {
  displaySendEmails,
  emailInput,
  getEmails,
  handleEmailSubmitError,
  hideElement, initEventListeners,
  showEmailTable
} from "../../resources/js/components/emailTable";

function renderEmailTable(givers) {
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

  beforeAll(initEventListeners)

  describe("submitEmails", () => {
    renderEmailTable([
      {name: "Alex", email: "arootroatch@gmail.com"},
      {name: "Whitney", email: "whitney@gmail.com"},
      {name: "Hunter", email: "hunter@gmail.com"},
      {name: "Megan", email: "megan@gmail.com"}]);
    installGiverNames("Alex", "Whitney", "Hunter", "Megan");
    const submitEmailsButton = document.querySelector("#submitEmails");

    beforeEach(() => {
      const emailTableBody = document.getElementById("emailTableBody");
      const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
      emailTableBody.dispatchEvent(submitEvent);
    })

    it('sets button text to Loading...', () => {
      expect(submitEmailsButton.innerHTML).toBe('Loading...');
    })

    it("sets button color to #808080", () => {
      expectColor(submitEmailsButton.style.color, "rgb(128, 128, 128)", "#808080");
    })

    it("gets emails from form", () => {
      const result = getEmails();
      expect(result).toContainEqual({"name": "Alex", "email": "arootroatch@gmail.com", "index": "0"});
      expect(result).toContainEqual({"name": "Whitney", "email": "whitney@gmail.com", "index": "1"});
      expect(result).toContainEqual({"name": "Hunter", "email": "hunter@gmail.com", "index": "2"});
      expect(result).toContainEqual({"name": "Megan", "email": "megan@gmail.com", "index": "3"});
    })

    it("invokes getEmails", () => {
      expect(getEmails).toHaveBeenCalled();
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
      expect(table.classList).toContain("hide");

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
      renderEmailTable([
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
    const table = document.querySelector("#emailTable");
    table.classList.remove("hidden");
    table.classList.add("show");

    hideElement("emailTable");

    expect(table.classList).toContain("hide");

    vi.advanceTimersByTime(500);

    expect(table.classList).toContain("hidden");
    expect(table.classList).not.toContain("show");
    expect(table.classList).not.toContain("hide");
  });

  it("emailInput returns correct HTML template", () => {
    state.givers = [{name: "Alex"}, {name: "Whitney"}];
    const result = emailInput(0);

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

  describe("showEmailTable", () => {

    it("shows error snackbar when state.generated is false", () => {
      state.isGenerated = false;
      showEmailTable();

      shouldDisplayErrorSnackbar('Please click "Generate List" before entering emails.');
    });

    it("renders email inputs and shows table when state.generated is true", () => {
      state.isGenerated = true;
      state.isSecretSanta = true;
      state.givers = [{name: "TestUser1"}, {name: "TestUser2"}];
      const table = document.querySelector("#emailTable");
      const body = document.querySelector("#emailTableBody");
      table.classList.remove("show");
      table.classList.add("hidden");

      showEmailTable();

      shouldDisplayEmailTable("TestUser1", "TestUser2");
    });

    it("displays hideEmails button when state.secretSanta is false", () => {
      state.isGenerated = true;
      state.isSecretSanta = false;
      state.givers = [{name: "TestUser"}];
      const hideButton = document.querySelector("#hideEmails");
      const table = document.querySelector("#emailTable");
      table.classList.remove("show");
      table.classList.add("hidden");
      hideButton.style.display = "none";

      showEmailTable();

      expect(hideButton.style.display).toBe("block");
    });
  });

  it("hideEmailTable hides the table and button", () => {
    const table = document.querySelector("#emailTable");
    const hideButton = document.querySelector("#hideEmails");
    table.classList.remove("hidden");
    table.classList.add("show");
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
