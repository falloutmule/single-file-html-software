from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-building-inspection')
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)
console = []
errors = []
assertions = []

def record(name, ok, detail=''):
    assertions.append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok:
        raise AssertionError(f'{name}: {detail}')

def state(page):
    return page.evaluate('window.__SKYLINE_DROP__?.state()')

def tap_action(page, action, wait_ms=90):
    page.locator(f'[data-action="{action}"]').tap()
    page.wait_for_timeout(wait_ms)

def place(page, rotation, x, y):
    s = state(page)
    while s['rotation'] != rotation:
        tap_action(page, 'rotate-right')
        s = state(page)
    while s['anchor']['x'] < x:
        tap_action(page, 'move-right')
        s = state(page)
    while s['anchor']['x'] > x:
        tap_action(page, 'move-left')
        s = state(page)
    while s['anchor']['y'] < y:
        tap_action(page, 'move-down')
        s = state(page)
    while s['anchor']['y'] > y:
        tap_action(page, 'move-up')
        s = state(page)
    old_turn = s['turn']
    tap_action(page, 'drop', 150)
    page.wait_for_function('(turn) => window.__SKYLINE_DROP__?.state()?.turn > turn', arg=old_turn, timeout=4000)
    page.wait_for_timeout(550)

def tap_grid(page, x, y):
    box = page.locator('#pixi-host canvas').bounding_box()
    logical_x = 360 + (x - y) * 34
    logical_y = 250 + (x + y) * 17
    client_x = box['x'] + logical_x / 720 * box['width']
    client_y = box['y'] + logical_y / 960 * box['height']
    page.touchscreen.tap(client_x, client_y)
    page.wait_for_timeout(180)

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
    page.set_content((ROOT/'dist/index.html').read_text(), wait_until='load')
    page.locator('#start-button').tap()
    page.wait_for_selector('#pixi-host canvas', state='visible', timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")

    # Place the deterministic first district, then discover representative occupied cells from state.
    place(page, 2, 2, 5)
    s = state(page)
    occupied = s['occupied']
    def find_cell(predicate):
        for i, cell in enumerate(occupied):
            if cell and predicate(cell):
                return {'x': i % 8, 'y': i // 8, 'cell': cell}
        raise AssertionError('representative cell not found')

    home = find_cell(lambda c: c['surface'] == 'home')
    road = find_cell(lambda c: c['surface'] == 'road')
    conduit = find_cell(lambda c: c['conduit'] != 0)

    tap_grid(page, home['x'], home['y'])
    record('inspection panel opens for placed home', page.locator('#inspection-panel').is_visible())
    record('home is named', page.locator('#inspection-title').inner_text() in ('Home', 'Apartment'), page.locator('#inspection-title').inner_text())
    record('home contribution is explained', 'residents' in page.locator('#inspection-summary').inner_text().lower(), page.locator('#inspection-summary').inner_text())
    record('home service state is explained', any(word in page.locator('#inspection-status').inner_text().lower() for word in ('active', 'needs')), page.locator('#inspection-status').inner_text())
    page.screenshot(path=str(EVIDENCE/'building-inspection-home.png'), full_page=True)

    tap_grid(page, road['x'], road['y'])
    record('road is named', page.locator('#inspection-title').inner_text() == 'Road', page.locator('#inspection-title').inner_text())
    record('road connection is explained', 'entrance' in page.locator('#inspection-status').inner_text().lower(), page.locator('#inspection-status').inner_text())
    page.screenshot(path=str(EVIDENCE/'building-inspection-road.png'), full_page=True)

    tap_action(page, 'toggle-layer', 240)
    record('layer switch closes stale surface inspection', not page.locator('#inspection-panel').is_visible())
    tap_grid(page, conduit['x'], conduit['y'])
    record('underground conduit can be inspected', page.locator('#inspection-panel').is_visible())
    record('underground identity is named', page.locator('#inspection-title').inner_text() in ('Service Bore', 'Utility Conduit'), page.locator('#inspection-title').inner_text())
    record('conduit directions are explained', 'links' in page.locator('#inspection-summary').inner_text().lower(), page.locator('#inspection-summary').inner_text())
    record('conduit hub status is explained', 'utility hub' in page.locator('#inspection-status').inner_text().lower(), page.locator('#inspection-status').inner_text())
    page.screenshot(path=str(EVIDENCE/'building-inspection-underground.png'), full_page=True)

    page.locator('#inspection-close').tap()
    record('close button hides inspection panel', not page.locator('#inspection-panel').is_visible())

    error_console = [entry for entry in console if entry['type'] == 'error']
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    result = {
        'schema': 'skyline-drop-building-inspection-proof@1',
        'status': 'PASS',
        'viewport': {'width': 430, 'height': 932, 'mobile': True, 'touch': True},
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'screenshots': ['building-inspection-home.png','building-inspection-road.png','building-inspection-underground.png'],
    }
    (EVIDENCE/'building-inspection-smoke.json').write_text(json.dumps(result, indent=2)+'\n')
    (EVIDENCE/'building-inspection-smoke.txt').write_text(f"BUILDING_INSPECTION_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0\n")
    print(json.dumps({'status':'PASS','assertions':len(assertions),'pageErrors':errors,'consoleErrors':error_console}, indent=2))
    context.close(); browser.close()
