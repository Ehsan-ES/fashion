/** کمک‌ها برای شبیه‌سازی Router (Vike) در تست‌ها؛ Mock آن در setupTests.js تعریف شده است. */
export function setTestUrl(url = "/") {
  const parsed = new URL(url, "http://test.local");
  globalThis.__pageContext = {
    urlPathname: parsed.pathname,
    urlParsed: { searchOriginal: parsed.search || null },
    routeParams: {},
    is404: false,
  };
}
