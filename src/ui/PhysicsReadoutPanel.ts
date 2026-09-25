import type { ReadoutRow } from '../wave/SwellReadout';

export class PhysicsReadoutPanel {
  constructor(private readonly list: HTMLElement) {}

  render(rows: ReadoutRow[]): void {
    this.list.replaceChildren(...rows.map(({ label, value }) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      return row;
    }));
  }
}
