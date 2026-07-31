from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)
assertions = []
console_entries = []
page_errors = []
requests = []

def record(name, ok, detail=""):
    assertions.append({"name": name, "ok": bool(ok), "detail": detail})
    if not ok:
        raise AssertionError(f"{name}: {detail}")

def snapshot(page):
    return page.evaluate("""
      () => {
        const state = window.__SKYLINE_DROP__.state();
        const piece = SkylineDrop.currentRotatedPiece(state);
        return {
          id: state.currentPieceId,
          anchor: state.anchor,
          rotation: state.rotation,
          variant: state.remixVariant,
          charges: state.remixCharges,
          plan: SkylineDrop.roadRemixPlanName(SkylineDrop.pieceById(state.currentPieceId), state.remixVariant),
          cells: piece.cells.map((cell) => ({
            x: cell.x, y: cell.y, surface: cell.surface, visual: cell.visual,
            population: cell.population || 0, jobs: cell.jobs || 0
          }))
        };
      }
    """)

def footprint(data):
    return sorted(f"{cell['x']},{cell['y']}" for cell in data["cells"])

def inventory(data):
    return sorted(f"{cell['surface']}|{cell['visual']}|{cell['population']}|{cell['jobs']}" for cell in data["cells"])

def road_cells(data):
    return sorted((cell["x"], cell["y"]) for cell in data["cells"] if cell["surface"] == "road")

def connected(points):
    if len(points) <= 1:
        return True
    remaining = set(points)
    queue = [points[0]]
    while queue:
        x, y = queue.pop(0)
        if (x, y) not in remaining:
            continue
        remaining.remove((x, y))
        for nxt in ((x, y-1), (x+1, y), (x, y+1), (x-1, y)):
            if nxt in remaining:
                queue.append(nxt)
    return not remaining

html = (ROOT / "dist/index.html").read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        executable_path="/usr/bin/chromium",
        args=["--no-sandbox", "--disable-dev-shm-usage", "--ignore-gpu-blocklist", "--enable-webgl", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
    )
    context = browser.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.on("console", lambda msg: console_entries.append({"type": msg.type, "text": msg.text}))
    page.on("pageerror", lambda err: page_errors.append(str(err)))
    page.on("request", lambda req: requests.append(req.url))
    page.set_content(html, wait_until="load")
    page.locator("#start-button").tap()
    page.wait_for_selector("#pixi-host canvas", state="visible", timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(250)

    button = page.locator("#remix-button")
    before = snapshot(page)
    record("Road Remix button names the mechanic", "ROAD REMIX" in (button.text_content() or ""), button.text_content() or "")
    record("run starts with one charge", before["charges"] == 1, str(before["charges"]))
    record("Row Homes starts with Edge road", before["plan"] == "Edge road", before["plan"])
    record("Row Homes edge-road cells are connected", connected(road_cells(before)), str(road_cells(before)))
    page.screenshot(path=str(EVIDENCE / "road-remix-edge-mobile.png"), full_page=True)

    button.tap()
    page.wait_for_function("window.__SKYLINE_DROP__.state().remixCharges === 0 && window.__SKYLINE_DROP__.state().remixVariant === 1")
    page.wait_for_timeout(220)
    after = snapshot(page)
    record("Road Remix changes to Center road", after["plan"] == "Center road", after["plan"])
    record("Road Remix preserves piece ID", before["id"] == after["id"])
    record("Road Remix preserves anchor", before["anchor"] == after["anchor"])
    record("Road Remix preserves rotation", before["rotation"] == after["rotation"])
    record("Road Remix preserves footprint", footprint(before) == footprint(after), json.dumps({"before": footprint(before), "after": footprint(after)}))
    record("Road Remix preserves tile counts and outputs", inventory(before) == inventory(after), json.dumps({"before": inventory(before), "after": inventory(after)}))
    record("center-road cells remain connected", connected(road_cells(after)), str(road_cells(after)))
    record("road moved from edge to center", road_cells(before) != road_cells(after), json.dumps({"before": road_cells(before), "after": road_cells(after)}))
    record("Road Remix consumes exactly one charge", after["charges"] == 0, str(after["charges"]))
    record("information panel names Center road", "Road plan: Center road" in (page.locator("#information-hint").text_content() or ""), page.locator("#information-hint").text_content() or "")
    page.screenshot(path=str(EVIDENCE / "road-remix-center-mobile.png"), full_page=True)

    # Commit the authored center-road plan, then confirm Main Street does not offer a fake alternate.
    page.locator('[data-action="rotate-right"]').tap()
    page.locator('[data-action="rotate-right"]').tap()
    page.wait_for_function("window.__SKYLINE_DROP__.state().rotation === 2")
    record("center-road Row Homes remains placeable", page.evaluate("SkylineDrop.placementPreview(window.__SKYLINE_DROP__.state()).valid") is True)
    page.locator('[data-action="drop"]').tap()
    page.wait_for_function("window.__SKYLINE_DROP__.state().currentPieceId === 'main-street' && window.__SKYLINE_DROP__.state().turn === 1")
    page.wait_for_timeout(300)
    record("unsupported piece keeps Road Remix control visible", button.is_visible(), str(button.is_visible()))
    record("unsupported piece disables Road Remix", button.is_disabled(), str(button.is_disabled()))
    record("unsupported piece says no alternate plan", "NO ALTERNATE ROAD PLAN" in (button.text_content() or ""), button.text_content() or "")

    upgrade = page.locator('[data-upgrade="remix-permit"]')
    record("Road Crew upgrade exists", "Road Crew" in (upgrade.text_content() or ""), upgrade.text_content() or "")
    record("Road Crew explains Road Remix charge", "Road Remix charge" in (upgrade.text_content() or ""), upgrade.text_content() or "")
    record("one visible Pixi canvas", page.locator("#pixi-host canvas").count() == 1)
    context.close()

    desktop = browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    desktop_page = desktop.new_page()
    desktop_page.on("console", lambda msg: console_entries.append({"type": msg.type, "text": msg.text}))
    desktop_page.on("pageerror", lambda err: page_errors.append(str(err)))
    desktop_page.on("request", lambda req: requests.append(req.url))
    desktop_page.set_content(html, wait_until="load")
    desktop_page.locator("#start-button").click()
    desktop_page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    desktop_page.locator("#remix-button").click()
    desktop_page.wait_for_function("window.__SKYLINE_DROP__.state().remixVariant === 1")
    record("desktop Road Remix changes to Center road", desktop_page.evaluate("SkylineDrop.roadRemixPlanName(SkylineDrop.pieceById('row-homes'), window.__SKYLINE_DROP__.state().remixVariant)") == "Center road")
    desktop_page.screenshot(path=str(EVIDENCE / "road-remix-center-desktop.png"), full_page=True)
    desktop.close()

    error_console = [entry for entry in console_entries if entry["type"] == "error"]
    external = [url for url in requests if url.startswith("http://") or url.startswith("https://")]
    record("no page errors", len(page_errors) == 0, json.dumps(page_errors))
    record("no console errors", len(error_console) == 0, json.dumps(error_console))
    record("no external HTTP requests", len(external) == 0, json.dumps(external))

    result = {
        "schema": "skyline-drop-road-remix-proof@1",
        "status": "PASS",
        "scope": "authored connected Road Remix plans and explicit unsupported-piece state",
        "assertions": assertions,
        "pageErrors": page_errors,
        "consoleErrors": error_console,
        "externalHttpRequests": external,
        "screenshots": ["road-remix-edge-mobile.png", "road-remix-center-mobile.png", "road-remix-center-desktop.png"],
    }
    (EVIDENCE / "road-remix-smoke.json").write_text(json.dumps(result, indent=2) + "\n")
    (EVIDENCE / "road-remix-smoke.txt").write_text(
        f"ROAD_REMIX_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({"status": "PASS", "assertions": len(assertions)}, indent=2))
    browser.close()
