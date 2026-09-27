const STORAGE_KEY = "cube-algorithms-v1";
const state = {
  set: "oll",
  filter: "all",
  search: "",
  formulas: loadFormulas(),
};

const refs = {
  content: document.getElementById("content"),
  emptyState: document.getElementById("empty-state"),
  intro: document.getElementById("set-intro"),
  search: document.getElementById("search"),
  searchWrap: document.querySelector(".search-wrap"),
  searchClear: document.getElementById("search-clear"),
  saveStatus: document.getElementById("save-status"),
};

const descriptions = {
  oll: "Orientation of the Last Layer — case names and probabilities follow the supplied OLL reference.",
  pll: "Permutation of the Last Layer — case names and probabilities follow the supplied PLL reference.",
  f2l: "First Two Layers — organized by slot position and source-PDF section; the source does not list probabilities for these entries.",
};

const labels = ["Recommended", "Alternate 1", "Alternate 2"];

function loadFormulas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFormulas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.formulas));
  refs.saveStatus.textContent = "Saved locally";
}

function markSaving() {
  refs.saveStatus.textContent = "Saving…";
}

function getValue(id, slot) {
  return state.formulas[id]?.[slot] || "";
}

function setValue(id, slot, value) {
  if (!state.formulas[id]) state.formulas[id] = {};
  state.formulas[id][slot] = value;
  markSaving();
  window.clearTimeout(setValue.timer);
  setValue.timer = window.setTimeout(saveFormulas, 180);
}

function caseStarted(caseItem) {
  return labels.some((_, i) => getValue(caseItem.id, i).trim().length > 0);
}

function matches(caseItem, contextText) {
  const needle = state.search.trim().toLowerCase();
  const searchMatch = !needle || contextText.toLowerCase().includes(needle);
  if (!searchMatch) return false;
  if (state.filter === "empty") return !caseStarted(caseItem);
  if (state.filter === "started") return caseStarted(caseItem);
  return true;
}

function createInput(caseItem, slot) {
  const input = document.createElement("input");
  input.className = "alg-input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = slot === 0 ? "Enter recommended algorithm…" : `Enter alternate ${slot}…`;
  input.value = getValue(caseItem.id, slot);
  input.setAttribute("aria-label", `${caseItem.title} — ${labels[slot]}`);
  input.addEventListener("input", (event) => setValue(caseItem.id, slot, event.target.value));
  return input;
}

function renderCase(caseItem, extra = {}) {
  const card = document.createElement("article");
  card.className = `case-card${state.set === "f2l" ? " f2l" : ""}`;

  const visual = document.createElement("div");
  visual.className = "case-visual";
  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = caseItem.image;
  img.alt = `${caseItem.title} diagram`;
  visual.appendChild(img);

  const main = document.createElement("div");
  main.className = "case-main";

  const meta = document.createElement("div");
  meta.className = "case-meta";
  const title = document.createElement("h3");
  title.className = "case-title";
  title.textContent = caseItem.title;
  meta.appendChild(title);

  if (caseItem.variantTotal) {
    const variant = document.createElement("span");
    variant.className = "variant";
    variant.textContent = `${caseItem.variant}/${caseItem.variantTotal}`;
    meta.appendChild(variant);
  }

  if (caseItem.y2Equivalent) {
    const y2 = document.createElement("span");
    y2.className = "slot-tag";
    y2.textContent = "y2 equivalent";
    meta.appendChild(y2);
  }

  if (caseItem.probability) {
    const p = document.createElement("span");
    p.className = "probability";
    p.textContent = `Probability ${caseItem.probability}`;
    meta.appendChild(p);
  }

  const stack = document.createElement("div");
  stack.className = "alg-stack";
  labels.forEach((label, slot) => {
    const row = document.createElement("label");
    row.className = "alg-row";
    const labelText = document.createElement("span");
    labelText.className = "alg-label";
    labelText.textContent = label;
    row.appendChild(labelText);
    row.appendChild(createInput(caseItem, slot));
    stack.appendChild(row);
  });

  main.append(meta, stack);
  card.append(visual, main);
  return card;
}

function renderSection(titleText, cases, opts = {}) {
  const visible = cases.filter((item) => {
    const extra = [titleText, opts.slot || "", item.title, item.probability || ""].join(" ");
    return matches(item, extra);
  });
  if (!visible.length) return null;

  const section = document.createElement("section");
  section.className = "section";
  const head = document.createElement("div");
  head.className = "section-head";
  const h2 = document.createElement("h2");
  h2.textContent = titleText;
  head.appendChild(h2);

  const count = document.createElement("span");
  count.className = "count-tag";
  count.textContent = `${visible.length} shown`;
  head.appendChild(count);

  const grid = document.createElement("div");
  grid.className = "case-grid";
  visible.forEach((item) => grid.appendChild(renderCase(item)));
  section.append(head, grid);
  return section;
}

function renderOllPll(kind) {
  const sections = window.CUBE_DATA[kind];
  const fragment = document.createDocumentFragment();
  let visibleTotal = 0;
  sections.forEach((sectionData) => {
    const section = renderSection(sectionData.title, sectionData.cases);
    if (section) {
      visibleTotal += section.querySelectorAll(".case-card").length;
      fragment.appendChild(section);
    }
  });
  refs.content.className = "content";
  refs.content.appendChild(fragment);
  return visibleTotal;
}

function renderF2l() {
  let visibleTotal = 0;
  window.CUBE_DATA.f2l.forEach((slotData) => {
    slotData.groups.forEach((group) => {
      const section = renderSection(group.title, group.cases, { slot: slotData.slot });
      if (!section) return;
      visibleTotal += section.querySelectorAll(".case-card").length;
      section.querySelector(".section-head").prepend(Object.assign(document.createElement("span"), { className: "slot-tag", textContent: slotData.slot }));
      refs.content.appendChild(section);
    });
  });
  return visibleTotal;
}

function updateIntro() {
  const names = { oll: "OLL", pll: "PLL", f2l: "F2L" };
  refs.intro.innerHTML = `<div class="set-title">${names[state.set]}</div><div class="set-description">${descriptions[state.set]}</div>`;
}

function updateSearchClear() {
  const has = refs.search.value.length > 0;
  refs.searchWrap.classList.toggle("has-value", has);
}

function render() {
  refs.content.replaceChildren();
  updateIntro();
  updateSearchClear();
  const shown = state.set === "f2l" ? renderF2l() : renderOllPll(state.set);
  refs.emptyState.hidden = shown !== 0;
  document.querySelectorAll(".tab").forEach((button) => {
    const active = button.dataset.set === state.set;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("active", button.dataset.filter === state.filter));
}

function wireControls() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.set = button.dataset.set;
      state.search = "";
      refs.search.value = "";
      state.filter = "all";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  refs.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  refs.searchClear.addEventListener("click", () => {
    refs.search.value = "";
    state.search = "";
    render();
    refs.search.focus();
  });

  document.getElementById("clear-all").addEventListener("click", () => {
    const ok = window.confirm("Clear all saved algorithms from this browser?");
    if (!ok) return;
    state.formulas = {};
    saveFormulas();
    render();
  });
}

function updateStats() {
  const countCases = (kind) => {
    if (kind !== "f2l") return window.CUBE_DATA[kind].reduce((sum, s) => sum + s.cases.length, 0);
    return window.CUBE_DATA.f2l.reduce((sum, slot) => sum + slot.groups.reduce((n,g) => n + g.cases.length, 0), 0);
  };
  document.getElementById("stat-oll").textContent = countCases("oll");
  document.getElementById("stat-pll").textContent = countCases("pll");
  document.getElementById("stat-f2l").textContent = countCases("f2l");
}

wireControls();
updateStats();
render();
