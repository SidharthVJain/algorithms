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

function displaySetName(kind) {
  return { oll: "OLL", pll: "PLL", f2l: "F2L" }[kind];
}

function buildPrintSheet() {
  const printView = document.getElementById("print-view");
  printView.replaceChildren();

  const title = document.createElement("h1");
  title.textContent = `${displaySetName(state.set)} Algorithms`;
  printView.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.className = "print-subtitle";
  subtitle.textContent = "Personal formula sheet";
  printView.appendChild(subtitle);

  let exported = 0;
  const appendCase = (sectionTitle, item, extraLabel = "") => {
    if (!caseStarted(item)) return;
    if (state.search && !matches(item, [sectionTitle, extraLabel, item.title, item.probability || ""].join(" "))) return;
    if (state.filter === "empty") return;

    const card = document.createElement("article");
    card.className = "print-case";

    const visual = document.createElement("div");
    visual.className = "print-visual";
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = "";
    visual.appendChild(img);

    const body = document.createElement("div");
    body.className = "print-case-body";

    const meta = document.createElement("div");
    meta.className = "print-case-meta";
    const caseTitle = document.createElement("h2");
    caseTitle.textContent = item.title;
    meta.appendChild(caseTitle);

    if (extraLabel) {
      const slot = document.createElement("span");
      slot.className = "print-tag";
      slot.textContent = extraLabel;
      meta.appendChild(slot);
    }
    if (item.probability) {
      const probability = document.createElement("span");
      probability.className = "print-probability";
      probability.textContent = `Probability ${item.probability}`;
      meta.appendChild(probability);
    }

    const algorithms = document.createElement("div");
    algorithms.className = "print-algorithms";
    labels.forEach((label, slotIndex) => {
      const value = getValue(item.id, slotIndex).trim();
      if (!value) return;
      const row = document.createElement("div");
      row.className = "print-alg-row";
      const labelNode = document.createElement("span");
      labelNode.className = "print-alg-label";
      labelNode.textContent = label;
      const formula = document.createElement("span");
      formula.className = "print-formula";
      formula.textContent = value;
      row.append(labelNode, formula);
      algorithms.appendChild(row);
    });

    body.append(meta, algorithms);
    card.append(visual, body);
    return card;
  };

  if (state.set === "f2l") {
    window.CUBE_DATA.f2l.forEach((slotData) => {
      slotData.groups.forEach((group) => {
        const sectionCases = [];
        group.cases.forEach((item) => {
          const card = appendCase(group.title, item, slotData.slot);
          if (card) sectionCases.push(card);
        });
        if (!sectionCases.length) return;
        const section = document.createElement("section");
        section.className = "print-section";
        const heading = document.createElement("div");
        heading.className = "print-section-head";
        const h3 = document.createElement("h3");
        h3.textContent = group.title;
        const tag = document.createElement("span");
        tag.className = "print-tag";
        tag.textContent = slotData.slot;
        heading.append(h3, tag);
        const grid = document.createElement("div");
        grid.className = "print-grid";
        sectionCases.forEach((card) => grid.appendChild(card));
        section.append(heading, grid);
        printView.appendChild(section);
        exported += sectionCases.length;
      });
    });
  } else {
    window.CUBE_DATA[state.set].forEach((sectionData) => {
      const sectionCases = [];
      sectionData.cases.forEach((item) => {
        const card = appendCase(sectionData.title, item);
        if (card) sectionCases.push(card);
      });
      if (!sectionCases.length) return;
      const section = document.createElement("section");
      section.className = "print-section";
      const heading = document.createElement("div");
      heading.className = "print-section-head";
      const h3 = document.createElement("h3");
      h3.textContent = sectionData.title;
      heading.appendChild(h3);
      const grid = document.createElement("div");
      grid.className = "print-grid";
      sectionCases.forEach((card) => grid.appendChild(card));
      section.append(heading, grid);
      printView.appendChild(section);
      exported += sectionCases.length;
    });
  }

  if (!exported) {
    const empty = document.createElement("div");
    empty.className = "print-empty";
    empty.textContent = "No saved algorithms match the current view.";
    printView.appendChild(empty);
  }

  const footer = document.createElement("p");
  footer.className = "print-footer";
  footer.textContent = `Exported from Cube Algorithms • ${exported} case${exported === 1 ? "" : "s"}`;
  printView.appendChild(footer);
}

function exportPdf() {
  buildPrintSheet();
  const previousTitle = document.title;
  document.title = `${displaySetName(state.set)} Algorithms — Cube Algorithms`;
  const cleanup = () => {
    document.title = previousTitle;
    document.getElementById("print-view").replaceChildren();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

function wireControls() {
  document.getElementById("export-pdf").addEventListener("click", exportPdf);

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
