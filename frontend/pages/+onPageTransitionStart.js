// خروج نرم صفحه قبلی (کلاس روی body؛ استایل در MainLayout.module.css)
export async function onPageTransitionStart() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.body.classList.add("page-is-transitioning");
  await new Promise((resolve) => setTimeout(resolve, 250));
}
