import { createSfhsPixiGameRuntime, type SfhsGameScene, type SfhsPixiGameRuntime } from "@sfhs/pixi-runtime";
import { supportsRequiredWebGl } from "@sfhs/adapter-pixi-v8";
import { BOARD_SIZE, CARDINALS, Direction, indexOf, inBounds, keyOf, LOGICAL_HEIGHT, LOGICAL_WIDTH, MAX_FRAME_DELTA_MS, SIMULATION_HZ, type ActionSnapshot, type GameState, type PresentationSnapshot, type UpgradeId, type ViewLayer } from "./types.ts";
import { LEVELS, levelAt } from "./levels.ts";
import { pieceById, pieceContentsSummary, roadRemixPlanName, roadRemixVariantCount, UPGRADE_DEFINITIONS } from "./pieces.ts";
import { createInitialState } from "./state.ts";
import { createPresentationSnapshot, stepGame } from "./simulation.ts";
import { createSemanticInput, type SemanticInput } from "./input.ts";
import { createAudioController } from "./audio.ts";
import { installDiagnostics } from "./diagnostics.ts";
import { createGamePresenter } from "./presentation.ts";

  interface DomRefs {
    readonly titleScreen: HTMLElement;
    readonly upgradeScreen: HTMLElement;
    readonly resultScreen: HTMLElement;
    readonly pauseScreen: HTMLElement;
    readonly capabilityScreen: HTMLElement;
    readonly touchControls: HTMLElement;
    readonly pauseButton: HTMLButtonElement;
    readonly fullscreenButton: HTMLButtonElement;
    readonly startButton: HTMLButtonElement;
    readonly resumeButton: HTMLButtonElement;
    readonly restartButton: HTMLButtonElement;
    readonly resultButton: HTMLButtonElement;
    readonly redrawButton: HTMLButtonElement;
    readonly remixButton: HTMLButtonElement;
    readonly upgradeCards: HTMLElement;
    readonly levelLabel: HTMLElement;
    readonly populationValue: HTMLElement;
    readonly populationTarget: HTMLElement;
    readonly jobsValue: HTMLElement;
    readonly jobsTarget: HTMLElement;
    readonly utilityValue: HTMLElement;
    readonly greeneryValue: HTMLElement;
    readonly dropsValue: HTMLElement;
    readonly dropsTarget: HTMLElement;
    readonly metricsToggle: HTMLButtonElement;
    readonly informationPanel: HTMLElement;
    readonly informationKicker: HTMLElement;
    readonly informationTitle: HTMLElement;
    readonly informationCopy: HTMLElement;
    readonly informationSummary: HTMLElement;
    readonly informationStatus: HTMLElement;
    readonly informationMetrics: HTMLElement;
    readonly informationHint: HTMLElement;
    readonly metricsPopulation: HTMLElement;
    readonly metricsJobs: HTMLElement;
    readonly metricsUtility: HTMLElement;
    readonly metricsGreenery: HTMLElement;
    readonly metricsDrops: HTMLElement;
    readonly objectiveText: HTMLElement;
    readonly pieceName: HTMLElement;
    readonly pieceSummary: HTMLElement;
    readonly placementFeedback: HTMLElement;
    readonly nextPieceNames: HTMLElement;
    readonly resultKicker: HTMLElement;
    readonly resultTitle: HTMLElement;
    readonly resultCopy: HTMLElement;
    readonly statusToast: HTMLElement;
    readonly layerToggleButton: HTMLButtonElement;
    readonly dropButton: HTMLButtonElement;
    readonly layerIndicator: HTMLElement;
  }

  function requiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing required element #${id}`);
    return element as T;
  }

  function collectDom(): DomRefs {
    return Object.freeze({
      titleScreen: requiredElement("title-screen"),
      upgradeScreen: requiredElement("upgrade-screen"),
      resultScreen: requiredElement("result-screen"),
      pauseScreen: requiredElement("pause-screen"),
      capabilityScreen: requiredElement("capability-screen"),
      touchControls: requiredElement("touch-controls"),
      pauseButton: requiredElement<HTMLButtonElement>("pause-button"),
      fullscreenButton: requiredElement<HTMLButtonElement>("fullscreen-button"),
      startButton: requiredElement<HTMLButtonElement>("start-button"),
      resumeButton: requiredElement<HTMLButtonElement>("resume-button"),
      restartButton: requiredElement<HTMLButtonElement>("restart-button"),
      resultButton: requiredElement<HTMLButtonElement>("result-button"),
      redrawButton: requiredElement<HTMLButtonElement>("redraw-button"),
      remixButton: requiredElement<HTMLButtonElement>("remix-button"),
      upgradeCards: requiredElement("upgrade-cards"),
      levelLabel: requiredElement("level-label"),
      populationValue: requiredElement("population-value"),
      populationTarget: requiredElement("population-target"),
      jobsValue: requiredElement("jobs-value"),
      jobsTarget: requiredElement("jobs-target"),
      utilityValue: requiredElement("utility-value"),
      greeneryValue: requiredElement("greenery-value"),
      dropsValue: requiredElement("drops-value"),
      dropsTarget: requiredElement("drops-target"),
      metricsToggle: requiredElement<HTMLButtonElement>("metrics-toggle"),
      informationPanel: requiredElement("information-panel"),
      informationKicker: requiredElement("information-kicker"),
      informationTitle: requiredElement("information-title"),
      informationCopy: requiredElement("information-copy"),
      informationSummary: requiredElement("information-summary"),
      informationStatus: requiredElement("information-status"),
      informationMetrics: requiredElement("information-metrics"),
      informationHint: requiredElement("information-hint"),
      metricsPopulation: requiredElement("metrics-population"),
      metricsJobs: requiredElement("metrics-jobs"),
      metricsUtility: requiredElement("metrics-utility"),
      metricsGreenery: requiredElement("metrics-greenery"),
      metricsDrops: requiredElement("metrics-drops"),
      objectiveText: requiredElement("objective-text"),
      pieceName: requiredElement("piece-name"),
      pieceSummary: requiredElement("piece-summary"),
      placementFeedback: requiredElement("placement-feedback"),
      nextPieceNames: requiredElement("next-piece-names"),
      resultKicker: requiredElement("result-kicker"),
      resultTitle: requiredElement("result-title"),
      resultCopy: requiredElement("result-copy"),
      statusToast: requiredElement("status-toast"),
      layerToggleButton: document.querySelector<HTMLButtonElement>('[data-action="toggle-layer"]') ?? (() => { throw new Error("Missing layer toggle button"); })(),
      dropButton: document.querySelector<HTMLButtonElement>('[data-action="drop"]') ?? (() => { throw new Error("Missing drop button"); })(),
      layerIndicator: requiredElement("layer-indicator")
    });
  }

  function setModalActive(element: HTMLElement, active: boolean): void {
    element.classList.toggle("active", active);
    element.setAttribute("aria-hidden", active ? "false" : "true");
  }

  function initializeUpgradeCards(dom: DomRefs, input: SemanticInput): void {
    dom.upgradeCards.replaceChildren();
    for (const upgrade of UPGRADE_DEFINITIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-option";
      button.dataset.upgrade = upgrade.id;
      const icon = document.createElement("span");
      icon.className = "upgrade-icon";
      icon.textContent = upgrade.icon;
      const name = document.createElement("strong");
      name.textContent = upgrade.name;
      const description = document.createElement("span");
      description.textContent = upgrade.description;
      button.append(icon, name, description);
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        input.enqueue({ type: "choose-upgrade", upgrade: upgrade.id });
      }, { passive: false });
      dom.upgradeCards.append(button);
    }
  }

  function concisePlacementReason(reason: string): string {
    if (reason.includes("planning boundary")) return "Outside the planning boundary";
    if (reason.includes("Trees already occupy")) return "Tree terrain blocks this footprint";
    if (reason.includes("hill blocks")) return "Mountain terrain blocks this footprint";
    if (reason.includes("Another district")) return "Overlaps a placed district";
    if (reason.includes("Bedrock blocks")) return "Bedrock blocks the underground conduit";
    if (reason.includes("underground conduit already")) return "Overlaps an existing underground conduit";
    if (reason.includes("city entrance")) return "Road entrance must remain open";
    if (reason.includes("utility hub")) return "Utility hub must remain open";
    return reason || "This district cannot be placed here";
  }

  function updateDom(dom: DomRefs, snapshot: PresentationSnapshot): void {
    const state = snapshot.state;
    const level = snapshot.level;
    dom.levelLabel.textContent = `Level ${state.levelIndex + 1} · ${level.name}`;
    dom.populationValue.textContent = String(state.metrics.population);
    dom.populationTarget.textContent = String(level.populationTarget);
    dom.jobsValue.textContent = String(state.metrics.jobs);
    dom.jobsTarget.textContent = String(level.jobsTarget);
    dom.utilityValue.textContent = `${state.metrics.utilityCoverage}%`;
    dom.greeneryValue.textContent = `${state.metrics.greeneryCoverage}%`;
    dom.dropsValue.textContent = String(state.turn);
    dom.dropsTarget.textContent = String(level.dropLimit);
    dom.metricsPopulation.textContent = `${state.metrics.population} / ${level.populationTarget}`;
    dom.metricsJobs.textContent = `${state.metrics.jobs} / ${level.jobsTarget}`;
    dom.metricsUtility.textContent = `${state.metrics.utilityCoverage}%`;
    dom.metricsGreenery.textContent = `${state.metrics.greeneryCoverage}%`;
    dom.metricsDrops.textContent = `${state.turn} / ${level.dropLimit}`;
    dom.objectiveText.textContent = level.objectiveText;
    dom.pieceName.textContent = snapshot.currentPiece.definition.name;
    dom.pieceSummary.textContent = pieceContentsSummary(snapshot.currentPiece.definition);
    const placementBlocked = state.phase === "playing" && !snapshot.preview.valid;
    const placementReason = placementBlocked ? concisePlacementReason(snapshot.preview.reason) : "";
    dom.placementFeedback.hidden = !placementBlocked;
    dom.placementFeedback.textContent = placementBlocked ? `BLOCKED · ${placementReason}` : "";
    dom.dropButton.disabled = placementBlocked || state.phase !== "playing";
    dom.dropButton.textContent = placementBlocked ? "BLOCKED" : "DROP";
    dom.dropButton.setAttribute("aria-label", placementBlocked ? `Cannot drop district: ${placementReason}` : "Drop district");
    dom.dropButton.title = placementBlocked ? placementReason : "Drop district";
    dom.dropButton.dataset.blocked = placementBlocked ? "true" : "false";
    dom.nextPieceNames.textContent = snapshot.nextNames.join(" · ");
    dom.redrawButton.hidden = !state.upgrades.includes("planning-office") || state.redrawUsedThisLevel || state.phase !== "playing";
    const basePiece = pieceById(state.currentPieceId);
    const remixable = roadRemixVariantCount(basePiece) > 1;
    const roadPlan = roadRemixPlanName(basePiece, state.remixVariant);
    dom.remixButton.hidden = state.phase !== "playing";
    dom.remixButton.disabled = !remixable || state.remixCharges <= 0;
    dom.remixButton.textContent = remixable
      ? `🛣️ ROAD REMIX · ${state.remixCharges}`
      : "NO ALTERNATE ROAD PLAN";
    dom.remixButton.setAttribute("aria-label", !remixable
      ? `No alternate road plan for ${basePiece.name}.`
      : state.remixCharges > 0
        ? `Change the connected road plan from ${roadPlan}. ${state.remixCharges} ${state.remixCharges === 1 ? "charge" : "charges"} remaining.`
        : "No Road Remix charges remain.");
    dom.remixButton.title = !remixable
      ? "No alternate road plan for this district"
      : state.remixCharges > 0
        ? `Current plan: ${roadPlan}. Change to the authored alternate road plan.`
        : "No Road Remix charges remain";
    dom.touchControls.hidden = state.phase !== "playing";
    dom.pauseButton.hidden = state.phase !== "playing" && state.phase !== "paused";
    dom.fullscreenButton.hidden = state.phase !== "playing" && state.phase !== "paused";

    const undergroundView = state.viewLayer === "underground";
    dom.layerToggleButton.textContent = undergroundView ? "SURFACE" : "UNDERGROUND";
    dom.layerToggleButton.setAttribute("aria-label", undergroundView ? "Return to surface view" : "Switch to underground utility view");
    dom.layerToggleButton.title = undergroundView ? "Return to surface view" : "Switch to underground utility view";
    dom.layerToggleButton.dataset.currentLayer = state.viewLayer;
    dom.layerIndicator.hidden = !undergroundView || state.phase !== "playing";

    setModalActive(dom.titleScreen, state.phase === "title");
    setModalActive(dom.upgradeScreen, state.phase === "upgrade");
    setModalActive(dom.pauseScreen, state.phase === "paused");
    setModalActive(dom.resultScreen, state.phase === "level-complete" || state.phase === "lost" || state.phase === "won");

    for (const button of dom.upgradeCards.querySelectorAll<HTMLButtonElement>("[data-upgrade]")) {
      const selected = state.upgrades.includes(button.dataset.upgrade as UpgradeId);
      button.disabled = selected;
      button.style.opacity = selected ? "0.42" : "1";
    }

    if (state.phase === "level-complete") {
      dom.resultKicker.textContent = "Planning report";
      dom.resultTitle.textContent = `${level.name} complete`;
      dom.resultCopy.textContent = `The town reached ${state.metrics.population} residents and ${state.metrics.jobs} jobs with ${state.metrics.utilityCoverage}% utility coverage.`;
      dom.resultButton.textContent = state.levelIndex >= LEVELS.length - 1 ? "SEE FINAL CITY" : "CHOOSE AN UPGRADE";
    } else if (state.phase === "lost") {
      dom.resultKicker.textContent = "Planning window closed";
      dom.resultTitle.textContent = "Almost a town";
      dom.resultCopy.textContent = `You used all ${level.dropLimit} drops. Adjust the road and utility routes, then try this level again.`;
      dom.resultButton.textContent = "RESTART RUN";
    } else if (state.phase === "won") {
      dom.resultKicker.textContent = "Twenty-year plan complete";
      dom.resultTitle.textContent = "A tiny city thrives";
      dom.resultCopy.textContent = "Three constrained districts now share roads, utilities, jobs, homes, and green space. The skyline is yours.";
      dom.resultButton.textContent = "NEW RUN";
    }
  }

  interface InspectionTarget {
    readonly x: number;
    readonly y: number;
    readonly layer: ViewLayer;
    readonly levelIndex: number;
  }

  interface InspectionCopy {
    readonly kicker: string;
    readonly title: string;
    readonly summary: string;
    readonly status: string;
  }

  type InformationMode = "piece" | "metrics" | "inspection";

  function hasInspectedRoadAccess(state: GameState, x: number, y: number): boolean {
    const connectedRoads = new Set(state.metrics.connectedRoadKeys);
    if (connectedRoads.has(keyOf(x, y))) return true;
    for (const step of CARDINALS) {
      if (connectedRoads.has(keyOf(x + step.dx, y + step.dy))) return true;
    }
    const building = state.occupied[indexOf(x, y)];
    if (!building) return false;
    for (let py = 0; py < BOARD_SIZE; py += 1) {
      for (let px = 0; px < BOARD_SIZE; px += 1) {
        const sibling = state.occupied[indexOf(px, py)];
        if (!sibling || sibling.surface !== "road" || !connectedRoads.has(keyOf(px, py))) continue;
        const roadOwners = sibling.roadOwners ?? Object.freeze([sibling.pieceSerial]);
        if (roadOwners.includes(building.pieceSerial)) return true;
      }
    }
    return false;
  }

  function conduitDirections(mask: number): string {
    const names: string[] = [];
    if (mask & Direction.North) names.push("north");
    if (mask & Direction.East) names.push("east");
    if (mask & Direction.South) names.push("south");
    if (mask & Direction.West) names.push("west");
    return names.length > 0 ? names.join(" · ") : "none";
  }

  function missingServiceText(roadConnected: boolean, utilityConnected: boolean): string {
    if (roadConnected && utilityConnected) return "Active · road and utility connected";
    const missing: string[] = [];
    if (!roadConnected) missing.push("connected road");
    if (!utilityConnected) missing.push("utility");
    return `Needs ${missing.join(" and ")}`;
  }

  function inspectionCopyFor(state: GameState, target: InspectionTarget): InspectionCopy | null {
    if (target.levelIndex !== state.levelIndex || target.layer !== state.viewLayer || !inBounds(target.x, target.y)) return null;
    const level = levelAt(state.levelIndex);
    const key = keyOf(target.x, target.y);
    const placed = state.occupied[indexOf(target.x, target.y)];
    const utilityConnected = state.metrics.connectedUtilityKeys.includes(key);
    const roadConnected = state.metrics.connectedRoadKeys.includes(key);

    if (target.layer === "underground") {
      if (target.x === level.hub.x && target.y === level.hub.y) {
        return Object.freeze({
          kicker: "UNDERGROUND CELL",
          title: "Utility Hub",
          summary: `Municipal network source · links ${conduitDirections(level.hubMask)}`,
          status: "Connected · every served conduit traces back here"
        });
      }
      const terrain = level.terrain[indexOf(target.x, target.y)] ?? "empty";
      if (terrain === "hill") {
        return Object.freeze({
          kicker: "UNDERGROUND TERRAIN",
          title: "Mountain Bedrock",
          summary: "Solid rock below the mountain",
          status: "Blocks underground conduit and surface construction"
        });
      }
      if (terrain === "tree" && !placed?.conduit) {
        return Object.freeze({
          kicker: "UNDERGROUND TERRAIN",
          title: "Soil Below Trees",
          summary: "The forest occupies the surface only",
          status: "Utility conduit may pass beneath this cell"
        });
      }
      const mask = placed?.conduit ?? 0;
      if (mask === 0) return null;
      const pieceName = pieceById(placed?.pieceId ?? state.currentPieceId).name;
      return Object.freeze({
        kicker: "UNDERGROUND CELL",
        title: placed?.visual === "bore" ? "Service Bore" : "Utility Conduit",
        summary: `Links ${conduitDirections(mask)} · ${pieceName}`,
        status: utilityConnected ? "Connected to the utility hub" : "Disconnected from the utility hub"
      });
    }

    if (target.x === level.entrance.x && target.y === level.entrance.y) {
      return Object.freeze({
        kicker: "SURFACE CELL",
        title: "Road Entrance",
        summary: "City road-network source",
        status: "Connected · streets must reach this cell"
      });
    }
    if (target.x === level.hub.x && target.y === level.hub.y) {
      return Object.freeze({
        kicker: "SURFACE CELL",
        title: "Utility Hub",
        summary: "Municipal service source",
        status: "Switch underground to inspect its connections"
      });
    }
    const terrain = level.terrain[indexOf(target.x, target.y)] ?? "empty";
    if (terrain === "tree") {
      return Object.freeze({
        kicker: "SURFACE TERRAIN",
        title: "Trees",
        summary: "Existing forest blocks district placement",
        status: "Utilities may pass below · nearby homes gain greenery"
      });
    }
    if (terrain === "hill") {
      return Object.freeze({
        kicker: "SURFACE TERRAIN",
        title: "Mountain",
        summary: "Rocky terrain blocks district placement",
        status: "Bedrock also blocks underground conduit"
      });
    }
    if (!placed || placed.surface === null) return null;

    const pieceName = pieceById(placed.pieceId).name;
    if (placed.surface === "home") {
      const residents = placed.population + (state.upgrades.includes("compact-housing") ? 1 : 0);
      const access = hasInspectedRoadAccess(state, target.x, target.y);
      const green = state.metrics.greenHomeKeys.includes(key);
      return Object.freeze({
        kicker: "PLACED BUILDING",
        title: placed.visual === "apartment" ? "Apartment" : "Home",
        summary: `+${residents} residents when active · ${pieceName}`,
        status: `${missingServiceText(access, utilityConnected)} · greenery ${green ? "supported" : "not supported"}`
      });
    }
    if (placed.surface === "shop") {
      const jobs = placed.jobs + (state.upgrades.includes("small-business") ? 1 : 0);
      const access = hasInspectedRoadAccess(state, target.x, target.y);
      return Object.freeze({
        kicker: "PLACED BUILDING",
        title: "Shop",
        summary: `+${jobs} jobs when active · ${pieceName}`,
        status: missingServiceText(access, utilityConnected)
      });
    }
    if (placed.surface === "road") {
      return Object.freeze({
        kicker: "SURFACE CELL",
        title: "Road",
        summary: `Street segment · ${pieceName}`,
        status: roadConnected ? "Connected to the city entrance" : "Disconnected from the city entrance"
      });
    }
    if (placed.surface === "park") {
      return Object.freeze({
        kicker: "SURFACE CELL",
        title: "Park",
        summary: `Green space for neighboring homes · ${pieceName}`,
        status: placed.conduit === 0 ? "No utility conduit below" : `Utility below: ${utilityConnected ? "connected" : "disconnected"}`
      });
    }
    return Object.freeze({
      kicker: "SURFACE CELL",
      title: "Utility Plaza",
      summary: `Civic utility junction · ${pieceName}`,
      status: placed.conduit === 0 ? "No utility conduit below" : `Utility below: ${utilityConnected ? "connected" : "disconnected"}`
    });
  }

  function updateInformationDom(
    dom: DomRefs,
    snapshot: PresentationSnapshot,
    mode: InformationMode,
    target: InspectionTarget | null
  ): InformationMode {
    const state = snapshot.state;
    dom.informationPanel.hidden = state.phase !== "playing";
    if (state.phase !== "playing") return "piece";

    if (mode === "metrics") {
      dom.informationPanel.dataset.mode = "metrics";
      dom.informationKicker.textContent = "CITY STATUS";
      dom.informationTitle.textContent = "Current city status";
      dom.informationCopy.hidden = true;
      dom.informationMetrics.hidden = false;
      dom.informationHint.textContent = "Tap a board object for details or empty ground to return to the floating district.";
      dom.metricsToggle.setAttribute("aria-label", "City status is shown in the information panel");
      dom.metricsToggle.dataset.selected = "true";
      return "metrics";
    }

    if (mode === "inspection" && target) {
      const copy = inspectionCopyFor(state, target);
      if (copy) {
        dom.informationPanel.dataset.mode = "inspection";
        dom.informationKicker.textContent = copy.kicker;
        dom.informationTitle.textContent = copy.title;
        dom.informationSummary.textContent = copy.summary;
        dom.informationStatus.textContent = copy.status;
        dom.informationCopy.hidden = false;
        dom.informationMetrics.hidden = true;
        dom.informationHint.textContent = "Tap another object to inspect it, or tap empty ground to return to the floating district.";
        dom.metricsToggle.setAttribute("aria-label", "Show city status in the information panel");
        dom.metricsToggle.dataset.selected = "false";
        return "inspection";
      }
    }

    dom.informationPanel.dataset.mode = "piece";
    const piece = snapshot.currentPiece.definition;
    const blocked = !snapshot.preview.valid;
    dom.informationKicker.textContent = state.viewLayer === "underground" ? "CURRENT DISTRICT · UNDERGROUND" : "CURRENT DISTRICT";
    dom.informationTitle.textContent = piece.name;
    dom.informationSummary.textContent = pieceContentsSummary(piece);
    dom.informationStatus.textContent = blocked
      ? `BLOCKED · ${concisePlacementReason(snapshot.preview.reason)}`
      : piece.description;
    dom.informationCopy.hidden = false;
    dom.informationMetrics.hidden = true;
    const remixable = roadRemixVariantCount(pieceById(state.currentPieceId)) > 1;
    const roadPlan = roadRemixPlanName(pieceById(state.currentPieceId), state.remixVariant);
    dom.informationHint.textContent = remixable
      ? `Road plan: ${roadPlan} · Road Remix moves the connected road section without changing the footprint · ${state.remixCharges} ${state.remixCharges === 1 ? "charge" : "charges"} remaining.`
      : "No alternate road plan for this district. Move or rotate it, or tap a board object for details.";
    dom.metricsToggle.setAttribute("aria-label", "Show city status in the information panel");
    dom.metricsToggle.dataset.selected = "false";
    return "piece";
  }

  export async function boot(): Promise<void> {
    const dom = collectDom();
    const host = requiredElement("pixi-host");
    if (!supportsRequiredWebGl(document)) {
      setModalActive(dom.capabilityScreen, true);
      setModalActive(dom.titleScreen, false);
      return;
    }
    const input = createSemanticInput(document.body);
    const audio = createAudioController();
    const presenter = await createGamePresenter();
    let runtime: SfhsPixiGameRuntime<GameState> | null = null;
    let currentState = createInitialState();
    let disposed = false;
    let toastTimer = 0;
    let lastStatusRevision = currentState.statusRevision;
    let lastPieceSerial = currentState.pieceSerial;
    let lastPhase = currentState.phase;
    let inspectionTarget: InspectionTarget | null = null;
    let informationMode: InformationMode = "piece";
    let lastViewLayer = currentState.viewLayer;
    const cleanup: Array<() => void> = [];

    const showStatus = (message: string, kind: GameState["statusKind"]): void => {
      if (!message) return;
      window.clearTimeout(toastTimer);
      dom.statusToast.textContent = message;
      dom.statusToast.className = kind === "error" ? "show error" : "show";
      toastTimer = window.setTimeout(() => { dom.statusToast.className = ""; }, 1700);
    };

    const renderDom = (state: GameState): PresentationSnapshot => {
      currentState = state;
      const snapshot = createPresentationSnapshot(state);
      updateDom(dom, snapshot);
      if (state.viewLayer !== lastViewLayer) {
        lastViewLayer = state.viewLayer;
        inspectionTarget = null;
        informationMode = "piece";
      }
      informationMode = updateInformationDom(dom, snapshot, informationMode, inspectionTarget);
      if (informationMode !== "inspection") inspectionTarget = null;
      if (state.statusRevision !== lastStatusRevision) {
        lastStatusRevision = state.statusRevision;
        showStatus(state.statusMessage, state.statusKind);
        if (state.statusKind === "error") audio.play("error");
        else if (state.statusMessage.includes("view")) audio.play("toggle");
      }
      if (state.pieceSerial !== lastPieceSerial) {
        if (state.lastPlacement?.valid) audio.play("place");
        lastPieceSerial = state.pieceSerial;
        inspectionTarget = null;
        informationMode = "piece";
      }
      if (state.phase !== lastPhase) {
        if (state.phase === "level-complete" || state.phase === "won") audio.play("win");
        lastPhase = state.phase;
      }
      return snapshot;
    };

    initializeUpgradeCards(dom, input);
    renderDom(currentState);
    const scene: SfhsGameScene<GameState, ActionSnapshot, PresentationSnapshot> = {
      mount: () => currentState,
      enter: (state) => state,
      update: (state, actions) => {
        const next = stepGame(state, actions);
        if (state.phase !== "paused" && next.phase === "paused") queueMicrotask(() => runtime?.pause());
        return next;
      },
      snapshot: renderDom,
      pause: () => undefined,
      resume: () => undefined,
      exit: () => undefined,
      resize: (_state, viewport) => presenter.resize(viewport),
      destroy: () => undefined
    };
    runtime = await createSfhsPixiGameRuntime({
      host,
      presentation: presenter.presentation,
      scene,
      actions: input,
      viewport: {
        mode: "fixed",
        logicalWidth: LOGICAL_WIDTH,
        logicalHeight: LOGICAL_HEIGHT,
        maximumDevicePixelRatio: 2,
        scalePolicy: "contain"
      },
      simulationHz: SIMULATION_HZ,
      maximumFrameDeltaMilliseconds: MAX_FRAME_DELTA_MS
    });
    installDiagnostics(() => currentState, () => host.querySelectorAll("canvas").length);

    const canvas = runtime.getPrimarySurface();
    const onCanvasPointerDown = (event: PointerEvent): void => {
      const activeRuntime = runtime;
      if (!activeRuntime || activeRuntime.getState().phase !== "playing") return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const viewport = activeRuntime.getViewport();
      const logicalX = (event.clientX - bounds.left) / bounds.width * viewport.logicalWidth;
      const logicalY = (event.clientY - bounds.top) / bounds.height * viewport.logicalHeight;
      const cell = presenter.screenToGrid(logicalX, logicalY);
      if (!cell) return;
      event.preventDefault();
      const state = activeRuntime.getState();
      const level = levelAt(state.levelIndex);
      const placed = state.occupied[indexOf(cell.x, cell.y)];
      const terrain = level.terrain[indexOf(cell.x, cell.y)] ?? "empty";
      const inspectable = state.viewLayer === "underground"
        ? (cell.x === level.hub.x && cell.y === level.hub.y) || (placed?.conduit ?? 0) !== 0 || terrain !== "empty"
        : (cell.x === level.entrance.x && cell.y === level.entrance.y) || (cell.x === level.hub.x && cell.y === level.hub.y) || terrain !== "empty" || placed?.surface !== null && placed?.surface !== undefined;
      if (inspectable) {
        inspectionTarget = Object.freeze({ x: cell.x, y: cell.y, layer: state.viewLayer, levelIndex: state.levelIndex });
        informationMode = "inspection";
      } else {
        inspectionTarget = null;
        informationMode = "piece";
        input.enqueue({ type: "select-cell", x: cell.x, y: cell.y });
      }
    };
    canvas.addEventListener("pointerdown", onCanvasPointerDown, { passive: false });
    cleanup.push(() => canvas.removeEventListener("pointerdown", onCanvasPointerDown));

    dom.startButton.addEventListener("pointerdown", async (event) => {
      event.preventDefault();
      await audio.unlock();
      runtime?.start();
      input.enqueue({ type: "start" });
      audio.play("click");
    }, { passive: false });

    const updateFullscreenButton = (): void => {
      const active = document.fullscreenElement !== null;
      dom.fullscreenButton.textContent = active ? "⛶" : "⛶";
      dom.fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
      dom.fullscreenButton.title = active ? "Exit fullscreen" : "Enter fullscreen";
      dom.fullscreenButton.dataset.active = active ? "true" : "false";
    };

    const toggleFullscreen = async (): Promise<void> => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
      } catch (error) {
        console.warn("Fullscreen request was unavailable", error);
        showStatus("Fullscreen is unavailable in this browser mode.", "error");
      } finally {
        updateFullscreenButton();
      }
    };

    dom.metricsToggle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      inspectionTarget = null;
      informationMode = "metrics";
    }, { passive: false });

    dom.fullscreenButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      void toggleFullscreen();
    }, { passive: false });
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    updateFullscreenButton();
    dom.pauseButton.addEventListener("pointerdown", (event) => { event.preventDefault(); input.enqueue({ type: "toggle-pause" }); }, { passive: false });
    dom.resumeButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      input.enqueue({ type: "toggle-pause" });
      runtime?.resume();
    }, { passive: false });
    dom.restartButton.addEventListener("pointerdown", (event) => { event.preventDefault(); input.enqueue({ type: "restart-level" }); }, { passive: false });
    dom.resultButton.addEventListener("pointerdown", (event) => { event.preventDefault(); input.enqueue({ type: "continue" }); }, { passive: false });
    dom.redrawButton.addEventListener("pointerdown", (event) => { event.preventDefault(); input.enqueue({ type: "redraw" }); }, { passive: false });

    const onVisibility = (): void => {
      input.clear();
      if (document.hidden) runtime?.pause();
      else if (runtime?.getState().phase !== "paused") runtime?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    cleanup.push(() => document.removeEventListener("visibilitychange", onVisibility));

    const dispose = (): void => {
      if (disposed) return;
      disposed = true;
      window.clearTimeout(toastTimer);
      document.removeEventListener("fullscreenchange", updateFullscreenButton);
      for (const remove of cleanup.splice(0)) remove();
      audio.dispose();
      runtime?.destroy();
      runtime = null;
    };
    window.addEventListener("pagehide", dispose, { once: true });
  }
