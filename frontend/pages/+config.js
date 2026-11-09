import vikeReact from "vike-react/config";

export default {
  extends: [vikeReact],
  // حالت SPA. در مرحله ۱۶ برای صفحه‌های محصول/دسته با `+config.js` اختصاصی (ssr: true) فعال می‌شود.
  ssr: false,
  title: "بوتیک",
  description: "بوتیک آنلاین پوشاک زنانه و مردانه",
};
