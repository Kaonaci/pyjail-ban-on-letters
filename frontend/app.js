(() => {
  "use strict";

  const API_BASE = "/api/v1";
  const DEBOUNCE_MS = 250;
  const MIN_PANEL_SIZE = 256;
  const OUTER_GUTTER_SIZE = 4;
  const INNER_GUTTER_SIZE = 4;

  const elements = {
    appRoot: document.querySelector("#app-root"),
    appStatus: document.querySelector("#app-status"),
    appLayout: document.querySelector("#app-layout"),
    mapperCatalog: document.querySelector("#mapper-catalog"),
    pipelineList: document.querySelector("#pipeline-list"),
    pipelineEmpty: document.querySelector("#pipeline-empty"),
    workspace: document.querySelector("#workspace"),
    inputPanel: document.querySelector("#input-panel"),
    resultPanel: document.querySelector("#result-panel"),
    sourceText: document.querySelector("#source-text"),
    resultText: document.querySelector("#result-text"),
    resultStatus: document.querySelector("#result-status"),
    clearInput: document.querySelector("#clear-input"),
  };

  const state = {
    catalog: [],
    defaults: new Map(),
    blocks: [],
    nextBlockId: 1,
    debounceTimer: null,
    pipelineRevision: 0,
    pipelineController: null,
    sortables: [],
    splitters: [],
    copyTimers: new WeakMap(),
  };

  class ApiError extends Error {
    constructor(message, status = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  const api = {
    async getMappers({ signal } = {}) {
      const payload = await request(`${API_BASE}/mappers`, { signal });
      return normalizeMappers(payload);
    },

    async getDefaultAlphabet(mapper, { signal } = {}) {
      const path = `${API_BASE}/${encodeURIComponent(mapper)}/default-alphabet`;
      const payload = await request(path, { signal });
      return extractAlphabet(payload);
    },

    async replace(mapper, text, alphabet, { signal } = {}) {
      const path = `${API_BASE}/${encodeURIComponent(mapper)}/replace`;
      // API contract adapter: the replace endpoint receives { text, alphabet }.
      const payload = await request(path, {
        method: "POST",
        body: { text, alphabet },
        signal,
      });
      return extractReplacement(payload);
    },
  };

  async function request(url, { method = "GET", body, signal } = {}) {
    const options = {
      method,
      headers: { Accept: "application/json" },
      signal,
    };

    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new ApiError(`Network request failed for ${url}: ${error.message}`);
    }

    const payload = await readResponseBody(response);
    if (!response.ok) {
      throw new ApiError(
        getApiErrorMessage(payload, response.status),
        response.status,
      );
    }

    return payload;
  }

  async function readResponseBody(response) {
    if (response.status === 204) return null;

    const raw = await response.text();
    if (raw.length === 0) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function getApiErrorMessage(payload, status) {
    if (typeof payload === "string" && payload.trim()) {
      return `API error (${status}): ${payload}`;
    }

    if (payload && typeof payload === "object") {
      const detail = payload.detail ?? payload.message ?? payload.error;
      if (typeof detail === "string" && detail.trim()) {
        return `API error (${status}): ${detail}`;
      }
      if (detail !== undefined) {
        return `API error (${status}): ${JSON.stringify(detail)}`;
      }
    }

    return `API request failed with HTTP ${status}.`;
  }

  function normalizeMappers(payload) {
    const candidates = Array.isArray(payload)
      ? payload
      : payload?.mappers ?? payload?.items ?? payload?.data;

    if (!Array.isArray(candidates)) {
      throw new ApiError("Unexpected /mappers response: expected an array of mappers.");
    }

    return candidates.map((item) => {
      if (typeof item === "string") {
        return { name: item, label: item, description: "" };
      }

      if (!item || typeof item !== "object") return null;

      const name = item.name ?? item.mapper ?? item.mapper_name ?? item.slug ?? item.key ?? item.id;
      if (typeof name !== "string" || name.length === 0) return null;

      return {
        name,
        label: String(item.shown_name ?? item.title ?? item.label ?? item.display_name ?? name),
        description: String(item.description ?? item.details ?? ""),
        metadata: item,
      };
    }).filter(Boolean);
  }

  function extractAlphabet(payload) {
    if (typeof payload === "string") return payload;

    if (payload && typeof payload === "object") {
      for (const key of ["alphabet", "default_alphabet", "defaultAlphabet", "value", "data"]) {
        if (typeof payload[key] === "string") return payload[key];
        if (payload[key] && typeof payload[key] === "object") {
          const nested = extractAlphabet(payload[key]);
          if (nested !== null) return nested;
        }
      }
    }

    throw new ApiError("Unexpected default-alphabet response: alphabet string was not found.");
  }

  function extractReplacement(payload) {
    if (typeof payload === "string") return payload;
    if (typeof payload === "number" || typeof payload === "boolean") return String(payload);

    if (payload && typeof payload === "object") {
      for (const key of [
        "result",
        "text",
        "output",
        "replaced_text",
        "transformed_text",
        "replacement",
        "value",
        "data",
      ]) {
        if (typeof payload[key] === "string") return payload[key];
        if (typeof payload[key] === "number" || typeof payload[key] === "boolean") {
          return String(payload[key]);
        }
        if (payload[key] && typeof payload[key] === "object") {
          const nested = extractReplacement(payload[key]);
          if (nested !== null) return nested;
        }
      }
    }

    throw new ApiError("Unexpected replace response: result text was not found.");
  }

  function setAppStatus(message, kind = "info") {
    elements.appStatus.textContent = message;
    elements.appStatus.dataset.state = kind;
    elements.appStatus.hidden = !message;
  }

  function setResultStatus(message, kind = "info") {
    elements.resultStatus.textContent = message;
    elements.resultStatus.dataset.state = kind;
    elements.resultStatus.hidden = !message;
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const id = state.nextBlockId++;
    return `mapper-block-${Date.now()}-${id}`;
  }

  function createBlock(mapperName) {
    return {
      id: createId(),
      mapper: mapperName,
      alphabet: "",
      defaultAlphabet: state.defaults.get(mapperName) ?? null,
      restoring: false,
      error: "",
    };
  }

  function renderCatalog() {
    elements.mapperCatalog.replaceChildren();

    if (state.catalog.length === 0) {
      const message = document.createElement("p");
      message.className = "mapper-catalog-empty";
      message.textContent = "No mappers are available.";
      elements.mapperCatalog.append(message);
      return;
    }

    for (const mapper of state.catalog) {
      const item = document.createElement("article");
      item.className = "mapper-library-item";
      item.dataset.mapper = mapper.name;

      const handle = document.createElement("span");
      handle.className = "mapper-library-item__drag-handle";
      handle.textContent = mapper.label;
      handle.title = mapper.description || mapper.name;
      handle.tabIndex = 0;
      handle.setAttribute("role", "button");
      handle.setAttribute("aria-label", `Drag ${mapper.label} into the transformation sequence`);

      const addButton = document.createElement("button");
      addButton.className = "mapper-library-item__add";
      addButton.type = "button";
      addButton.dataset.action = "add-mapper";
      addButton.dataset.mapper = mapper.name;
      addButton.textContent = "Add";
      addButton.setAttribute("aria-label", `Add ${mapper.label}`);

      item.append(handle, addButton);

      // Show only actionable failures. Successful background loading is not
      // useful information for the user and would clutter the mapper list.
      if (mapper.defaultError) {
        const error = document.createElement("p");
        error.className = "mapper-library-item__status";
        error.dataset.state = "error";
        error.textContent = mapper.defaultError;
        item.append(error);
      }
      elements.mapperCatalog.append(item);
    }
  }

  function renderBlocks() {
    elements.pipelineList.querySelectorAll(".mapper-block").forEach((node) => node.remove());
    elements.pipelineEmpty.hidden = state.blocks.length !== 0;

    state.blocks.forEach((block, index) => {
      const mapper = state.catalog.find((item) => item.name === block.mapper);
      const label = mapper?.label ?? block.mapper;
      const article = document.createElement("article");
      article.className = "mapper-block";
      article.dataset.blockId = block.id;

      const header = document.createElement("header");
      header.className = "mapper-block__header mapper-block__drag-handle";

      const indexElement = document.createElement("span");
      indexElement.className = "mapper-block__index";
      indexElement.dataset.role = "index";
      indexElement.textContent = String(index);

      const title = document.createElement("h3");
      title.className = "mapper-block__title";
      title.textContent = label;

      const removeButton = document.createElement("button");
      removeButton.className = "mapper-block__remove";
      removeButton.type = "button";
      removeButton.dataset.action = "remove-block";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${label} from the sequence`);

      header.append(indexElement, title, removeButton);

      const controls = document.createElement("div");
      controls.className = "mapper-block__controls";

      const clearButton = document.createElement("button");
      clearButton.className = "mapper-block__clear-alphabet";
      clearButton.type = "button";
      clearButton.dataset.action = "clear-alphabet";
      clearButton.textContent = "Clear alphabet";

      const restoreButton = document.createElement("button");
      restoreButton.className = "mapper-block__restore-alphabet";
      restoreButton.type = "button";
      restoreButton.dataset.action = "restore-alphabet";
      restoreButton.textContent = block.restoring ? "Loading…" : "Restore default";
      restoreButton.disabled = block.restoring;

      controls.append(clearButton, restoreButton);

      const field = document.createElement("div");
      field.className = "mapper-block__alphabet-field";

      const placeholder = document.createElement("div");
      placeholder.className = "mapper-block__placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = block.defaultAlphabet ?? "Default alphabet unavailable";
      placeholder.title = block.defaultAlphabet ?? "Default alphabet unavailable";
      placeholder.hidden = block.alphabet.length > 0;

      const textarea = document.createElement("textarea");
      textarea.className = "mapper-block__alphabet";
      textarea.dataset.role = "alphabet";
      textarea.rows = 1;
      textarea.value = block.alphabet;
      textarea.setAttribute("aria-label", `${label} alphabet`);
      textarea.spellcheck = false;
      textarea.wrap = "soft";
      resizeAlphabetField(textarea);

      field.append(placeholder, textarea);

      const error = document.createElement("p");
      error.className = "mapper-block__error";
      error.textContent = block.error;
      error.hidden = !block.error;
      error.setAttribute("role", "alert");

      article.append(header, controls, field, error);
      elements.pipelineList.append(article);
    });
  }

  function resizeAlphabetField(textarea) {
    textarea.style.height = "auto";
    textarea.style.overflowY = "hidden";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 24)}px`;
  }

  function updateBlockIndices() {
    elements.pipelineList.querySelectorAll(".mapper-block").forEach((node, index) => {
      const indexElement = node.querySelector('[data-role="index"]');
      if (indexElement) indexElement.textContent = String(index);
    });
    elements.pipelineEmpty.hidden = state.blocks.length !== 0;
  }

  function addBlock(mapperName, index = state.blocks.length) {
    const block = createBlock(mapperName);
    state.blocks.splice(index, 0, block);
    renderBlocks();
    schedulePipeline();
  }

  function syncBlockOrderFromDom() {
    const blocksById = new Map(state.blocks.map((block) => [block.id, block]));
    const orderedIds = Array.from(
      elements.pipelineList.querySelectorAll(":scope > .mapper-block"),
      (node) => node.dataset.blockId,
    );

    state.blocks = orderedIds
      .map((id) => blocksById.get(id))
      .filter(Boolean);

    updateBlockIndices();
    schedulePipeline();
  }

  async function loadCatalog() {
    setAppStatus("Loading available mappers…");

    try {
      state.catalog = await api.getMappers();
    } catch (error) {
      state.catalog = [];
      renderCatalog();
      setAppStatus(error.message, "error");
      return;
    }

    renderCatalog();

    if (state.catalog.length === 0) {
      setAppStatus("The API returned no available mappers.", "warning");
      return;
    }

    setAppStatus("");

    await Promise.all(state.catalog.map(async (mapper) => {
      try {
        const alphabet = await api.getDefaultAlphabet(mapper.name);
        state.defaults.set(mapper.name, alphabet);
        mapper.defaultError = "";

        for (const block of state.blocks) {
          if (block.mapper === mapper.name && block.defaultAlphabet === null) {
            block.defaultAlphabet = alphabet;
          }
        }
      } catch (error) {
        mapper.defaultError = `Default alphabet unavailable: ${error.message}`;
      }
    }));

    renderCatalog();
    renderBlocks();
  }

  function schedulePipeline() {
    state.pipelineRevision += 1;
    const revision = state.pipelineRevision;

    window.clearTimeout(state.debounceTimer);
    state.pipelineController?.abort();
    state.pipelineController = null;

    const source = elements.sourceText.value;
    if (source.length === 0) {
      elements.resultText.value = "";
      setResultStatus("", "idle");
      return;
    }

    if (state.blocks.length === 0) {
      elements.resultText.value = source;
      setResultStatus("");
      return;
    }

    setResultStatus("Waiting for changes…", "pending");
    state.debounceTimer = window.setTimeout(() => {
      runPipeline(revision).catch((error) => {
        if (revision !== state.pipelineRevision) return;
        setResultStatus(error.message, "error");
      });
    }, DEBOUNCE_MS);
  }

  async function runPipeline(revision) {
    if (revision !== state.pipelineRevision) return;

    const controller = new AbortController();
    state.pipelineController = controller;
    const source = elements.sourceText.value;
    const blocks = state.blocks.map((block) => ({ ...block }));
    let currentText = source;

    setResultStatus("Applying transformations…", "pending");

    try {
      for (let index = 0; index < blocks.length; index += 1) {
        if (revision !== state.pipelineRevision) return;

        const block = blocks[index];
        try {
          currentText = await api.replace(block.mapper, currentText, block.alphabet, {
            signal: controller.signal,
          });
        } catch (error) {
          if (error.name === "AbortError") throw error;
          throw new ApiError(
            `Mapper "${block.mapper}" at index ${index} failed: ${error.message}`,
            error.status ?? null,
          );
        }
      }

      if (revision !== state.pipelineRevision) return;
      elements.resultText.value = currentText;
      setResultStatus("");
    } catch (error) {
      if (error.name === "AbortError" || revision !== state.pipelineRevision) return;
      setResultStatus(error.message, "error");
    } finally {
      if (state.pipelineController === controller) {
        state.pipelineController = null;
      }
    }
  }

  async function restoreAlphabet(block, button) {
    block.restoring = true;
    block.error = "";
    button.disabled = true;
    button.textContent = "Loading…";

    try {
      const alphabet = await api.getDefaultAlphabet(block.mapper);
      const currentBlock = state.blocks.find((item) => item.id === block.id);
      if (!currentBlock) return;

      currentBlock.defaultAlphabet = alphabet;
      currentBlock.alphabet = alphabet;
      currentBlock.restoring = false;
      currentBlock.error = "";

      const card = button.closest(".mapper-block");
      const textarea = card?.querySelector('[data-role="alphabet"]');
      const placeholder = card?.querySelector(".mapper-block__placeholder");
      const error = card?.querySelector(".mapper-block__error");

      if (textarea) {
        textarea.value = alphabet;
        resizeAlphabetField(textarea);
      }
      if (placeholder) {
        placeholder.textContent = alphabet;
        placeholder.title = alphabet;
        placeholder.hidden = true;
      }
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }

      schedulePipeline();
    } catch (error) {
      const currentBlock = state.blocks.find((item) => item.id === block.id);
      if (currentBlock) {
        currentBlock.error = error.message;
        const card = button.closest(".mapper-block");
        const errorElement = card?.querySelector(".mapper-block__error");
        if (errorElement) {
          errorElement.textContent = error.message;
          errorElement.hidden = false;
        }
      }
    } finally {
      const currentBlock = state.blocks.find((item) => item.id === block.id);
      if (currentBlock) currentBlock.restoring = false;
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "Restore default";
      }
    }
  }

  async function writeTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for browsers without the Clipboard API (for example, insecure origins).
    const temporaryField = document.createElement("textarea");
    temporaryField.value = text;
    temporaryField.setAttribute("readonly", "");
    Object.assign(temporaryField.style, {
      position: "fixed",
      opacity: "0",
      pointerEvents: "none",
    });
    document.body.append(temporaryField);
    temporaryField.select();

    const copied = document.execCommand("copy");
    temporaryField.remove();
    if (!copied) throw new Error("Clipboard access is unavailable in this browser.");
  }

  async function copyText(button) {
    const sourceField = {
      input: elements.sourceText,
      result: elements.resultText,
    }[button.dataset.copyTarget];
    if (!sourceField) return;

    try {
      await writeTextToClipboard(sourceField.value);
      window.clearTimeout(state.copyTimers.get(button));
      const originalLabel = button.dataset.originalLabel ?? "Copy";
      button.dataset.originalLabel = originalLabel;
      button.textContent = "Copied";
      button.dataset.state = "success";
      const timer = window.setTimeout(() => {
        if (!button.isConnected) return;
        button.textContent = originalLabel;
        delete button.dataset.state;
        state.copyTimers.delete(button);
      }, 1400);
      state.copyTimers.set(button, timer);
    } catch (error) {
      setAppStatus(`Could not copy text: ${error.message}`, "error");
    }
  }

  function handleCopyClick(event) {
    const button = event.target.closest("button[data-copy-target]");
    if (button) copyText(button);
  }

  function handlePipelineInput(event) {
    const textarea = event.target.closest('[data-role="alphabet"]');
    if (!textarea) return;

    const blockElement = textarea.closest(".mapper-block");
    const block = state.blocks.find((item) => item.id === blockElement?.dataset.blockId);
    if (!block) return;

    block.alphabet = textarea.value;
    const placeholder = blockElement.querySelector(".mapper-block__placeholder");
    if (placeholder) placeholder.hidden = textarea.value.length > 0;
    resizeAlphabetField(textarea);
    schedulePipeline();
  }

  function handlePipelineClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const blockElement = button.closest(".mapper-block");
    const block = state.blocks.find((item) => item.id === blockElement?.dataset.blockId);
    if (!block) return;

    switch (button.dataset.action) {
      case "clear-alphabet": {
        block.alphabet = "";
        const textarea = blockElement.querySelector('[data-role="alphabet"]');
        const placeholder = blockElement.querySelector(".mapper-block__placeholder");
        textarea.value = "";
        if (placeholder) placeholder.hidden = false;
        resizeAlphabetField(textarea);
        block.error = "";
        const error = blockElement.querySelector(".mapper-block__error");
        if (error) {
          error.textContent = "";
          error.hidden = true;
        }
        schedulePipeline();
        break;
      }
      case "restore-alphabet":
        if (!block.restoring) restoreAlphabet(block, button);
        break;
      case "remove-block":
        state.blocks = state.blocks.filter((item) => item.id !== block.id);
        renderBlocks();
        schedulePipeline();
        break;
      default:
        break;
    }
  }

  function handleCatalogClick(event) {
    const button = event.target.closest('button[data-action="add-mapper"]');
    if (!button) return;
    addBlock(button.dataset.mapper);
  }

  function handleCatalogKeydown(event) {
    const handle = event.target.closest(".mapper-library-item__drag-handle");
    if (!handle || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    const mapperItem = handle.closest(".mapper-library-item");
    if (mapperItem) addBlock(mapperItem.dataset.mapper);
  }

  function initializeSortable() {
    if (typeof window.Sortable !== "function") return false;

    state.sortables.push(new window.Sortable(elements.mapperCatalog, {
      group: {
        name: "mapper-blocks",
        pull: "clone",
        put(_to, _from, draggedElement) {
          return draggedElement.classList.contains("mapper-block");
        },
      },
      sort: false,
      draggable: ".mapper-library-item",
      handle: ".mapper-library-item__drag-handle",
      animation: 150,
      fallbackOnBody: true,
      onClone(event) {
        event.clone.removeAttribute("id");
      },
      onAdd(event) {
        // A block dropped back into the catalogue is removed from the pipeline.
        const blockId = event.item.dataset.blockId;
        event.item.remove();
        if (!blockId) return;

        const previousCount = state.blocks.length;
        state.blocks = state.blocks.filter((block) => block.id !== blockId);
        if (state.blocks.length !== previousCount) {
          renderBlocks();
          schedulePipeline();
        }
      },
    }));

    state.sortables.push(new window.Sortable(elements.pipelineList, {
      group: {
        name: "mapper-blocks",
        pull: true,
        put: true,
      },
      draggable: ".mapper-block, .mapper-library-item",
      handle: ".mapper-block__drag-handle, .mapper-library-item__drag-handle",
      filter: "button, textarea",
      preventOnFilter: false,
      animation: 150,
      fallbackOnBody: true,
      onAdd(event) {
        const mapperName = event.item.dataset.mapper;
        if (!mapperName) {
          event.item.remove();
          return;
        }

        const newIndex = event.newDraggableIndex ?? event.newIndex ?? state.blocks.length;
        event.item.remove();
        state.blocks.splice(newIndex, 0, createBlock(mapperName));
        renderBlocks();
        schedulePipeline();
      },
      onUpdate: syncBlockOrderFromDom,
    }));

    return true;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function calculateOuterSizes() {
    const measuredWidth = elements.appLayout.getBoundingClientRect().width || window.innerWidth;
    const usableWidth = Math.max(3 * MIN_PANEL_SIZE, measuredWidth - 2 * OUTER_GUTTER_SIZE);

    let left = clamp(usableWidth * 0.22, MIN_PANEL_SIZE, 320);
    let center = clamp(usableWidth * 0.34, MIN_PANEL_SIZE, 420);
    let right = usableWidth - left - center;

    if (right < MIN_PANEL_SIZE) {
      let deficit = MIN_PANEL_SIZE - right;
      const leftReduction = Math.min(deficit, left - MIN_PANEL_SIZE);
      left -= leftReduction;
      deficit -= leftReduction;
      const centerReduction = Math.min(deficit, center - MIN_PANEL_SIZE);
      center -= centerReduction;
      right = usableWidth - left - center;
    }

    const total = left + center + right;
    return [left, center, right].map((size) => (size / total) * 100);
  }

  function calculateInnerSizes() {
    const measuredHeight = elements.workspace.getBoundingClientRect().height || window.innerHeight;
    const usableHeight = Math.max(2 * MIN_PANEL_SIZE, measuredHeight - INNER_GUTTER_SIZE);
    const inputHeight = clamp(usableHeight * 0.5, MIN_PANEL_SIZE, usableHeight - MIN_PANEL_SIZE);
    return [inputHeight / usableHeight * 100, (usableHeight - inputHeight) / usableHeight * 100];
  }

  function initializeSplitters() {
    if (typeof window.Split !== "function") return false;

    // These are structural layout properties required by Split.js, not visual styling.
    Object.assign(document.documentElement.style, { height: "100%" });
    Object.assign(document.body.style, { height: "100%", margin: "0" });
    Object.assign(elements.appRoot.style, {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      minHeight: "0",
    });
    Object.assign(elements.appLayout.style, {
      display: "flex",
      flexDirection: "row",
      flex: "1 1 auto",
      minWidth: `${3 * MIN_PANEL_SIZE + 2 * OUTER_GUTTER_SIZE}px`,
      minHeight: "0",
      overflow: "hidden",
    });

    for (const panel of [
      document.querySelector("#mapper-library"),
      document.querySelector("#mapper-sequence"),
      elements.workspace,
    ]) {
      Object.assign(panel.style, {
        boxSizing: "border-box",
        minWidth: `${MIN_PANEL_SIZE}px`,
        minHeight: "0",
        flex: "0 0 auto",
      });
    }

    const libraryPanel = document.querySelector("#mapper-library");
    const sequencePanel = document.querySelector("#mapper-sequence");
    for (const panel of [libraryPanel, sequencePanel]) {
      Object.assign(panel.style, {
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: "0",
      });
    }
    Object.assign(elements.mapperCatalog.style, {
      flex: "1 1 auto",
      overflowY: "auto",
      minHeight: "0",
    });
    Object.assign(elements.pipelineList.style, {
      display: "flex",
      flex: "1 1 auto",
      flexDirection: "column",
      alignItems: "stretch",
      overflowY: "auto",
      minHeight: "0",
    });
    Object.assign(elements.workspace.style, {
      display: "flex",
      flexDirection: "column",
      minHeight: `${2 * MIN_PANEL_SIZE + INNER_GUTTER_SIZE}px`,
      overflow: "hidden",
    });

    for (const panel of [elements.inputPanel, elements.resultPanel]) {
      Object.assign(panel.style, {
        display: "flex",
        flexDirection: "column",
        minHeight: `${MIN_PANEL_SIZE}px`,
        overflow: "auto",
        flex: "0 0 auto",
      });
    }

    for (const textarea of [elements.sourceText, elements.resultText]) {
      Object.assign(textarea.style, {
        display: "block",
        boxSizing: "border-box",
        width: "100%",
        minHeight: "0",
        flex: "1 1 auto",
      });
    }

    const outer = window.Split(
      ["#mapper-library", "#mapper-sequence", "#workspace"],
      {
        sizes: calculateOuterSizes(),
        minSize: MIN_PANEL_SIZE,
        gutterSize: OUTER_GUTTER_SIZE,
        direction: "horizontal",
        cursor: "col-resize",
        gutter: createGutter,
      },
    );

    const inner = window.Split(
      ["#input-panel", "#result-panel"],
      {
        sizes: calculateInnerSizes(),
        minSize: MIN_PANEL_SIZE,
        gutterSize: INNER_GUTTER_SIZE,
        direction: "vertical",
        cursor: "row-resize",
        gutter: createGutter,
      },
    );

    state.splitters.push(outer, inner);
    return true;
  }

  function createGutter(_index, direction) {
    const gutter = document.createElement("div");
    gutter.className = `gutter gutter-${direction}`;
    gutter.setAttribute("role", "separator");
    gutter.setAttribute("aria-orientation", direction === "horizontal" ? "vertical" : "horizontal");
    gutter.tabIndex = 0;
    return gutter;
  }

  function initializeEvents() {
    elements.mapperCatalog.addEventListener("click", handleCatalogClick);
    elements.mapperCatalog.addEventListener("keydown", handleCatalogKeydown);
    elements.pipelineList.addEventListener("input", handlePipelineInput);
    elements.pipelineList.addEventListener("click", handlePipelineClick);
    elements.sourceText.addEventListener("input", schedulePipeline);
    elements.appLayout.addEventListener("click", handleCopyClick);
    elements.clearInput.addEventListener("click", () => {
      elements.sourceText.value = "";
      elements.sourceText.focus();
      schedulePipeline();
    });

    window.addEventListener("beforeunload", () => {
      window.clearTimeout(state.debounceTimer);
      state.pipelineController?.abort();
      state.sortables.forEach((sortable) => sortable.destroy());
      state.splitters.forEach((splitter) => splitter.destroy());
    }, { once: true });
  }

  async function initialize() {
    initializeEvents();
    const sortableReady = initializeSortable();
    const splittersReady = initializeSplitters();
    await loadCatalog();

    const unavailable = [];
    if (!sortableReady) unavailable.push("drag-and-drop");
    if (!splittersReady) unavailable.push("panel resizing");
    if (unavailable.length > 0) {
      setAppStatus(
        `Could not load ${unavailable.join(" and ")} libraries. Check the CDN connection.`,
        "error",
      );
    }
  }

  initialize().catch((error) => {
    setAppStatus(`Application initialization failed: ${error.message}`, "error");
  });
})();
