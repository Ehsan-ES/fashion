let instance = null;

export const setLenis = (l) => { instance = l; };
export const getLenis = () => instance;

export function scrollToTop() {
  if (instance) instance.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}
