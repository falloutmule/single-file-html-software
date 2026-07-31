from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)
assertions = []
console = []
errors = []
requests = []


def record(name, ok, detail=""):
    assertions.append({"name": name, "ok": bool(ok), "detail": detail})
    if not ok:
        raise AssertionError(f"{name}: {detail}")


def tap_action(page, name, count=1):
    control = page.locator(f'[data-action="{name}"]')
    for _ in range(count):
        control.tap()
        page.wait_for_timeout(70)


def wait_piece(page, piece_id):
    page.wait_for_function(
        "piece => window.__SKYLINE_DROP__?.state()?.currentPieceId === piece",
        arg=piece_id,
    )


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
    page.on("console", lambda msg: console.append({"type": msg.type, "text": msg.text}))
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("request", lambda request: requests.append(request.url))
    page.set_content(html, wait_until="load")
    page.locator("#start-button").tap()
    page.wait_for_selector("#pixi-host canvas", state="visible", timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(350)

    # Row Homes: rotation 0, anchor (2,2).
    tap_action(page, "move-up", 3)
    tap_action(page, "drop")
    wait_piece(page, "main-street")

    # Main Street: rotation 1, anchor (5,2).
    tap_action(page, "rotate-right")
    tap_action(page, "move-right", 3)
    tap_action(page, "move-up", 4)
    tap_action(page, "drop")
    wait_piece(page, "mixed-corner")

    # Mixed Corner: rotation 0, anchor (2,4).
    tap_action(page, "move-left")
    tap_action(page, "move-up")
    tap_action(page, "drop")
    wait_piece(page, "service-bore")

    # Service Bore: vertical at (3,2), crossing three existing utility cells.
    tap_action(page, "rotate-right")
    tap_action(page, "move-right")
    tap_action(page, "move-up", 4)
    page.wait_for_timeout(220)
    state_before = page.evaluate("window.__SKYLINE_DROP__.state()")
    previous_masks = {y: state_before["occupied"][y * 8 + 3]["conduit"] for y in (2, 3, 4)}
    record("service bore is current piece", state_before["currentPieceId"] == "service-bore", state_before["currentPieceId"])
    record("overlap footprint remains valid", not page.locator('[data-action="drop"]').is_disabled(), page.locator('[data-action="drop"]').inner_text())
    record("drop button remains available", page.locator('[data-action="drop"]').inner_text().strip() == "DROP", page.locator('[data-action="drop"]').inner_text())

    tap_action(page, "toggle-layer")
    page.wait_for_timeout(250)
    page.screenshot(path=str(EVIDENCE / "utility-overlap-preview-mobile.png"), full_page=True)

    tap_action(page, "drop")
    page.wait_for_function("window.__SKYLINE_DROP__.state().turn === 4")
    page.wait_for_timeout(250)
    state_after = page.evaluate("window.__SKYLINE_DROP__.state()")
    record("overlap drop consumes one normal turn", state_after["turn"] == 4, str(state_after["turn"]))
    record("overlap merge is reported", "overlapping utility" in state_after["statusMessage"].lower(), state_after["statusMessage"])

    def cell(x, y):
        return state_after["occupied"][y * 8 + x]

    for y in (2, 3, 4):
        merged = cell(3, y)
        record(f"crossing cell 3,{y} exists", merged is not None, str(merged))
        expected_mask = previous_masks[y] | 5
        record(f"crossing cell 3,{y} merges masks", merged["conduit"] == expected_mask, f"expected={expected_mask} actual={merged['conduit']}")
        record(f"crossing cell 3,{y} gains north-south route", (merged["conduit"] & 5) == 5, str(merged["conduit"]))
        record(f"crossing cell 3,{y} keeps surface", merged["surface"] is not None, str(merged["surface"]))

    page.screenshot(path=str(EVIDENCE / "utility-overlap-merged-mobile.png"), full_page=True)

    error_console = [entry for entry in console if entry["type"] == "error"]
    external = [url for url in requests if url.startswith("http://") or url.startswith("https://")]
    record("one visible Pixi canvas", page.locator("#pixi-host canvas").count() == 1, str(page.locator("#pixi-host canvas").count()))
    record("no page errors", len(errors) == 0, json.dumps(errors))
    record("no console errors", len(error_console) == 0, json.dumps(error_console))
    record("no external HTTP requests", len(external) == 0, json.dumps(external))

    result = {
        "schema": "skyline-drop-utility-overlap-proof@1",
        "status": "PASS",
        "scope": "overlapping underground conduit only",
        "assertions": assertions,
        "pageErrors": errors,
        "consoleErrors": error_console,
        "externalHttpRequests": external,
        "screenshots": [
            "utility-overlap-preview-mobile.png",
            "utility-overlap-merged-mobile.png",
        ],
    }
    (EVIDENCE / "utility-overlap-smoke.json").write_text(json.dumps(result, indent=2) + "\n")
    (EVIDENCE / "utility-overlap-smoke.txt").write_text(
        f"UTILITY_OVERLAP_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({"status": "PASS", "assertions": len(assertions)}, indent=2))
    context.close()
    browser.close()
