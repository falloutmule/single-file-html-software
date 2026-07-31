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


def tap_action(page, name, count=1):
    control = page.locator(f'[data-action="{name}"]')
    for _ in range(count):
        control.tap()
        page.wait_for_timeout(85)


html = (ROOT / "dist/index.html").read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        executable_path="/usr/bin/chromium",
        args=[
            "--no-sandbox", "--disable-dev-shm-usage", "--ignore-gpu-blocklist",
            "--enable-webgl", "--enable-unsafe-swiftshader", "--use-gl=angle",
            "--use-angle=swiftshader",
        ],
    )
    context = browser.new_context(
        viewport={"width": 430, "height": 932},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    page.on("console", lambda msg: console_entries.append({"type": msg.type, "text": msg.text}))
    page.on("pageerror", lambda err: page_errors.append(str(err)))
    page.on("request", lambda req: requests.append(req.url))
    page.set_content(html, wait_until="load")
    page.locator("#start-button").tap()
    page.wait_for_selector("#pixi-host canvas", state="visible", timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(300)

    # Place Row Homes at (2,4) with its two vertical roads at x=2, y=4..5.
    tap_action(page, "move-up")
    tap_action(page, "drop")
    page.wait_for_function("window.__SKYLINE_DROP__.state().currentPieceId === 'main-street' && window.__SKYLINE_DROP__.state().turn === 1")

    record("Main Street is now current", page.locator("#piece-name").inner_text() == "Main Street", page.locator("#piece-name").inner_text())
    record("Main Street composition is one shop and three roads", page.locator("#piece-summary").inner_text() == "1 shop · 3 roads", page.locator("#piece-summary").inner_text())
    geometry = page.evaluate("""() => {
      const piece = SkylineDrop.currentRotatedPiece(window.__SKYLINE_DROP__.state());
      return { width: piece.width, height: piece.height, surfaces: piece.cells.map((cell) => cell.surface) };
    }""")
    record("Main Street begins as straight four", geometry["width"] == 4 and geometry["height"] == 1, json.dumps(geometry))
    record("Main Street uses connected road-road-road-shop order", geometry["surfaces"] == ["road", "road", "road", "shop"], json.dumps(geometry))

    # Rotate vertical and move upward so two road cells reuse Row Homes roads.
    tap_action(page, "rotate-right")
    tap_action(page, "move-up", 3)
    page.wait_for_timeout(220)
    preview = page.evaluate("""() => {
      const state = window.__SKYLINE_DROP__.state();
      const preview = SkylineDrop.placementPreview(state);
      const overlaps = preview.cells.filter((entry) => {
        const existing = state.occupied[SkylineDrop.indexOf(entry.x, entry.y)];
        return entry.cell.surface === 'road' && existing?.surface === 'road';
      });
      return {
        valid: preview.valid,
        reason: preview.reason,
        width: preview.piece.width,
        height: preview.piece.height,
        overlaps: overlaps.map((entry) => `${entry.x},${entry.y}`),
        anchor: state.anchor,
        rotation: state.rotation
      };
    }""")
    record("vertical Main Street remains four cells long", preview["width"] == 1 and preview["height"] == 4, json.dumps(preview))
    record("road-on-road footprint is valid", preview["valid"] is True, preview["reason"])
    record("two existing road cells will be reused", preview["overlaps"] == ["2,4", "2,5"], json.dumps(preview))
    record("Drop remains enabled for a road merge", not page.locator('[data-action="drop"]').is_disabled(), page.locator('[data-action="drop"]').inner_text())
    page.screenshot(path=str(EVIDENCE / "main-street-road-merge-preview-mobile.png"), full_page=True)

    tap_action(page, "drop")
    page.wait_for_function("window.__SKYLINE_DROP__.state().turn === 2")
    page.wait_for_timeout(280)
    result = page.evaluate("""() => {
      const state = window.__SKYLINE_DROP__.state();
      const at = (x, y) => state.occupied[SkylineDrop.indexOf(x, y)];
      return {
        status: state.statusMessage,
        sharedA: at(2,4),
        sharedB: at(2,5),
        newRoad: at(2,3),
        shop: at(2,6),
        turn: state.turn
      };
    }""")
    record("road merge consumes one normal drop", result["turn"] == 2, str(result["turn"]))
    record("status reports reused shared roads", "2 shared road cells reused" in result["status"], result["status"])
    record("first shared road records both owners", len(result["sharedA"].get("roadOwners", [])) == 2, json.dumps(result["sharedA"]))
    record("second shared road records both owners", len(result["sharedB"].get("roadOwners", [])) == 2, json.dumps(result["sharedB"]))
    record("new Main Street road is placed", result["newRoad"]["surface"] == "road", json.dumps(result["newRoad"]))
    record("Main Street shop lands at the endpoint", result["shop"]["surface"] == "shop" and result["shop"]["jobs"] == 2, json.dumps(result["shop"]))
    page.screenshot(path=str(EVIDENCE / "main-street-road-merge-landed-mobile.png"), full_page=True)

    record("one visible Pixi canvas", page.locator("#pixi-host canvas").count() == 1, str(page.locator("#pixi-host canvas").count()))
    context.close()

    # Desktop smoke proves the changed piece still boots and rotates correctly.
    desktop = browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    desktop_page = desktop.new_page()
    desktop_page.on("console", lambda msg: console_entries.append({"type": msg.type, "text": msg.text}))
    desktop_page.on("pageerror", lambda err: page_errors.append(str(err)))
    desktop_page.on("request", lambda req: requests.append(req.url))
    desktop_page.set_content(html, wait_until="load")
    desktop_page.locator("#start-button").click()
    desktop_page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    record("desktop candidate starts", desktop_page.locator("#pixi-host canvas").count() == 1)
    desktop.close()

    error_console = [entry for entry in console_entries if entry["type"] == "error"]
    external = [url for url in requests if url.startswith("http://") or url.startswith("https://")]
    record("no page errors", len(page_errors) == 0, json.dumps(page_errors))
    record("no console errors", len(error_console) == 0, json.dumps(error_console))
    record("no external HTTP requests", len(external) == 0, json.dumps(external))

    proof = {
        "schema": "skyline-drop-main-street-road-merge-proof@1",
        "status": "PASS",
        "scope": "Main Street I4 redesign and road-on-road surface merging",
        "assertions": assertions,
        "pageErrors": page_errors,
        "consoleErrors": error_console,
        "externalHttpRequests": external,
        "screenshots": [
            "main-street-road-merge-preview-mobile.png",
            "main-street-road-merge-landed-mobile.png",
        ],
    }
    (EVIDENCE / "main-street-road-merge-smoke.json").write_text(json.dumps(proof, indent=2) + "\n")
    (EVIDENCE / "main-street-road-merge-smoke.txt").write_text(
        f"MAIN_STREET_ROAD_MERGE_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({"status": "PASS", "assertions": len(assertions)}, indent=2))
    browser.close()
