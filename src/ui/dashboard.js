/**
 * Dashboard: countdown, pace and progress.
 *
 * Signed out it shows only a sign-in prompt, per the brief — there is no
 * per-user data to show, and the catalogue has its own pages.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Dashboard</h1>
<p class="sub" id="subtitle">Loading…</p>

<div id="signed-out" class="notice hide">
  <h2 style="text-transform:none;font-size:15px;color:var(--text)">Track your MCU progress</h2>
  <p class="muted" style="margin:0 0 14px">
    Sign in to record what you have watched, see how much is left, and set a countdown.
  </p>
  <a class="btn-link" href="/api/auth/google">Sign in with Google</a>
</div>

<div id="signed-in" class="hide">
  <div class="grid cols-3" style="margin-bottom:14px">
    <div class="card">
      <h2>Watched</h2>
      <div class="stat" id="stat-watched">—</div>
      <div class="stat-note" id="stat-watched-note"></div>
      <div class="bar"><i id="progress-bar" style="width:0%"></i></div>
    </div>
    <div class="card">
      <h2>Time remaining</h2>
      <div class="stat" id="stat-remaining">—</div>
      <div class="stat-note" id="stat-remaining-note"></div>
    </div>
    <div class="card">
      <h2>Pace needed</h2>
      <div class="stat" id="stat-pace">—</div>
      <div class="stat-note" id="stat-pace-note">Set a countdown to see a pace</div>
    </div>
  </div>

  <div class="card">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">Countdown</h2>
      <label class="switch">
        <input type="checkbox" id="countdown-toggle">
        <span class="muted" style="font-size:13px">Show countdown</span>
      </label>
    </div>

    <div id="countdown-panel" class="hide" style="margin-top:14px">
      <div class="stat sm" id="countdown-headline">No target set</div>
      <div class="stat-note" id="countdown-note"></div>

      <div class="row" style="margin-top:14px">
        <input type="date" id="countdown-date" aria-label="Countdown target date">
        <input type="text" id="countdown-label" placeholder="Label (optional)" aria-label="Countdown label" style="flex:1;min-width:180px">
        <button id="countdown-save">Save</button>
        <button id="countdown-clear">Clear</button>
      </div>
      <div class="stat-note" id="countdown-status"></div>

      <h2 style="margin:20px 0 0">Upcoming confirmed releases</h2>
      <div class="stat-note">Pick one to make it the countdown target.</div>
      <div class="upcoming" id="upcoming"></div>
    </div>
  </div>
</div>
`;

function dashboardMain() {
  const VISIBILITY_KEY = "mcu.countdown.visible";

  const state = { items: [], statuses: new Map(), settings: null };

  function $(id) {
    return document.getElementById(id);
  }

  function computeTotals() {
    let watched = 0;
    let remainingMinutes = 0;
    let unknownRuntime = 0;

    for (const item of state.items) {
      const status = state.statuses.get(item.id) || "unwatched";
      if (status === "watched") watched++;
      if (countsAsRemaining(status)) {
        if (typeof item.runtime_min === "number") remainingMinutes += item.runtime_min;
        else unknownRuntime++;
      }
    }
    return { watched, remainingMinutes, unknownRuntime, total: state.items.length };
  }

  function renderStats() {
    const t = computeTotals();
    const pct = t.total ? Math.round((t.watched / t.total) * 100) : 0;

    $("stat-watched").textContent = t.watched + " / " + t.total;
    $("stat-watched-note").textContent = pct + "% of the catalogue";
    $("progress-bar").style.width = pct + "%";

    $("stat-remaining").textContent = formatRuntime(t.remainingMinutes);
    $("stat-remaining-note").textContent =
      t.unknownRuntime > 0
        ? t.unknownRuntime + " unwatched item(s) have no runtime yet"
        : "Across everything not watched or skipped";

    renderPace(t);
  }

  function renderPace(t) {
    const target = state.settings && state.settings.countdown_target_date;
    const days = target ? daysUntil(target) : null;

    if (!target || days === null) {
      $("stat-pace").textContent = "—";
      $("stat-pace-note").textContent = "Set a countdown to see a pace";
      return;
    }
    if (days <= 0) {
      $("stat-pace").textContent = "—";
      $("stat-pace-note").textContent =
        days === 0 ? "Target is today" : "Target date has passed";
      return;
    }
    const perDay = t.remainingMinutes / days;
    $("stat-pace").textContent = formatRuntime(perDay) + "/day";
    $("stat-pace-note").textContent =
      "To finish " + formatRuntime(t.remainingMinutes) + " in " + days + " days";
  }

  function renderCountdown() {
    const s = state.settings || {};
    const target = s.countdown_target_date;
    const days = target ? daysUntil(target) : null;

    if (!target) {
      $("countdown-headline").textContent = "No target set";
      $("countdown-note").textContent = "Choose a date, or pick a release below.";
      return;
    }
    const label = s.countdown_label || "Countdown";
    if (days === null) {
      $("countdown-headline").textContent = label;
      $("countdown-note").textContent = "Target date is not a full date.";
    } else if (days > 0) {
      $("countdown-headline").textContent = days + (days === 1 ? " day" : " days") + " to go";
      $("countdown-note").textContent = label + " · " + displayDate(target);
    } else if (days === 0) {
      $("countdown-headline").textContent = "Today";
      $("countdown-note").textContent = label + " · " + displayDate(target);
    } else {
      $("countdown-headline").textContent = Math.abs(days) + " days ago";
      $("countdown-note").textContent = label + " · " + displayDate(target);
    }
  }

  function renderUpcoming() {
    // Only fully-specified future dates: partial placeholders like 2027-07-00
    // are not confirmed releases and cannot anchor a countdown.
    const upcoming = state.items
      .filter((i) => isRealDate(i.release_date) && daysUntil(i.release_date) > 0)
      .sort((a, b) => (a.release_date < b.release_date ? -1 : 1))
      .slice(0, 10);

    const box = $("upcoming");
    if (!upcoming.length) {
      box.innerHTML = '<div class="stat-note">No upcoming dated releases in the catalogue.</div>';
      return;
    }
    box.innerHTML = upcoming
      .map(
        (i) =>
          '<button type="button" data-date="' +
          esc(i.release_date) +
          '" data-label="' +
          esc(i.title) +
          '"><span>' +
          esc(i.title) +
          '</span><span class="d">' +
          esc(displayDate(i.release_date)) +
          " · " +
          daysUntil(i.release_date) +
          "d</span></button>"
      )
      .join("");

    for (const btn of box.querySelectorAll("button")) {
      btn.addEventListener("click", function () {
        saveSettings(btn.getAttribute("data-date"), btn.getAttribute("data-label"));
      });
    }
  }

  async function saveSettings(date, label) {
    const note = $("countdown-status");
    note.textContent = "Saving…";
    try {
      const res = await apiPut("/api/settings", {
        countdown_target_date: date,
        countdown_label: label,
      });
      state.settings = res.settings;
      $("countdown-date").value = res.settings.countdown_target_date || "";
      $("countdown-label").value = res.settings.countdown_label || "";
      note.textContent = date ? "Saved." : "Countdown cleared.";
      renderCountdown();
      renderStats();
    } catch (e) {
      note.textContent = "Could not save: " + e.message;
    }
  }

  function setCountdownVisible(visible) {
    $("countdown-panel").classList.toggle("hide", !visible);
    $("countdown-toggle").checked = visible;
    try {
      localStorage.setItem(VISIBILITY_KEY, visible ? "1" : "0");
    } catch (e) {}
  }

  async function main() {
    initNav();
    const me = await initSignedInLabel();

    if (!me.signedIn) {
      $("subtitle").textContent = "Signed out — sign in to track your progress.";
      $("signed-out").classList.remove("hide");
      return;
    }

    $("signed-in").classList.remove("hide");

    try {
      const [items, watch, settings] = await Promise.all([
        apiGet("/api/items"),
        apiGet("/api/watch-status"),
        apiGet("/api/settings"),
      ]);

      state.items = items.data.items;
      state.settings = settings.data ? settings.data.settings : {};
      for (const row of (watch.data && watch.data.watch_status) || []) {
        state.statuses.set(row.item_id, row.status);
      }

      $("subtitle").textContent = state.items.length + " titles in the catalogue";

      $("countdown-date").value = state.settings.countdown_target_date || "";
      $("countdown-label").value = state.settings.countdown_label || "";

      let visible = false;
      try {
        const stored = localStorage.getItem(VISIBILITY_KEY);
        // Default to showing it when a target already exists.
        visible = stored === null ? !!state.settings.countdown_target_date : stored === "1";
      } catch (e) {
        visible = !!state.settings.countdown_target_date;
      }
      setCountdownVisible(visible);

      renderStats();
      renderCountdown();
      renderUpcoming();

      $("countdown-toggle").addEventListener("change", function (ev) {
        setCountdownVisible(ev.target.checked);
      });
      $("countdown-save").addEventListener("click", function () {
        const date = $("countdown-date").value;
        if (!date) {
          $("countdown-status").textContent = "Pick a date first.";
          return;
        }
        saveSettings(date, $("countdown-label").value.trim() || null);
      });
      $("countdown-clear").addEventListener("click", function () {
        $("countdown-date").value = "";
        $("countdown-label").value = "";
        saveSettings(null, null);
      });
    } catch (e) {
      showError("Could not load your data: " + e.message);
    }
  }

  main();
}

export function dashboardPage() {
  return renderPage({
    title: "Dashboard",
    active: "dashboard",
    body: BODY,
    main: dashboardMain,
  });
}
