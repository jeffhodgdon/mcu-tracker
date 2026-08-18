/**
 * Admin: data auditing and inline editing, gated server-side by worker.js's
 * ADMIN_USER_IDS check on both /admin and every /api/admin/* route. This
 * page assumes it is only ever served to an admin — no client-side gate is
 * needed beyond the nav link itself being hidden for everyone else.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Admin</h1>
<p class="sub" id="subtitle">Loading…</p>

<div class="filter-bar" style="flex-direction:row;justify-content:center">
  <div class="filter-bar-types">
    <button type="button" class="tab-btn" data-tab="issues" aria-pressed="true">Data Issues</button>
    <button type="button" class="tab-btn" data-tab="edit" aria-pressed="false">Edit Item</button>
    <button type="button" class="tab-btn" data-tab="all" aria-pressed="false">All Items</button>
  </div>
</div>

<div id="tab-issues" class="tab-panel">
  <div id="audit-sections">
    <p class="muted" style="text-align:center">Loading…</p>
  </div>
</div>

<div id="tab-edit" class="tab-panel hide">
  <div class="card">
    <div class="row" style="margin-bottom:14px">
      <input type="search" id="item-picker" placeholder="Search by title…" style="flex:1;min-width:220px" autocomplete="off">
    </div>
    <div id="item-picker-results" class="admin-picker-results hide"></div>

    <form id="edit-form" class="hide">
      <div class="admin-field-grid">
        <label>Title
          <input type="text" id="f-title" required>
        </label>
        <label>Type
          <select id="f-type">
            <option>Film</option>
            <option>TV Series</option>
            <option>One-Shot</option>
            <option>Special Presentation</option>
            <option>Marvel Television</option>
            <option>Animated Series</option>
          </select>
        </label>
        <label>Release date
          <input type="text" id="f-release-date" placeholder="YYYY-MM-DD">
        </label>
        <label>Phase
          <input type="text" id="f-phase">
        </label>
        <label>Runtime (min)
          <input type="text" id="f-runtime" placeholder="e.g. 143">
        </label>
        <label>Chrono order
          <input type="text" id="f-chrono-order" placeholder="e.g. 12">
        </label>
        <label class="switch" style="margin-top:22px">
          <input type="checkbox" id="f-is-estimate">
          Runtime is an estimate
        </label>
      </div>
      <div class="row" style="margin-top:16px">
        <button type="submit" class="btn-primary">Save changes</button>
        <span id="edit-feedback"></span>
      </div>
    </form>
  </div>
</div>

<div id="tab-all" class="tab-panel hide">
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead>
        <tr>
          <th style="text-align:center;cursor:pointer" id="sort-title">Title ▾</th>
          <th class="opt" style="text-align:center">Type</th>
          <th style="text-align:center;cursor:pointer" id="sort-release">Release date</th>
          <th class="opt" style="text-align:center">Phase</th>
          <th class="num opt" style="text-align:center">Runtime</th>
          <th class="opt" style="text-align:center">Est.</th>
          <th class="num opt" style="text-align:center">Chrono order</th>
          <th style="width:70px;text-align:center">Edit</th>
        </tr>
      </thead>
      <tbody id="all-rows">
        <tr><td colspan="8" class="muted" style="padding:18px">Loading…</td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

function adminMain() {
  const state = { items: [], allSort: { key: "title", dir: 1 }, editingId: null };

  function $(id) {
    return document.getElementById(id);
  }

  function setTab(tab) {
    for (const panel of document.querySelectorAll(".tab-panel")) {
      panel.classList.toggle("hide", panel.id !== "tab-" + tab);
    }
    for (const btn of document.querySelectorAll(".tab-btn")) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-tab") === tab ? "true" : "false");
    }
  }

  function auditRowHtml(item, valueLabel) {
    return (
      "<tr><td><span class=\"title\">" +
      esc(item.title) +
      "</span></td><td class=\"opt\"><span class=\"badge\" data-type=\"" +
      esc(item.type) +
      "\">" +
      esc(item.type) +
      "</span></td><td>" +
      esc(valueLabel) +
      "</td></tr>"
    );
  }

  function auditSectionHtml(label, items, valueOf) {
    const rows = items.map((i) => auditRowHtml(i, valueOf(i))).join("");
    return (
      '<div class="card" style="margin-bottom:16px">' +
      "<h2>" +
      esc(label) +
      " (" +
      items.length +
      ")</h2>" +
      (items.length
        ? '<table><thead><tr><th style="text-align:center">Title</th><th class="opt" style="text-align:center">Type</th><th style="text-align:center">Value</th></tr></thead><tbody>' +
          rows +
          "</tbody></table>"
        : '<p class="muted" style="text-align:center;margin:0">No issues.</p>') +
      "</div>"
    );
  }

  async function loadAudit() {
    try {
      const res = await apiGet("/api/admin/audit");
      const a = res.data.audit;
      $("audit-sections").innerHTML =
        auditSectionHtml("Missing runtime", a.missing_runtime, function () {
          return "—";
        }) +
        auditSectionHtml("Estimated runtime", a.estimated_runtime, function (i) {
          return i.runtime_min === null ? "—" : formatRuntime(i.runtime_min);
        }) +
        auditSectionHtml("Missing release date", a.missing_release_date, function () {
          return "—";
        }) +
        auditSectionHtml("Missing phase", a.missing_phase, function () {
          return "—";
        }) +
        auditSectionHtml("Missing chrono order", a.missing_chrono_order, function () {
          return "—";
        });
    } catch (e) {
      $("audit-sections").innerHTML = '<p class="muted" style="text-align:center">Could not load audit.</p>';
      showError(e.message);
    }
  }

  function populateForm(item) {
    state.editingId = item.id;
    $("f-title").value = item.title || "";
    $("f-type").value = item.type || "Film";
    $("f-release-date").value = item.release_date || "";
    $("f-phase").value = item.phase || "";
    $("f-runtime").value = item.runtime_min === null || item.runtime_min === undefined ? "" : item.runtime_min;
    $("f-chrono-order").value =
      item.chrono_order === null || item.chrono_order === undefined ? "" : item.chrono_order;
    $("f-is-estimate").checked = !!item.is_estimate;
    $("edit-feedback").textContent = "";
    $("edit-feedback").className = "";
    $("edit-form").classList.remove("hide");
  }

  function openEditor(item) {
    setTab("edit");
    populateForm(item);
  }

  function onPickerInput(ev) {
    const q = ev.target.value.trim().toLowerCase();
    const box = $("item-picker-results");
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
    for (const btn of box.querySelectorAll("[data-id]")) {
      btn.addEventListener("click", function () {
        const item = state.items.find((i) => i.id === Number(btn.getAttribute("data-id")));
        if (item) {
          $("item-picker").value = item.title;
          box.classList.add("hide");
          populateForm(item);
        }
      });
    }
  }

  async function onFormSubmit(ev) {
    ev.preventDefault();
    if (!state.editingId) return;

    const body = {
      title: $("f-title").value.trim(),
      type: $("f-type").value,
      release_date: $("f-release-date").value.trim() || null,
      phase: $("f-phase").value.trim() || null,
      runtime_min: $("f-runtime").value.trim() === "" ? null : Number($("f-runtime").value.trim()),
      chrono_order:
        $("f-chrono-order").value.trim() === "" ? null : Number($("f-chrono-order").value.trim()),
      is_estimate: $("f-is-estimate").checked,
    };

    const feedback = $("edit-feedback");
    const btn = ev.target.querySelector("button[type=submit]");
    btn.disabled = true;
    feedback.textContent = "Saving…";
    feedback.className = "muted";
    try {
      const res = await apiPut2("/api/admin/items/" + state.editingId, body);
      const updated = res.item;
      const idx = state.items.findIndex((i) => i.id === updated.id);
      if (idx !== -1) state.items[idx] = updated;
      feedback.textContent = "Saved.";
      feedback.className = "";
      feedback.style.color = "var(--done)";
      renderAllRows();
    } catch (e) {
      feedback.textContent = "Error: " + e.message;
      feedback.style.color = "#ffb4b4";
    } finally {
      btn.disabled = false;
    }
  }

  // apiPut sends a PUT; admin edits are PATCH, so this mirrors apiPut's
  // shape (same error handling) but with the correct method.
  async function apiPut2(path, body) {
    const res = await fetch(path, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = res.status;
      try {
        detail = (await res.json()).error || detail;
      } catch (e) {}
      throw new Error(String(detail));
    }
    return res.json();
  }

  function allRowHtml(item) {
    return (
      "<tr><td><span class=\"title\">" +
      esc(item.title) +
      "</span></td><td class=\"opt\"><span class=\"badge\" data-type=\"" +
      esc(item.type) +
      "\">" +
      esc(item.type) +
      "</span></td><td>" +
      esc(displayDate(item.release_date)) +
      '</td><td class="opt">' +
      esc(item.phase || "—") +
      '</td><td class="num opt">' +
      (item.runtime_min === null ? "—" : formatRuntime(item.runtime_min)) +
      '</td><td class="opt">' +
      (item.is_estimate ? "Yes" : "—") +
      '</td><td class="num opt">' +
      (item.chrono_order === null || item.chrono_order === undefined ? "—" : item.chrono_order) +
      '</td><td><button type="button" class="admin-edit-btn" data-id="' +
      item.id +
      '">Edit</button></td></tr>'
    );
  }

  function renderAllRows() {
    const sorted = state.items.slice().sort(function (a, b) {
      const key = state.allSort.key;
      let av = a[key];
      let bv = b[key];
      if (av === null || av === undefined) av = "";
      if (bv === null || bv === undefined) bv = "";
      if (av < bv) return -1 * state.allSort.dir;
      if (av > bv) return 1 * state.allSort.dir;
      return 0;
    });

    $("all-rows").innerHTML = sorted.map(allRowHtml).join("");
    for (const btn of $("all-rows").querySelectorAll("[data-id]")) {
      btn.addEventListener("click", function () {
        const item = state.items.find((i) => i.id === Number(btn.getAttribute("data-id")));
        if (item) openEditor(item);
      });
    }
  }

  function onSortClick(key) {
    if (state.allSort.key === key) state.allSort.dir *= -1;
    else state.allSort = { key: key, dir: 1 };
    renderAllRows();
  }

  async function loadItems() {
    try {
      const res = await apiGet("/api/admin/items");
      state.items = res.data.items;
      $("subtitle").textContent = state.items.length + " items";
      renderAllRows();
    } catch (e) {
      $("all-rows").innerHTML =
        '<tr><td colspan="8" class="muted" style="padding:18px">Could not load items.</td></tr>';
      showError(e.message);
    }
  }

  async function main() {
    initNav();
    const me = await initSignedInLabel();
    if (!me.signedIn) {
      showError("Sign in as an admin to use this page.");
      return;
    }

    for (const btn of document.querySelectorAll(".tab-btn")) {
      btn.addEventListener("click", function () {
        setTab(btn.getAttribute("data-tab"));
      });
    }

    $("item-picker").addEventListener("input", onPickerInput);
    $("edit-form").addEventListener("submit", onFormSubmit);
    $("sort-title").addEventListener("click", function () {
      onSortClick("title");
    });
    $("sort-release").addEventListener("click", function () {
      onSortClick("release_date");
    });

    await loadItems();
    await loadAudit();
  }

  main();
}

export function adminPage() {
  return renderPage({
    title: "Admin",
    active: "admin",
    body: BODY,
    main: adminMain,
  });
}
