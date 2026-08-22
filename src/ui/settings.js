/**
 * Settings: preferences, bulk data actions, feedback, and account deletion,
 * every account-level control that doesn't belong on a catalogue page.
 * Visible to any signed-in user (see the "⚙ Settings" nav entry in
 * shell.js); a signed-out visitor gets the same "sign in" notice other.js
 * uses instead of the form controls.
 */

import { renderPage } from "./shell.js";

const TIMEZONE_GROUPS = [
  [
    "Americas",
    [
      ["America/St_Johns", "Newfoundland (UTC-3:30)"],
      ["America/Halifax", "Atlantic Time (UTC-4)"],
      ["America/New_York", "Eastern Time (UTC-5)"],
      ["America/Chicago", "Central Time (UTC-6)"],
      ["America/Denver", "Mountain Time (UTC-7)"],
      ["America/Phoenix", "Arizona (UTC-7)"],
      ["America/Los_Angeles", "Pacific Time (UTC-8)"],
      ["America/Anchorage", "Alaska (UTC-9)"],
      ["Pacific/Honolulu", "Hawaii (UTC-10)"],
      ["America/Mexico_City", "Mexico City (UTC-6)"],
      ["America/Bogota", "Bogotá (UTC-5)"],
      ["America/Lima", "Lima (UTC-5)"],
      ["America/Santiago", "Santiago (UTC-4)"],
      ["America/Sao_Paulo", "São Paulo (UTC-3)"],
      ["America/Argentina/Buenos_Aires", "Buenos Aires (UTC-3)"],
    ],
  ],
  [
    "Europe/Africa",
    [
      ["Europe/London", "London (UTC+0)"],
      ["Europe/Lisbon", "Lisbon (UTC+0)"],
      ["Africa/Casablanca", "Casablanca (UTC+0)"],
      ["Europe/Paris", "Paris (UTC+1)"],
      ["Europe/Berlin", "Berlin (UTC+1)"],
      ["Europe/Madrid", "Madrid (UTC+1)"],
      ["Africa/Lagos", "Lagos (UTC+1)"],
      ["Europe/Rome", "Rome (UTC+1)"],
      ["Europe/Athens", "Athens (UTC+2)"],
      ["Europe/Helsinki", "Helsinki (UTC+2)"],
      ["Africa/Cairo", "Cairo (UTC+2)"],
      ["Africa/Johannesburg", "Johannesburg (UTC+2)"],
      ["Europe/Moscow", "Moscow (UTC+3)"],
      ["Africa/Nairobi", "Nairobi (UTC+3)"],
    ],
  ],
  [
    "Asia/Pacific",
    [
      ["Asia/Dubai", "Dubai (UTC+4)"],
      ["Asia/Karachi", "Karachi (UTC+5)"],
      ["Asia/Kolkata", "Mumbai/Delhi (UTC+5:30)"],
      ["Asia/Dhaka", "Dhaka (UTC+6)"],
      ["Asia/Bangkok", "Bangkok (UTC+7)"],
      ["Asia/Jakarta", "Jakarta (UTC+7)"],
      ["Asia/Shanghai", "Beijing/Shanghai (UTC+8)"],
      ["Asia/Hong_Kong", "Hong Kong (UTC+8)"],
      ["Asia/Singapore", "Singapore (UTC+8)"],
      ["Asia/Tokyo", "Tokyo (UTC+9)"],
      ["Asia/Seoul", "Seoul (UTC+9)"],
      ["Australia/Adelaide", "Adelaide (UTC+9:30)"],
      ["Australia/Sydney", "Sydney (UTC+10)"],
      ["Australia/Brisbane", "Brisbane (UTC+10)"],
      ["Pacific/Auckland", "Auckland (UTC+12)"],
    ],
  ],
  [
    "UTC/Other",
    [["UTC", "UTC (UTC+0)"]],
  ],
];

const FEEDBACK_TYPES = ["Wrong data", "Missing data", "Bug report", "Other"];

const BODY = `
<h1>Settings</h1>
<p class="sub" id="subtitle">Manage your preferences and data</p>

<div id="signed-out" class="notice hide">
  <strong>Sign in to manage your settings.</strong>
  <span class="muted">These preferences and data controls are per-account.</span>
  <div style="margin-top:12px"><a class="btn-link" href="/api/auth/google">Sign in with Google</a></div>
</div>

<div id="settings-body" class="hide">

  <div class="card" style="margin-bottom:16px">
    <button type="button" id="howto-toggle" style="width:100%;background:none;border:none;padding:0" aria-expanded="false" aria-controls="howto-body">
      <span class="howto-toggle-spacer"></span>
      <h2 style="margin:0">How to Use</h2>
      <span id="howto-arrow" class="muted">▶</span>
    </button>
    <div id="howto-body" class="hide" style="margin-top:14px;font-size:13.5px">
      <p><strong>What this app does</strong><br>
      MCU Tracker catalogues every Marvel Cinematic Universe release (films, TV
      seasons, one-shots, specials) so you can track what you&#39;ve watched, plan
      what to watch next, and browse the catalogue in whatever order makes
      sense to you.</p>

      <p><strong>Dashboard</strong><br>
      Your home base: overall progress stats, an upcoming-release countdown,
      and your watch list (see below).</p>

      <p><strong>Release Order</strong><br>
      Everything sorted by real-world release date, the order it actually came
      out in theaters/streaming.</p>

      <p><strong>Chronological</strong><br>
      Everything sorted by in-universe timeline order instead: when events
      happen in the story, not when they were released.</p>

      <p><strong>Consolidated</strong><br>
      One row per franchise (e.g. all of "Iron Man" together) instead of one
      row per entry. Expand a franchise to see its individual films/seasons.</p>

      <p><strong>Other Universes</strong><br>
      A reference list of related-but-non-MCU titles (pre-MCU Marvel films,
      Fox X-Men, Sony Spider-Man, etc.) with the same watch tracking as the
      main catalogue.</p>

      <p><strong>The watch list</strong><br>
      Add anything from the catalogue to your personal watch list from the
      Dashboard&#39;s "Build Watch List" button. It&#39;s a shortlist of what you
      intend to watch next, separate from your watch status on every item.</p>

      <p><strong>Watch status tracking</strong><br>
      Every film/season has a status control (Unwatched, Watched, Rewatch,
      Skip). TV seasons also track individual episodes: expand a season&#39;s
      arrow to check off episodes one at a time; the season-level status
      updates to match once every episode is checked.</p>

      <p><strong>Build Watch List modal</strong><br>
      Opened from the Dashboard, it lists the full catalogue grouped by
      franchise/type with checkboxes. Check anything you want tracked, then
      submit to add it all to your watch list at once.</p>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>Preferences</h2>
    <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted);max-width:360px">
      Timezone
      <select id="timezone-select">
        ${TIMEZONE_GROUPS.map(
          (group) =>
            '<optgroup label="' +
            group[0] +
            '">' +
            group[1].map((tz) => '<option value="' + tz[0] + '">' + tz[1] + "</option>").join("") +
            "</optgroup>"
        ).join("")}
      </select>
    </label>
    <div id="timezone-status" class="stat-note" style="margin-top:8px"></div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>Bulk Actions</h2>
    <div class="row" style="gap:12px">
      <div id="clear-watch-status-action">
        <button type="button" id="clear-watch-status-btn" class="btn-primary" style="background:var(--card2);border-color:var(--border);color:var(--text)">Clear Watch Status</button>
      </div>
      <div id="reset-all-action">
        <button type="button" id="reset-all-btn" class="btn-danger">Reset All Data</button>
      </div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px;margin-bottom:0">
      Clear Watch Status resets every watched/skipped flag but keeps your
      watch list. Reset All Data also empties your watch list, both start
      you over from a clean slate.
    </p>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h2>Feedback</h2>
    <form id="feedback-form">
      <div class="admin-field-grid" style="grid-template-columns:1fr">
        <label>Type
          <select id="fb-type">
            ${FEEDBACK_TYPES.map((t) => "<option>" + t + "</option>").join("")}
          </select>
        </label>
        <label>Item <span class="muted">(optional)</span>
          <input type="search" id="fb-item-picker" placeholder="Search by title…" autocomplete="off">
          <div id="fb-item-picker-results" class="admin-picker-results hide"></div>
          <input type="hidden" id="fb-item-id">
        </label>
        <label>Message
          <textarea id="fb-message" rows="4" required style="font:inherit;background:var(--card2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 10px;resize:vertical"></textarea>
        </label>
      </div>
      <div class="row" style="margin-top:12px">
        <button type="submit" class="btn-primary">Submit Feedback</button>
      </div>
      <div id="feedback-status" class="stat-note" style="margin-top:8px"></div>
    </form>
  </div>

  <div class="card" style="border-color:#5b2a2f">
    <h2>Account</h2>
    <div id="delete-account-action">
      <button type="button" id="delete-account-btn" class="btn-danger">Delete My Data</button>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px;margin-bottom:0">
      Permanently deletes your account and all associated data: watch
      status, watch list, settings, and feedback. This cannot be undone.
    </p>
  </div>

</div>
`;

function settingsMain() {
  const state = { items: [], selectedItemId: null };

  function $(id) {
    return document.getElementById(id);
  }

  /* ------------------------------------------------------ How to Use panel */

  function wireHowTo() {
    const toggle = $("howto-toggle");
    const body = $("howto-body");
    const arrow = $("howto-arrow");
    toggle.addEventListener("click", function () {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      body.classList.toggle("hide", expanded);
      arrow.textContent = expanded ? "▶" : "▼";
    });
  }

  /* --------------------------------------------------------- timezone pref */

  async function loadTimezone() {
    try {
      const res = await apiGet("/api/settings");
      $("timezone-select").value = (res.data && res.data.settings.timezone) || "America/New_York";
    } catch (e) {
      showError("Could not load settings: " + e.message);
    }
  }

  function wireTimezone() {
    $("timezone-select").addEventListener("change", async function (ev) {
      const select = ev.target;
      const previous = select.getAttribute("data-previous") || select.value;
      const statusBox = $("timezone-status");
      select.disabled = true;
      statusBox.textContent = "Saving…";
      try {
        await apiPut("/api/settings", { timezone: select.value });
        select.setAttribute("data-previous", select.value);
        statusBox.textContent = "Saved.";
      } catch (e) {
        select.value = previous;
        statusBox.textContent = "Could not save: " + e.message;
      } finally {
        select.disabled = false;
      }
    });
  }

  /* --------------------------------------------------- inline confirm rows */

  /**
   * Replaces a button with an inline "Are you sure?" row (Confirm/Cancel),
   * rather than the browser's confirm() dialog the task explicitly asks to
   * avoid. `onConfirm` runs when the user confirms; the button is restored
   * either way once it resolves (or immediately on cancel).
   */
  function wireConfirmAction(containerId, btnId, promptText, onConfirm) {
    const container = $(containerId);
    const btn = $(btnId);
    const originalHtml = container.innerHTML;

    btn.addEventListener("click", function () {
      container.innerHTML =
        '<div class="row" style="gap:8px;flex-wrap:wrap">' +
        '<span style="font-size:13px">' +
        promptText +
        "</span>" +
        '<button type="button" class="btn-danger" data-confirm-yes>Yes, continue</button>' +
        '<button type="button" data-confirm-no>Cancel</button>' +
        "</div>";

      container.querySelector("[data-confirm-no]").addEventListener("click", function () {
        container.innerHTML = originalHtml;
        wireConfirmAction(containerId, btnId, promptText, onConfirm);
      });

      container.querySelector("[data-confirm-yes]").addEventListener("click", async function (ev) {
        const yesBtn = ev.currentTarget;
        yesBtn.disabled = true;
        yesBtn.textContent = "Working…";
        try {
          await onConfirm();
        } catch (e) {
          showError(e.message);
        } finally {
          container.innerHTML = originalHtml;
          wireConfirmAction(containerId, btnId, promptText, onConfirm);
        }
      });
    });
  }

  function wireBulkActions() {
    wireConfirmAction(
      "clear-watch-status-action",
      "clear-watch-status-btn",
      "Clear all watch status? Your watch list stays intact.",
      async function () {
        await apiPost("/api/settings/clear-watch-status", {});
        $("timezone-status").textContent = "";
      }
    );

    wireConfirmAction(
      "reset-all-action",
      "reset-all-btn",
      "Reset ALL data: watch status and watch list will be reset. This cannot be undone.",
      async function () {
        await apiPost("/api/settings/reset-all", {});
      }
    );
  }

  /* -------------------------------------------------------------- feedback */

  function wireFeedbackItemPicker() {
    const input = $("fb-item-picker");
    const box = $("fb-item-picker-results");

    input.addEventListener("input", function () {
      const q = input.value.trim().toLowerCase();
      state.selectedItemId = null;
      $("fb-item-id").value = "";
      if (!q) {
        box.classList.add("hide");
        box.innerHTML = "";
        return;
      }
      const matches = state.items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 12);
      box.innerHTML = matches
        .map(
          (i) =>
            '<button type="button" class="admin-picker-item" data-id="' +
            i.id +
            '">' +
            esc(i.title) +
            "</button>"
        )
        .join("");
      box.classList.toggle("hide", matches.length === 0);
      for (const optBtn of box.querySelectorAll("[data-id]")) {
        optBtn.addEventListener("click", function () {
          const item = state.items.find((i) => i.id === Number(optBtn.getAttribute("data-id")));
          if (item) {
            input.value = item.title;
            state.selectedItemId = item.id;
            $("fb-item-id").value = String(item.id);
          }
          box.classList.add("hide");
          box.innerHTML = "";
        });
      }
    });
  }

  function wireFeedbackForm() {
    $("feedback-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const statusBox = $("feedback-status");
      const message = $("fb-message").value.trim();
      if (!message) {
        statusBox.textContent = "Message is required.";
        return;
      }

      const submitBtn = ev.currentTarget.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      statusBox.textContent = "Submitting…";
      try {
        await apiPost("/api/settings/feedback", {
          type: $("fb-type").value,
          item_id: state.selectedItemId,
          message,
        });
        statusBox.textContent = "Thanks, feedback submitted.";
        $("feedback-form").reset();
        $("fb-item-id").value = "";
        state.selectedItemId = null;
      } catch (e) {
        statusBox.textContent = "Could not submit: " + e.message;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* --------------------------------------------------------------- account */

  function wireDeleteAccount() {
    const container = $("delete-account-action");
    const btn = $("delete-account-btn");
    const originalHtml = container.innerHTML;

    btn.addEventListener("click", function () {
      container.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:8px;max-width:360px">' +
        '<span style="font-size:13px">This permanently deletes your account and all data. Type <strong>DELETE</strong> to confirm.</span>' +
        '<input type="text" id="delete-confirm-input" autocomplete="off" placeholder="Type DELETE">' +
        '<div class="row" style="gap:8px">' +
        '<button type="button" class="btn-danger" id="delete-confirm-yes" disabled>Delete permanently</button>' +
        '<button type="button" id="delete-confirm-no">Cancel</button>' +
        "</div>" +
        "</div>";

      const confirmInput = container.querySelector("#delete-confirm-input");
      const yesBtn = container.querySelector("#delete-confirm-yes");

      confirmInput.addEventListener("input", function () {
        yesBtn.disabled = confirmInput.value !== "DELETE";
      });

      container.querySelector("#delete-confirm-no").addEventListener("click", function () {
        container.innerHTML = originalHtml;
        wireDeleteAccount();
      });

      yesBtn.addEventListener("click", async function () {
        yesBtn.disabled = true;
        yesBtn.textContent = "Deleting…";
        try {
          await apiPost("/api/settings/delete-account", {});
          location.href = "/";
        } catch (e) {
          showError("Could not delete account: " + e.message);
          container.innerHTML = originalHtml;
          wireDeleteAccount();
        }
      });
    });
  }

  async function main() {
    initNav();
    const me = await initSignedInLabel();

    if (!me.signedIn) {
      $("signed-out").classList.remove("hide");
      return;
    }

    $("settings-body").classList.remove("hide");

    wireHowTo();
    wireTimezone();
    wireBulkActions();
    wireFeedbackItemPicker();
    wireFeedbackForm();
    wireDeleteAccount();

    await loadTimezone();

    try {
      const res = await apiGet("/api/items");
      state.items = (res.data && res.data.items) || [];
    } catch (e) {
      // Item search is optional; feedback can still be submitted without it.
    }
  }

  main();
}

export function settingsPage() {
  return renderPage({
    title: "Settings",
    active: "settings",
    body: BODY,
    main: settingsMain,
  });
}
