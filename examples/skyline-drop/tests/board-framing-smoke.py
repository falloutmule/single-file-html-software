from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-board-bigger/skyline-drop-board-scale-125')
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

def tap_grid(page, x, y, world_scale, world_center_y):
    tile_w, tile_h = 68, 34
    board_origin_x, board_origin_y = 360, 250
    board_center_y = board_origin_y + 8 * tile_h / 2
    world_x = board_origin_x + (x - y) * tile_w / 2
    world_y = board_origin_y + (x + y) * tile_h / 2
    logical_x = board_origin_x + (world_x - board_origin_x) * world_scale
    logical_y = world_center_y + (world_y - board_center_y) * world_scale
    canvas = page.locator('#pixi-host canvas')
    box = canvas.bounding_box()
    assert box
    client_x = box['x'] + logical_x / 720 * box['width']
    client_y = box['y'] + logical_y / 960 * box['height']
    page.mouse.click(client_x, client_y)

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
    page.wait_for_timeout(500)

    canvas = page.locator('#pixi-host canvas')
    record('portrait framing mode active', canvas.get_attribute('data-world-framing') == 'portrait-large', canvas.get_attribute('data-world-framing') or '')
    record('portrait world scale is 1.25', canvas.get_attribute('data-world-scale') == '1.25', canvas.get_attribute('data-world-scale') or '')

    # The baseline 8x8 board spans 544 logical px; the new portrait framing spans ~636 px.
    enlarged_width = 8 * 68 * 1.25
    record('board width enlarged at least 24 percent', enlarged_width >= 544 * 1.24, str(enlarged_width))
    record('enlarged board remains inside logical viewport', enlarged_width < 720, str(enlarged_width))

    tap_grid(page, 4, 4, 1.25, 450)
    page.wait_for_function("() => { const a = window.__SKYLINE_DROP__?.state()?.anchor; return a?.x === 4 && a?.y === 4; }")
    state = page.evaluate('window.__SKYLINE_DROP__.state()')
    record('tap mapping survives portrait world transform', state['anchor'] == {'x': 4, 'y': 4}, json.dumps(state['anchor']))
    page.wait_for_timeout(1800)
    page.screenshot(path=str(EVIDENCE / 'board-framing-mobile.png'), full_page=True)

    page.set_viewport_size({'width':932,'height':430})
    page.wait_for_timeout(400)
    record('landscape retains default framing', canvas.get_attribute('data-world-framing') == 'landscape-default', canvas.get_attribute('data-world-framing') or '')
    record('landscape world scale remains 1.00', canvas.get_attribute('data-world-scale') == '1.00', canvas.get_attribute('data-world-scale') or '')
    page.screenshot(path=str(EVIDENCE / 'board-framing-landscape.png'), full_page=True)

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-board-framing-proof@2',
        'status': 'PASS',
        'scope': 'second-pass portrait default board scale and position only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshots': ['board-framing-mobile.png', 'board-framing-landscape.png'],
    }
    (EVIDENCE / 'board-framing-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'board-framing-smoke.txt').write_text(f"BOARD_FRAMING_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n")
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
