import "@testing-library/jest-dom";

// Polyfill ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): Array<IntersectionObserverEntry> {
    return [];
  }
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
};

// Polyfill matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Polyfill scrollTo (not available in jsdom)
window.scrollTo = () => {};

// Mock document.cookie for CSRF token tests
let cookieStore = "";
Object.defineProperty(document, "cookie", {
  get() {
    return cookieStore;
  },
  set(value: string) {
    cookieStore = value;
  },
  configurable: true,
});
