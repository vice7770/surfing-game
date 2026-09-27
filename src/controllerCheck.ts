/**
 * Hardware check for the 2026 Steam Controller (spec C1, dev only: /controller-check.html).
 * Lists what the Gamepad API sees, opens the controller over WebHID, turns lizard mode
 * off, shows its live state and report rates, and records raw reports for the tests.
 */
import { buttonLabel } from './game/Bindings';
import { FEATURE_REPORT_ID, VALVE_VENDOR, VENDOR_USAGE_PAGE, decodeState, featureLength, lizardModeReport, mappingsReport, tritonPad } from './game/steam/tritonProtocol';
import { webHid, type HIDDevice, type HIDInputReportEvent } from './game/steam/webHid';

interface Opened {
  device: HIDDevice;
  index: number;
  /** Reports per ID this second; a negative ID marks an unknown report already logged. */
  counts: Map<number, number>;
  rates: string;
  pad?: ReturnType<typeof tritonPad>;
  raw?: string;
}

const log = document.querySelector<HTMLPreElement>('#log')!;
const live = document.querySelector<HTMLPreElement>('#live')!;
const lines: string[] = [];
const say = (line: string) => {
  lines.push(line);
  log.textContent = lines.join('\n');
};
const hex = (value: number, width = 4) => `0x${value.toString(16).padStart(width, '0')}`;
const bytes = (data: DataView) => Array.from(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
const opened: Opened[] = [];
let recording: { device: number; productId: number; reportId: number; t: number; bytes: number[] }[] | undefined;

function describe(device: HIDDevice): string {
  const collections = device.collections.map((collection) => {
    const ids = (reports?: { reportId: number }[]) => (reports ?? []).map((report) => hex(report.reportId, 2)).join(',') || '-';
    return `    page ${hex(collection.usagePage)} usage ${hex(collection.usage)} in[${ids(collection.inputReports)}] out[${ids(collection.outputReports)}] feature[${ids(collection.featureReports)}]`;
  });
  return [`${device.productName} ${hex(device.vendorId)}:${hex(device.productId)} feature length ${featureLength(device.collections)}`, ...collections].join('\n');
}

async function open(device: HIDDevice): Promise<void> {
  if (opened.some((entry) => entry.device === device)) return;
  const entry: Opened = { device, index: opened.length, counts: new Map(), rates: '' };
  opened.push(entry);
  say(`Device ${entry.index}: ${describe(device)}`);
  if (!device.collections.some((collection) => collection.usagePage === VENDOR_USAGE_PAGE)) {
    say('  (no vendor collection; not opened)');
    return;
  }
  device.addEventListener('inputreport', (event) => {
    const { reportId, data } = event as HIDInputReportEvent;
    entry.counts.set(reportId, (entry.counts.get(reportId) ?? 0) + 1);
    recording?.push({ device: entry.index, productId: device.productId, reportId, t: Math.round(performance.now()), bytes: bytes(data) });
    const state = decodeState(reportId, data);
    if (state) {
      entry.pad = tritonPad(state, `steam:${entry.index}`);
      entry.raw = bytes(data).slice(0, 17).map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
    } else if (!entry.counts.has(-reportId)) {
      entry.counts.set(-reportId, 1);
      say(`  device ${entry.index}: first report ${hex(reportId, 2)} (${data.byteLength} bytes): ${bytes(data).slice(0, 16).join(' ')}`);
    }
  });
  try {
    if (!device.opened) await device.open();
    say('  opened');
  } catch (error) {
    say(`  open failed: ${String(error)}`);
  }
}

async function send(label: string, report: (length: number) => Uint8Array<ArrayBuffer>): Promise<void> {
  const targets = opened.filter((entry) => entry.pad);
  for (const entry of targets.length > 0 ? targets : opened) {
    try {
      await entry.device.sendFeatureReport(FEATURE_REPORT_ID, report(featureLength(entry.device.collections)));
      if (label) say(`${label} → device ${entry.index}: sent`);
    } catch (error) {
      say(`${label || 'keepalive'} → device ${entry.index}: ${String(error)}`);
    }
  }
}

function render(): void {
  const pads = Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => pad !== null);
  const gamepadLines = pads.length === 0 ? ['Gamepad API: no pads'] : pads.map((pad) => `Gamepad API ${pad.index}: ${pad.id} mapping=${pad.mapping || 'none'} buttons=${pad.buttons.length} axes=${pad.axes.length}`);
  const hidLines = opened.filter((entry) => entry.pad).map((entry) => {
    const pad = entry.pad!;
    const down = pad.buttons.flatMap((pressed, index) => (pressed ? [buttonLabel(index, 'steam')] : []));
    return [
      `WebHID device ${entry.index}: ${entry.rates}`,
      `  buttons: ${down.join(' ') || '-'}`,
      `  left stick ${pad.axes[0].toFixed(3)} ${pad.axes[1].toFixed(3)}   right stick ${pad.axes[2].toFixed(3)} ${pad.axes[3].toFixed(3)}`,
      `  LT ${pad.values![6].toFixed(3)}  RT ${pad.values![7].toFixed(3)}`,
      `  raw ${entry.raw}`,
    ].join('\n');
  });
  live.textContent = [...gamepadLines, ...hidLines].join('\n');
}

const hid = webHid();
say(`Secure context: ${window.isSecureContext}. WebHID: ${hid ? 'yes' : 'no'}. ${navigator.userAgent}`);
if (hid) {
  for (const device of await hid.getDevices()) await open(device);
  hid.addEventListener('connect', (event) => void open((event as unknown as { device: HIDDevice }).device));
  hid.addEventListener('disconnect', (event) => say(`disconnected: ${(event as unknown as { device: HIDDevice }).device.productName}`));
}

document.querySelector('#connect')!.addEventListener('click', async () => {
  if (!hid) return say('No WebHID here: use Chrome or Arc on localhost.');
  try {
    const devices = await hid.requestDevice({ filters: [{ vendorId: VALVE_VENDOR }] });
    say(`Chooser returned ${devices.length} device(s)`);
    for (const device of devices) await open(device);
  } catch (error) {
    say(`Chooser: ${String(error)}`);
  }
});
document.querySelector('#lizard-off')!.addEventListener('click', () => void send('Lizard off (SDL)', (length) => lizardModeReport(false, length)));
document.querySelector('#lizard-on')!.addEventListener('click', () => void send('Lizard on (SDL)', (length) => lizardModeReport(true, length)));
document.querySelector('#mappings-clear')!.addEventListener('click', () => void send('Clear mappings 0x81', (length) => mappingsReport(true, length)));
document.querySelector('#mappings-default')!.addEventListener('click', () => void send('Default mappings 0x85', (length) => mappingsReport(false, length)));
document.querySelector('#record')!.addEventListener('click', () => {
  recording = [];
  say('Recording 5 s…');
  setTimeout(() => {
    const data = recording ?? [];
    recording = undefined;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    link.download = 'steam-controller-recording.json';
    link.textContent = `Download recording (${data.length} reports)`;
    log.after(link);
    say(`Recorded ${data.length} reports.`);
  }, 5000);
});

const keepalive = document.querySelector<HTMLInputElement>('#keepalive')!;
setInterval(() => {
  if (keepalive.checked && document.visibilityState === 'visible') void send('', (length) => lizardModeReport(false, length));
  for (const entry of opened) {
    entry.rates = [...entry.counts].filter(([id]) => id >= 0).map(([id, count]) => `${hex(id, 2)} ${count}/s`).join('  ') || 'no reports';
    for (const id of [...entry.counts.keys()]) if (id >= 0) entry.counts.set(id, 0);
  }
}, 1000);
setInterval(render, 100);
