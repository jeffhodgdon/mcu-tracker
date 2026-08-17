/**
 * Groups items into franchises for the Consolidated page, computed from the
 * items table alone — there is no separately seeded table, so this and
 * /api/items can never disagree about what a franchise contains.
 *
 * Base title is computed by three text rules, tried in this order (a title
 * can only match one):
 *   1. "Title (Season N)"      -> "Title"   every TV/Animated season
 *   2. "Title: Subtitle"       -> "Title"   colon-subtitled sequels
 *                                            ("Thor: Ragnarok" -> "Thor")
 *   3. "Title N" (single digit 2-9, no colon) -> "Title"   numbered sequels
 *                                            ("Iron Man 2" -> "Iron Man")
 * Colon is checked before the trailing-digit rule, or a title like "Team
 * Thor: Part 2" would have its digit stripped first and be left with a
 * dangling "Team Thor: Part" instead of resolving to "Team Thor". The digit
 * pattern is deliberately narrow (one digit, 2-9) so "Item 47" is not
 * mistaken for a sequel and truncated to "Item".
 *
 * A second pass then tries to shorten each base further by matching it
 * against the catalogue's OTHER real titles: if some other item's raw title
 * is a strict, word-boundary prefix of this base (ignoring a leading "The "
 * on either side), the base collapses to that shorter title. This is what
 * recovers "Ant-Man and the Wasp" -> "Ant-Man", "Doctor Strange in the
 * Multiverse of Madness" -> "Doctor Strange", and "Guardians of the Galaxy
 * Vol. 2" -> "Guardians of the Galaxy" — without a hardcoded alias table,
 * because the anchor in each case is itself a real title already in items.
 *
 * Guard against false merges: several catalogue entries are placeholders that
 * share an identical literal title ("Untitled Marvel Film" appears 6 times)
 * despite being unrelated future films with different dates. No rule above
 * fires for them, so after both passes their base is still just the raw
 * title — and grouping by that alone would wrongly fold six unrelated films
 * into one "franchise". Whenever an item's final base equals its own raw
 * title (nothing shortened it) AND more than one item shares that raw title,
 * each such item is kept as its own singleton group instead, disambiguated by
 * release date.
 *
 * Known divergence from the original Consolidated tab: a few of its
 * groupings reflect curated judgement no title-text rule can recover —
 * Marvel One-Shots bundles five differently-titled shorts, "Team Thor" also
 * absorbs "Team Darryl", and "Captain Marvel" absorbs "The Marvels". Fully
 * matching those would need a hand-authored mapping — a second source of
 * truth this page was explicitly asked not to have. See the Phase 3 report
 * for the measured mismatch count against consolidated.csv.
 */

function stripLeadingThe(s) {
  return s.replace(/^The\s+/i, "");
}

function preliminaryBase(title) {
  const season = /^(.*) \(Season \d+\)$/.exec(title);
  if (season) return season[1].trim();

  const colon = title.indexOf(":");
  if (colon !== -1) return title.slice(0, colon).trim();

  const numbered = /^(.*\S) ([2-9])$/.exec(title);
  if (numbered) return numbered[1].trim();

  return title;
}

/**
 * If `base` strictly extends some other real title in the catalogue at a
 * word boundary, collapse to that shorter title. Runs to a fixed point (in
 * practice one step) so a chain like colon-stripped "Ant-Man and the Wasp"
 * can still collapse further to "Ant-Man".
 */
function collapseToShortestRoot(base, allTitles) {
  let current = base;
  for (let i = 0; i < 5; i++) {
    const normalizedCurrent = stripLeadingThe(current).toLowerCase();
    let shortest = null;

    for (const candidate of allTitles) {
      if (candidate === current) continue;
      const normalizedCandidate = stripLeadingThe(candidate).toLowerCase();
      if (normalizedCandidate.length >= normalizedCurrent.length) continue;
      const isPrefix =
        normalizedCurrent.startsWith(normalizedCandidate + " ") ||
        normalizedCurrent === normalizedCandidate;
      if (!isPrefix) continue;
      if (!shortest || candidate.length < shortest.length) shortest = candidate;
    }

    if (!shortest || shortest === current) break;
    current = shortest;
  }
  return current;
}

export function baseTitleOf(title, allTitles) {
  const base = preliminaryBase(title);
  return allTitles ? collapseToShortestRoot(base, allTitles) : base;
}

export function consolidateItems(items) {
  const allTitles = items.map((i) => i.title);

  const raw = items.map((item) => {
    const base = baseTitleOf(item.title, allTitles);
    return { item, base, unchanged: base === item.title };
  });

  // Titles that are byte-identical across more than one item, and for which
  // nothing shortened the base — the placeholder-collision case above.
  const titleCounts = new Map();
  for (const r of raw) {
    if (r.unchanged) titleCounts.set(r.item.title, (titleCounts.get(r.item.title) || 0) + 1);
  }

  const groups = new Map(); // key -> { displayBase, members: [] }

  for (const r of raw) {
    const isAmbiguousDuplicate = r.unchanged && titleCounts.get(r.item.title) > 1;
    const key = isAmbiguousDuplicate
      ? "raw:" + r.item.id // forces a singleton group
      : "base:" + stripLeadingThe(r.base).toLowerCase();

    if (!groups.has(key)) groups.set(key, { displayBase: r.base, members: [] });
    groups.get(key).members.push(r.item);
  }

  const out = [];
  for (const { displayBase, members } of groups.values()) {
    // Earliest entry (by release date, undated last) sets the type/phase/base
    // title shown for the group, so a franchise reads the way its debut did.
    const sorted = members.slice().sort((a, b) => {
      if (!a.release_date && !b.release_date) return a.id - b.id;
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      if (a.release_date === b.release_date) return a.id - b.id;
      return a.release_date < b.release_date ? -1 : 1;
    });
    const lead = sorted[0];

    let totalRuntime = 0;
    let unknownRuntime = 0;
    let anyEstimate = false;
    for (const m of members) {
      if (typeof m.runtime_min === "number") totalRuntime += m.runtime_min;
      else unknownRuntime++;
      if (m.is_estimate) anyEstimate = true;
    }

    out.push({
      base_title: displayBase,
      type: lead.type,
      phase: lead.phase,
      entry_count: members.length,
      first_release_date: lead.release_date,
      total_runtime_min: totalRuntime,
      unknown_runtime_count: unknownRuntime,
      any_estimate: anyEstimate,
      member_ids: sorted.map((m) => m.id),
    });
  }

  out.sort((a, b) => {
    if (!a.first_release_date && !b.first_release_date)
      return a.base_title < b.base_title ? -1 : 1;
    if (!a.first_release_date) return 1;
    if (!b.first_release_date) return -1;
    if (a.first_release_date === b.first_release_date)
      return a.base_title < b.base_title ? -1 : 1;
    return a.first_release_date < b.first_release_date ? -1 : 1;
  });

  return out;
}
