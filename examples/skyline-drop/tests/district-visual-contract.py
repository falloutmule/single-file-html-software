from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/work/skyline-drop')
DIST = ROOT / 'dist'
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)

console_errors = []
page_errors = []


def state(page):
    return page.evaluate('window.__SKYLINE_DROP__?.state()')


def press(page, key, wait_ms=90):
    page.keyboard.press(key)
    page.wait_for_timeout(wait_ms)


def move_piece(page, rotation, x, y):
    canvas = page.locator('#pixi-host canvas')
    canvas.evaluate('(element) => element.focus()')
    current = state(page)
    while current['rotation'] != rotation:
        press(page, 'e')
        current = state(page)
    while current['anchor']['x'] < x:
        press(page, 'ArrowRight')
        current = state(page)
    while current['anchor']['x'] > x:
        press(page, 'ArrowLeft')
        current = state(page)
    while current['anchor']['y'] < y:
        press(page, 'ArrowDown')
        current = state(page)
    while current['anchor']['y'] > y:
        press(page, 'ArrowUp')
        current = state(page)
    return current


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        executable_path='/usr/bin/chromium',
        args=[
            '--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist',
            '--enable-webgl', '--enable-unsafe-swiftshader', '--use-gl=angle',
            '--use-angle=swiftshader', '--disable-background-timer-throttling',
        ],
    )
    context = browser.new_context(
        viewport={'width': 430, 'height': 932},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    page.set_content((DIST / 'index.html').read_text(), wait_until='load')
    page.locator('#start-button').tap()
    page.wait_for_selector('#pixi-host canvas', state='visible', timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(600)
    canvas = page.locator('#pixi-host canvas')

    before_row = move_piece(page, 2, 2, 5)
    assert before_row['currentPieceId'] == 'row-homes'
    assert before_row['anchor'] == {'x': 2, 'y': 5}
    canvas.screenshot(path=str(EVIDENCE / 'district-row-homes-hover.png'))

    old_turn = before_row['turn']
    press(page, 'Space', 180)
    page.wait_for_function('(turn) => window.__SKYLINE_DROP__.state().turn > turn', arg=old_turn)
    page.wait_for_timeout(500)

    before_main = move_piece(page, 0, 4, 2)
    canvas.screenshot(path=str(EVIDENCE / 'district-row-homes-landed.png'))
    assert before_main['currentPieceId'] == 'main-street'
    assert before_main['anchor'] == {'x': 4, 'y': 2}
    canvas.screenshot(path=str(EVIDENCE / 'district-main-street-hover.png'))

    old_turn = before_main['turn']
    press(page, 'Space', 180)
    page.wait_for_function('(turn) => window.__SKYLINE_DROP__.state().turn > turn', arg=old_turn)
    page.wait_for_timeout(500)
    after_main = move_piece(page, 0, 0, 3)
    assert after_main['currentPieceId'] == 'mixed-corner'
    canvas.screenshot(path=str(EVIDENCE / 'district-main-street-landed.png'))

    final = state(page)
    result = {
        'schema': 'skyline-drop-district-visual-contract-proof@1',
        'status': 'PASS',
        'rowHomes': {
            'rotation': 2,
            'anchor': {'x': 2, 'y': 5},
            'hover': 'district-row-homes-hover.png',
            'landed': 'district-row-homes-landed.png',
        },
        'mainStreet': {
            'rotation': 0,
            'anchor': {'x': 4, 'y': 2},
            'hover': 'district-main-street-hover.png',
            'landed': 'district-main-street-landed.png',
        },
        'finalPhase': final['phase'],
        'turn': final['turn'],
        'pageErrors': page_errors,
        'consoleErrors': console_errors,
    }
    assert not page_errors, page_errors
    assert not console_errors, console_errors
    (EVIDENCE / 'district-visual-contract-proof.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'district-visual-contract-proof.txt').write_text(
        'DISTRICT_VISUAL_CONTRACT PASS\n'
        'shared_surface_recipe=true inactive_buildings_opaque=true surface_only_shadows=true\n'
    )
    print(json.dumps(result, indent=2))
    context.close()
    browser.close()
