from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'
assertions=[]; console=[]; errors=[]; requests=[]

def record(name, ok, detail=''):
    assertions.append({'name':name,'ok':bool(ok),'detail':detail})
    if not ok: raise AssertionError(f'{name}: {detail}')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=False, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800}, device_scale_factor=1)
    page=context.new_page()
    page.on('console', lambda msg: console.append({'type':msg.type,'text':msg.text}))
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('request', lambda req: requests.append(req.url))
    page.set_content((ROOT/'dist/index.html').read_text(), wait_until='load')
    page.locator('#start-button').click()
    page.wait_for_selector('#pixi-host canvas', state='visible', timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(300)
    panel=page.locator('#information-panel')
    record('permanent panel visible on desktop', panel.is_visible(), str(panel.is_visible()))
    record('desktop panel defaults to current district', page.locator('#information-title').inner_text() == 'Row Homes', page.locator('#information-title').inner_text())
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    page.screenshot(path=str(EVIDENCE/'permanent-info-panel-desktop.png'), full_page=True)
    error_console=[x for x in console if x['type']=='error']
    external=[u for u in requests if u.startswith('http://') or u.startswith('https://')]
    record('no page errors', len(errors)==0, json.dumps(errors))
    record('no console errors', len(error_console)==0, json.dumps(error_console))
    record('no external HTTP requests', len(external)==0, json.dumps(external))
    result={'schema':'skyline-drop-permanent-information-panel-desktop-proof@1','status':'PASS','assertions':assertions,'pageErrors':errors,'consoleErrors':error_console,'externalHttpRequests':external,'screenshot':'permanent-info-panel-desktop.png'}
    (EVIDENCE/'permanent-info-panel-desktop-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
    (EVIDENCE/'permanent-info-panel-desktop-smoke.txt').write_text(f"PERMANENT_INFO_PANEL_DESKTOP PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n")
    print(json.dumps({'status':'PASS','assertions':len(assertions)},indent=2))
    context.close(); browser.close()
