/**
 * The slice of WebHID the Steam Controller driver uses (spec C1). TypeScript's DOM
 * library has no WebHID types, and only Chromium browsers (Chrome, Arc) have it.
 */
export interface HIDReportItem {
  reportSize?: number;
  reportCount?: number;
}

export interface HIDReportInfo {
  reportId: number;
  items?: HIDReportItem[];
}

export interface HIDCollectionInfo {
  usagePage: number;
  usage: number;
  inputReports?: HIDReportInfo[];
  outputReports?: HIDReportInfo[];
  featureReports?: HIDReportInfo[];
}

export interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: readonly HIDCollectionInfo[];
  open(): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
}

export interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice;
  readonly reportId: number;
  readonly data: DataView;
}

export interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

export interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

export interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: { filters: HIDDeviceFilter[] }): Promise<HIDDevice[]>;
}

/** The browser's WebHID, or undefined (Safari, Firefox, or a page that is not a secure context). */
export function webHid(): HID | undefined {
  return (globalThis.navigator as { hid?: HID } | undefined)?.hid;
}
