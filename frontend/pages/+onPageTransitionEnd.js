import { scrollToTop } from "../src/shared/motion/lenis";

export function onPageTransitionEnd() {
  document.body.classList.remove("page-is-transitioning");
  scrollToTop();
}
