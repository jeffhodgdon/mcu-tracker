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
        <label id="f-runtime-label">Runtime (min)
          <input type="text" id="f-runtime" placeholder="e.g. 143">
        </label>
        <label>Chrono order
          <input type="text" id="f-chrono-order" placeholder="e.g. 12">
        </label>
        <label class="switch" id="f-is-estimate-label" style="margin-top:22px">
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

  <div class="card hide" id="episodes-card" style="margin-top:16px">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">Episodes</h2>
      <button type="button" id="episode-add-btn">Add Episode</button>
    </div>
    <table style="margin-top:12px">
      <thead>
        <tr>
          <th style="width:70px;text-align:center">#</th>
          <th style="text-align:center">Title</th>
          <th style="width:110px;text-align:center">Runtime (min)</th>
          <th style="width:70px;text-align:center">Est.</th>
          <th style="width:60px;text-align:center"></th>
        </tr>
      </thead>
      <tbody id="episode-rows"></tbody>
    </table>
    <div class="row" style="margin-top:14px">
      <button type="button" id="episode-save-btn" class="btn-primary">Save Episodes</button>
      <span id="episode-feedback"></span>
    </div>
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
  // Declared inside adminMain (not at module scope) because renderPage()
  // reflects only this function's own source via Function.prototype.toString()
  // into the browser bundle — a sibling module-level const would be a
  // dangling free variable at runtime, exactly like RUNTIME_FNS/stripNameCalls
  // exists to prevent for cross-function calls. Mirrors the local TV_TYPES
  // constant release.js and chronological.js each declare inside their own
  // *Main() function for the same reason.
  const ADMIN_TV_TYPES = ["TV Series", "Marvel Television", "Animated Series"];

  const state = { items: [], allSort: { key: "title", dir: 1 }, editingId: null, episodes: [] };

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
      '<tr class="admin-clickable-row" data-id="' +
      item.id +
      '"><td><span class="title">' +
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
      '<div class="card admin-audit-section" style="margin-bottom:16px">' +
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

  function missingEpisodeNamesSectionHtml(groups) {
    const count = groups.reduce(function (sum, g) {
      return sum + g.episodes.length;
    }, 0);

    const body = groups
      .map(function (g) {
        const epRows = g.episodes
          .map(function (ep) {
            return (
              '<tr class="admin-clickable-row" data-id="' +
              g.item_id +
              '"><td style="padding-left:26px">E' +
              String(ep.episode_number).padStart(2, "0") +
              "</td><td>" +
              (ep.title ? esc(ep.title) : '<span class="muted">(empty)</span>') +
              "</td></tr>"
            );
          })
          .join("");

        return (
          '<tr class="admin-clickable-row admin-audit-subheader" data-id="' +
          g.item_id +
          '"><td colspan="2"><span class="title">' +
          esc(g.item_title) +
          "</span> <span class=\"badge\" data-type=\"" +
          esc(g.item_type) +
          "\">" +
          esc(g.item_type) +
          "</span></td></tr>" +
          epRows
        );
      })
      .join("");

    return (
      '<div class="card admin-audit-section" style="margin-bottom:16px">' +
      "<h2>Missing episode names (" +
      count +
      ")</h2>" +
      (groups.length
        ? '<table><thead><tr><th style="text-align:center">Episode</th><th style="text-align:center">Title</th></tr></thead><tbody>' +
          body +
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
        }) +
        missingEpisodeNamesSectionHtml(a.missing_episode_names || []);

      for (const row of $("audit-sections").querySelectorAll(".admin-clickable-row")) {
        row.addEventListener("click", function () {
          const item = state.items.find((i) => i.id === Number(row.getAttribute("data-id")));
          if (item) openEditor(item);
        });
      }
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

    const isTv = ADMIN_TV_TYPES.indexOf(item.type) !== -1;
    $("episodes-card").classList.toggle("hide", !isTv);
    $("f-runtime").readOnly = isTv;
    // Only the label's own leading text node is replaced here — using
    // textContent on the <label> itself would also delete the <input> it
    // contains, since the input is a child of the label.
    $("f-runtime-label").firstChild.textContent = isTv
      ? "Runtime (min) — auto-calculated from episodes"
      : "Runtime (min)";
    // For TV items f-is-estimate becomes a tri-state master switch over the
    // episode Est. checkboxes (see syncSeasonEstimateCheckbox/onSeasonEstimateChange)
    // rather than a plain read-only mirror, so it stays enabled/clickable here.
    $("f-is-estimate").disabled = false;

    if (isTv) loadEpisodesForEditor(item.id);
    else $("f-is-estimate").indeterminate = false;
  }

  /**
   * Recomputes f-is-estimate's tri-state (checked/indeterminate/unchecked)
   * from the current episode Est. checkboxes — mirrors syncFranchiseParentCheckbox
   * in dashboard.js for the franchise picker's parent/child checkboxes.
   */
  function syncSeasonEstimateCheckbox() {
    const boxes = [...$("episode-rows").querySelectorAll(".ep-estimate")];
    if (!boxes.length) {
      $("f-is-estimate").checked = false;
      $("f-is-estimate").indeterminate = false;
      return;
    }
    const checkedCount = boxes.filter((cb) => cb.checked).length;
    $("f-is-estimate").checked = checkedCount === boxes.length;
    $("f-is-estimate").indeterminate = checkedCount > 0 && checkedCount < boxes.length;
  }

  function onSeasonEstimateChange(ev) {
    const checkAll = ev.target.checked;
    for (const cb of $("episode-rows").querySelectorAll(".ep-estimate")) {
      cb.checked = checkAll;
    }
    updateComputedRuntime();
  }

  function openEditor(item) {
    setTab("edit");
    populateForm(item);
  }

  function episodeEditRowHtml(ep, index) {
    return (
      '<tr data-index="' +
      index +
      '"><td>' +
      (ep.episode_number === null || ep.episode_number === undefined ? "—" : ep.episode_number) +
      "</td>" +
      '<td><input type="text" class="ep-title" value="' +
      esc(ep.title || "") +
      '" style="width:100%"></td>' +
      '<td><input type="number" class="ep-runtime" value="' +
      (ep.runtime_min === null || ep.runtime_min === undefined ? "" : ep.runtime_min) +
      '" style="width:100%"></td>' +
      '<td><input type="checkbox" class="ep-estimate"' +
      (ep.is_estimate ? " checked" : "") +
      "></td>" +
      '<td><button type="button" class="episode-remove-btn" data-index="' +
      index +
      '" aria-label="Remove episode" title="Remove episode" style="background:none;border:none;cursor:pointer;font-size:14px">✕</button></td></tr>'
    );
  }

  function renderEpisodeEditRows() {
    $("episode-rows").innerHTML = state.episodes.length
      ? state.episodes.map(episodeEditRowHtml).join("")
      : '<tr><td colspan="5" class="muted" style="padding:14px;text-align:center">No episodes yet.</td></tr>';

    for (const btn of $("episode-rows").querySelectorAll(".episode-remove-btn")) {
      btn.addEventListener("click", function () {
        const idx = Number(btn.getAttribute("data-index"));
        state.episodes.splice(idx, 1);
        renderEpisodeEditRows();
        updateComputedRuntime();
      });
    }
    for (const input of $("episode-rows").querySelectorAll(".ep-runtime, .ep-estimate")) {
      input.addEventListener("input", updateComputedRuntime);
      input.addEventListener("change", updateComputedRuntime);
    }

    updateComputedRuntime();
  }

  /**
   * Recomputes runtime_min from the episode rows currently in the DOM (not
   * state.episodes, since the user may be mid-edit) and reflects it into the
   * read-only runtime field, then refreshes f-is-estimate's tri-state from
   * the same rows — only meaningful while the Episodes card is visible, i.e.
   * the selected item is a TV type.
   */
  function updateComputedRuntime() {
    if ($("episodes-card").classList.contains("hide")) return;

    let total = 0;
    for (const row of $("episode-rows").querySelectorAll("tr[data-index]")) {
      const runtimeInput = row.querySelector(".ep-runtime");
      const value = runtimeInput.value.trim();
      if (value !== "") total += Number(value) || 0;
    }

    $("f-runtime").value = total;
    syncSeasonEstimateCheckbox();
  }

  async function loadEpisodesForEditor(itemId) {
    $("episode-rows").innerHTML =
      '<tr><td colspan="5" class="muted" style="padding:14px;text-align:center">Loading…</td></tr>';
    $("episode-feedback").textContent = "";
    try {
      const res = await apiGet("/api/items/" + itemId + "/episodes");
      state.episodes = (res.data && res.data.episodes) || [];
      renderEpisodeEditRows();
    } catch (e) {
      $("episode-rows").innerHTML =
        '<tr><td colspan="5" class="muted" style="padding:14px;text-align:center">Could not load episodes.</td></tr>';
    }
  }

  function readEpisodeEditRows() {
    const rows = [...$("episode-rows").querySelectorAll("tr[data-index]")];
    return rows.map(function (row) {
      const idx = Number(row.getAttribute("data-index"));
      const titleInput = row.querySelector(".ep-title");
      const runtimeInput = row.querySelector(".ep-runtime");
      const estimateInput = row.querySelector(".ep-estimate");
      return {
        episode_number: state.episodes[idx].episode_number,
        title: titleInput.value.trim() || null,
        runtime_min: runtimeInput.value.trim() === "" ? null : Number(runtimeInput.value.trim()),
        is_estimate: estimateInput.checked,
      };
    });
  }

  function onEpisodeAdd() {
    const nextNumber = state.episodes.length
      ? Math.max.apply(
          null,
          state.episodes.map(function (ep) {
            return ep.episode_number || 0;
          })
        ) + 1
      : 1;
    state.episodes.push({ episode_number: nextNumber, title: "", runtime_min: null, is_estimate: false });
    renderEpisodeEditRows();
  }

  async function onEpisodeSave() {
    if (!state.editingId) return;
    const episodes = readEpisodeEditRows();

    for (const ep of episodes) {
      if (!Number.isInteger(ep.episode_number) || ep.episode_number < 1) {
        $("episode-feedback").textContent = "Every episode needs a valid episode number.";
        $("episode-feedback").style.color = "#ffb4b4";
        return;
      }
    }

    const feedback = $("episode-feedback");
    $("episode-save-btn").disabled = true;
    feedback.textContent = "Saving…";
    feedback.style.color = "";
    try {
      const res = await apiPutJson("/api/admin/episodes/" + state.editingId, { episodes: episodes });
      state.episodes = res.episodes;
      renderEpisodeEditRows();

      // Episodes are now the source of truth for the item's runtime/estimate
      // — updateComputedRuntime() (called by renderEpisodeEditRows) already
      // refreshed f-runtime/f-is-estimate from the saved rows, so saving the
      // item now persists exactly those computed values.
      const itemRes = await apiPut2("/api/admin/items/" + state.editingId, {
        runtime_min: $("f-runtime").value.trim() === "" ? null : Number($("f-runtime").value.trim()),
        is_estimate: $("f-is-estimate").checked,
      });
      const updated = itemRes.item;
      const idx = state.items.findIndex((i) => i.id === updated.id);
      if (idx !== -1) state.items[idx] = updated;
      renderAllRows();

      feedback.textContent = "Episodes and item runtime saved.";
      feedback.style.color = "var(--done)";
    } catch (e) {
      feedback.textContent = "Error: " + e.message;
      feedback.style.color = "#ffb4b4";
    } finally {
      $("episode-save-btn").disabled = false;
    }
  }

  async function apiPutJson(path, body) {
    const res = await fetch(path, {
      method: "PUT",
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

    // For TV items f-runtime/f-is-estimate are read-only and kept in sync
    // with the episode rows by updateComputedRuntime(), so reading them here
    // (rather than recomputing) is exactly "send the computed values".
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
      '<tr class="admin-clickable-row" data-id="' +
      item.id +
      '"><td><span class="title">' +
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
    for (const row of $("all-rows").querySelectorAll("tr.admin-clickable-row")) {
      row.addEventListener("click", function () {
        const item = state.items.find((i) => i.id === Number(row.getAttribute("data-id")));
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
    $("episode-add-btn").addEventListener("click", onEpisodeAdd);
    $("episode-save-btn").addEventListener("click", onEpisodeSave);
    $("f-is-estimate").addEventListener("change", function (ev) {
      if (!$("episodes-card").classList.contains("hide")) onSeasonEstimateChange(ev);
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
