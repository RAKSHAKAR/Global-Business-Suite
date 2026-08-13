import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(window, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0),
});
