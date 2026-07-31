from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-current-piece-info-work')
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)
console = []
errors = []
requests = []
assertions = []

def record(name, ok, detail=''):
    assertions.append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok:
        raise AssertionError(f'{name}: {detail}')

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

    current_name = page.locator('#piece-name').inner_text()
    current_summary = page.locator('#piece-summary').inner_text()
    record('initial current piece remains Row Homes', current_name == 'Row Homes', current_name)
    record('Row Homes composition is shown', current_summary == '3 homes · 2 roads · 1 park', current_summary)
    record('composition line is visible on mobile', page.locator('#piece-summary').is_visible(), str(page.locator('#piece-summary').bounding_box()))

    summaries = page.evaluate("""() => ({
      main: SkylineDrop.pieceContentsSummary(SkylineDrop.PIECES['main-street']),
      apartment: SkylineDrop.pieceContentsSummary(SkylineDrop.PIECES['apartment-court']),
      mixed: SkylineDrop.pieceContentsSummary(SkylineDrop.PIECES['mixed-corner']),
      green: SkylineDrop.pieceContentsSummary(SkylineDrop.PIECES['green-strip']),
      utility: SkylineDrop.pieceContentsSummary(SkylineDrop.PIECES['utility-plaza']),
      bore: SkylineDrop.pieceContentsSummary(SkylineDrop.PIECES['service-bore'])
    })""")
    record('Main Street composition is correct', summaries['main'] == '1 shop · 3 roads', summaries['main'])
    record('Apartment Court composition is correct', summaries['apartment'] == '3 apartments · 1 road', summaries['apartment'])
    record('Mixed Corner composition is correct', summaries['mixed'] == '1 home · 1 shop · 2 roads', summaries['mixed'])
    record('Green Strip composition is correct', summaries['green'] == '1 road · 2 parks', summaries['green'])
    record('Utility Plaza composition includes underground bore', summaries['utility'] == '2 roads · 1 park · 1 utility plaza · 1 underground bore', summaries['utility'])
    record('Service Bore is clearly underground-only', summaries['bore'] == 'UNDERGROUND ONLY · 3 conduit cells', summaries['bore'])

    page.screenshot(path=str(EVIDENCE / 'current-piece-info-mobile.png'), full_page=True)
    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-current-piece-info-proof@1',
        'status': 'PASS',
        'scope': 'current-piece composition text only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshot': 'current-piece-info-mobile.png',
    }
    (EVIDENCE / 'current-piece-info-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'current-piece-info-smoke.txt').write_text(f"CURRENT_PIECE_INFO_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n")
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions), 'summaries': summaries}, indent=2))
    context.close()
    browser.close()
