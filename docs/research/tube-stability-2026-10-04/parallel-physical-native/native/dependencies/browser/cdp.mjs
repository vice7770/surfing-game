// A small Chrome DevTools Protocol driver (dev only): launches Google Chrome
// on a throwaway profile, and clicks, types and evaluates in the game's page.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Launch Chrome as an app window on a fresh profile, with the page kept running when covered. */
export async function launch({ url, width = 1280, height = 720, port = 9333, args = [] }) {
  const profile = mkdtempSync(join(tmpdir(), 'breakline-chrome-'));
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    // Keep rendering at full rate when another window covers this one.
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--autoplay-policy=no-user-gesture-required',
    '--auto-accept-this-tab-capture',
    `--window-size=${width},${height + 40}`, '--window-position=60,60',
    `--app=${url}`,
    ...args,
  ], { stdio: 'ignore' });
  let target;
  for (let tries = 0; tries < 100 && !target; tries += 1) {
    await sleep(150);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((entry) => entry.type === 'page' && entry.url.startsWith(url.split('?')[0]));
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome did not open the page');
  const page = await Page.connect(target.webSocketDebuggerUrl);
  page.close = async () => {
    chrome.kill();
    await sleep(500);
    rmSync(profile, { recursive: true, force: true });
  };
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  // The page thinks it has focus even when the window is in the background.
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await page.fitViewport(width, height);
  return page;
}

const KEYS = {
  Space: { key: ' ', keyCode: 32 }, Enter: { key: 'Enter', keyCode: 13 }, Escape: { key: 'Escape', keyCode: 27 },
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 }, ArrowUp: { key: 'ArrowUp', keyCode: 38 }, ArrowRight: { key: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', keyCode: 40 }, KeyR: { key: 'r', keyCode: 82 }, KeyC: { key: 'c', keyCode: 67 }, KeyM: { key: 'm', keyCode: 77 },
  KeyA: { key: 'a', keyCode: 65 }, KeyD: { key: 'd', keyCode: 68 }, KeyW: { key: 'w', keyCode: 87 }, KeyS: { key: 's', keyCode: 83 },
};

export class Page {
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new Page(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const waiter = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) waiter?.reject(new Error(`${message.error.message} (${waiter.method})`));
        else waiter?.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }

  on(method, listener) {
    const list = this.listeners.get(method) ?? [];
    list.push(listener);
    this.listeners.set(method, list);
  }

  /** Evaluate `expression` in the page (awaiting promises); `gesture` counts it as a user action. */
  async eval(expression, gesture = false) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true, userGesture: gesture,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  /** Size the window so the page's viewport is exactly width × height CSS pixels. */
  async fitViewport(width, height) {
    const { windowId } = await this.send('Browser.getWindowForTarget');
    for (let pass = 0; pass < 3; pass += 1) {
      const inner = await this.eval('({ w: innerWidth, h: innerHeight })');
      if (inner.w === width && inner.h === height) return;
      const { bounds } = await this.send('Browser.getWindowBounds', { windowId });
      await this.send('Browser.setWindowBounds', { windowId, bounds: { width: bounds.width + width - inner.w, height: bounds.height + height - inner.h } });
      await sleep(300);
    }
  }

  async waitFor(expression, timeoutMs = 30000, everyMs = 100) {
    const started = Date.now();
    for (;;) {
      const value = await this.eval(expression).catch(() => undefined);
      if (value) return value;
      if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${expression}`);
      await sleep(everyMs);
    }
  }

  /** Click the centre of the first element matching `selector` whose text includes `text`, as a real mouse click. */
  async click(selector, text = '') {
    const box = await this.waitFor(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent.includes(${JSON.stringify(text)}) && node.getClientRects().length);
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`, 15000);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
    await sleep(60);
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    await sleep(40);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }

  async keyDown(code) {
    const { key, keyCode } = KEYS[code];
    await this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  }

  async keyUp(code) {
    const { key, keyCode } = KEYS[code];
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  }

  async press(code, holdMs = 80) {
    await this.keyDown(code);
    await sleep(holdMs);
    await this.keyUp(code);
  }
}
