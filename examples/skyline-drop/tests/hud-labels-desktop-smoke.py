from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'
console=[]; errors=[]; requests=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=False,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1)
    page=context.new_page()
    page.on('console',lambda m: console.append({'type':m.type,'text':m.text}))
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('request',lambda r: requests.append(r.url))
    page.set_content((ROOT/'dist/index.html').read_text(),wait_until='load')
    page.locator('#start-button').click()
    page.wait_for_selector('#pixi-host canvas',state='visible',timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__.state().phase === 'playing'")
    page.locator('#metrics-toggle').click()
    page.wait_for_selector('#metrics-panel',state='visible')
    page.screenshot(path=str(EVIDENCE/'hud-labels-open-desktop.png'),full_page=True)
    http=[u for u in requests if u.startswith('http://') or u.startswith('https://')]
    error_console=[m for m in console if m['type']=='error']
    result={
      'schema':'skyline-drop-hud-labels-desktop-proof@1',
      'status':'PASS' if page.locator('#pixi-host canvas').count()==1 and page.locator('#metrics-panel').is_visible() and not errors and not error_console and not http else 'FAIL',
      'canvasCount':page.locator('#pixi-host canvas').count(),
      'metricsVisible':page.locator('#metrics-panel').is_visible(),
      'pageErrors':errors,
      'consoleErrors':error_console,
      'externalHttpRequests':http,
    }
    (EVIDENCE/'hud-labels-desktop-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
    (EVIDENCE/'hud-labels-desktop-smoke.txt').write_text(f"HUD_LABELS_DESKTOP_SMOKE {result['status']} canvas={result['canvasCount']} page_errors={len(errors)} console_errors={len(error_console)} external_http={len(http)}\n")
    print(json.dumps(result,indent=2))
    context.close();browser.close()
if result['status']!='PASS': raise SystemExit(1)
