import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// jsdom این APIها را ندارد
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}
window.scrollTo = window.scrollTo || (() => {});

// انیمیشن‌ها در تست خاموش‌اند تا نتیجه قطعی باشد
vi.mock("framer-motion", () => {
  const strip = ({ children, initial, animate, exit, transition, variants, custom, layout, whileHover, whileTap, ...rest }) => ({ rest, children });
  const cache = {};
  const motion = new Proxy({}, {
    get: (_, tag) => {
      // هر تگ فقط یک‌بار ساخته شود تا React کامپوننت را بین Renderها دوباره Mount نکند
      cache[tag] ??= React.forwardRef((props, ref) => {
        const { rest, children } = strip(props);
        return React.createElement(tag, { ...rest, ref }, children);
      });
      return cache[tag];
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  };
});
