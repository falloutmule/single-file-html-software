from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)
assertions = []
console = []
errors = []
requests = []


def record(name, ok, detail=''):
    assertions.append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok:
        raise AssertionError(f'{name}: {detail}')


def tap_grid(page, x, y, world_scale=1.25, world_center_y=450):
    tile_w, tile_h = 68, 34
    board_origin_x, board_origin_y = 360, 250
    board_center_y = board_origin_y + 8 * tile_h / 2
    world_x = board_origin_x + (x - y) * tile_w / 2
    world_y = board_origin_y + (x + y) * tile_h / 2
    logical_x = board_origin_x + (world_x - board_origin_x) * world_scale
    logical_y = world_center_y + (world_y - board_center_y) * world_scale
    box = page.locator('#pixi-host canvas').bounding_box()
    assert box
    client_x = box['x'] + logical_x / 720 * box['width']
    client_y = box['y'] + logical_y / 960 * box['height']
    page.touchscreen.tap(client_x, client_y)
    page.wait_for_timeout(180)


html = (ROOT / 'dist/index.html').read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    )
    context = browser.new_context(viewport={'width':430,'height':932}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.on('console', lambda msg: console.append({'type': msg.type, 'text': msg.text}))
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('request', lambda request: requests.append(request.url))
    page.set_content(html, wait_until='load')
    page.locator('#start-button').tap()
    page.wait_for_selector('#pixi-host canvas', state='visible', timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(400)

    panel = page.locator('#information-panel')
    controls = page.locator('#touch-controls')
    record('permanent information panel is visible', panel.is_visible(), str(panel.is_visible()))
    record('panel defaults to current district', page.locator('#information-title').inner_text() == 'Row Homes', page.locator('#information-title').inner_text())
    record('panel explains current district contents', '3 homes' in page.locator('#information-summary').inner_text(), page.locator('#information-summary').inner_text())
    record('panel has no close button', page.locator('#information-panel button').count() == 0, str(page.locator('#information-panel button').count()))
    page.screenshot(path=str(EVIDENCE / 'permanent-info-panel-current-piece-mobile.png'), full_page=True)

    panel_box = panel.bounding_box()
    controls_box = controls.bounding_box()
    record('panel has measurable bounds', panel_box is not None, str(panel_box))
    record('controls have measurable bounds', controls_box is not None, str(controls_box))
    if panel_box and controls_box:
        record('panel sits above controls', panel_box['y'] + panel_box['height'] <= controls_box['y'] - 2,
               f"panel_bottom={panel_box['y'] + panel_box['height']:.1f} controls_top={controls_box['y']:.1f}")

    title_size = float(page.locator('#information-title').evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    summary_size = float(page.locator('#information-summary').evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    status_size = float(page.locator('#information-status').evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    record('information title is readable', title_size >= 18, str(title_size))
    record('information summary is readable', summary_size >= 14, str(summary_size))
    record('information status is readable', status_size >= 12, str(status_size))

    page.locator('#metrics-toggle').tap()
    page.wait_for_timeout(120)
    record('top metrics select city status', page.locator('#information-title').inner_text() == 'Current city status', page.locator('#information-title').inner_text())
    record('metric list appears in permanent panel', page.locator('#information-metrics').is_visible(), str(page.locator('#information-metrics').is_visible()))
    record('permanent panel remains visible in metric mode', panel.is_visible(), str(panel.is_visible()))
    page.screenshot(path=str(EVIDENCE / 'permanent-info-panel-metrics-mobile.png'), full_page=True)

    tap_grid(page, 0, 0)
    record('tree terrain is selectable', page.locator('#information-title').inner_text() == 'Trees', page.locator('#information-title').inner_text())
    record('tree rule is explained', 'blocks district placement' in page.locator('#information-summary').inner_text().lower(), page.locator('#information-summary').inner_text())
    page.screenshot(path=str(EVIDENCE / 'permanent-info-panel-tree-mobile.png'), full_page=True)

    tap_grid(page, 7, 0)
    record('mountain terrain is selectable', page.locator('#information-title').inner_text() == 'Mountain', page.locator('#information-title').inner_text())
    record('mountain bedrock rule is explained', 'bedrock' in page.locator('#information-status').inner_text().lower(), page.locator('#information-status').inner_text())

    tap_grid(page, 4, 4)
    page.wait_for_function("() => { const a = window.__SKYLINE_DROP__?.state()?.anchor; return a?.x === 4 && a?.y === 4; }")
    record('empty ground returns panel to current district', page.locator('#information-title').inner_text() == 'Row Homes', page.locator('#information-title').inner_text())

    page.locator('[data-action="toggle-layer"]').tap()
    page.wait_for_timeout(180)
    record('layer change keeps panel permanent', panel.is_visible(), str(panel.is_visible()))
    record('underground current-district context is named', 'UNDERGROUND' in page.locator('#information-kicker').inner_text(), page.locator('#information-kicker').inner_text())

    tap_grid(page, 3, 7)
    record('utility hub is selectable underground', page.locator('#information-title').inner_text() == 'Utility Hub', page.locator('#information-title').inner_text())
    record('utility hub purpose is explained', 'network source' in page.locator('#information-summary').inner_text().lower(), page.locator('#information-summary').inner_text())

    page.screenshot(path=str(EVIDENCE / 'permanent-info-panel-mobile.png'), full_page=True)

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-permanent-information-panel-proof@1',
        'status': 'PASS',
        'scope': 'one permanent contextual information panel only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshots': ['permanent-info-panel-current-piece-mobile.png', 'permanent-info-panel-metrics-mobile.png', 'permanent-info-panel-tree-mobile.png', 'permanent-info-panel-mobile.png'],
    }
    (EVIDENCE / 'permanent-info-panel-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'permanent-info-panel-smoke.txt').write_text(
        f"PERMANENT_INFO_PANEL_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
