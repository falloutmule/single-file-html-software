from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT = Path('/mnt/data/skyline-drop-current-piece-info-work')
EVIDENCE = ROOT / 'evidence'
html = (ROOT/'dist/index.html').read_text()
errors=[]; console=[]; requests=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=False, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':720})
    page=context.new_page()
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('console', lambda msg: console.append({'type':msg.type,'text':msg.text}))
    page.on('request', lambda req: requests.append(req.url))
    page.set_content(html, wait_until='load')
    page.click('#start-button')
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(400)
    summary=page.locator('#piece-summary').inner_text()
    assert summary == '3 homes · 2 roads · 1 park', summary
    assert page.locator('#piece-summary').is_visible()
    page.screenshot(path=str(EVIDENCE/'current-piece-info-desktop.png'), full_page=True)
    error_console=[x for x in console if x['type']=='error']
    external=[u for u in requests if u.startswith('http://') or u.startswith('https://')]
    assert not errors, errors
    assert not error_console, error_console
    assert not external, external
    result={'schema':'skyline-drop-current-piece-info-desktop-proof@1','status':'PASS','summary':summary,'pageErrors':errors,'consoleErrors':error_console,'externalHttpRequests':external}
    (EVIDENCE/'current-piece-info-desktop-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
    (EVIDENCE/'current-piece-info-desktop-smoke.txt').write_text('CURRENT_PIECE_INFO_DESKTOP_SMOKE PASS\n')
    print(json.dumps(result,indent=2))
    context.close(); browser.close()
