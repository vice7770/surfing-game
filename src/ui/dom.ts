/** A tiny element builder for the menus (plan P8): native DOM, no framework. */
type Child = Node | string | null | undefined | false;
type Handlers = { [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void };

export interface ElementProps {
  class?: string;
  text?: string;
  attrs?: Record<string, string>;
  dataset?: Record<string, string>;
  on?: Handlers;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: ElementProps = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props.class) element.className = props.class;
  if (props.text !== undefined) element.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) element.setAttribute(name, value);
  Object.assign(element.dataset, props.dataset ?? {});
  for (const [type, handler] of Object.entries(props.on ?? {})) element.addEventListener(type, handler as EventListener);
  for (const child of children) if (child) element.append(child);
  return element;
}

/** An inline SVG icon from its markup (icons.ts). */
export function icon(markup: string): Element {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild!;
}
