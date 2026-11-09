import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, useLocation } from "../../../router";
import { useAuthStore } from "../../../../features/auth/useAuthStore";
import { useCartStore } from "../../../../features/cart/useCartStore";
import { useCategories, useFeaturedCollections } from "../../../../features/catalog/api";
import SearchOverlay from "../../../../features/search/SearchOverlay";
import { useWishlistStore } from "../../../../features/wishlist/useWishlistStore";
import { site } from "../../../config/site";
import { useScrolled } from "../../../hooks/useScrolled";
import { formatNumber } from "../../../utils/format";
import { BagIcon, ChevronIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import MegaMenu from "./MegaMenu";
import MobileMenu from "./MobileMenu";
import styles from "./Header.module.css";

const GENDERS = [{ key: "women", label: "زنانه" }, { key: "men", label: "مردانه" }];

export default function Header({ transparentOnTop }) {
  const location = useLocation();
  const scrolled = useScrolled(24);
  const [mega, setMega] = useState(null); // "women" | "men" | null
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const timer = useRef(0);
  const lastInput = useRef("mouse");
  const triggers = useRef({});

  const { data: categories = [] } = useCategories();
  const { data: collections = [] } = useFeaturedCollections();
  const authed = useAuthStore((s) => s.status === "authenticated");
  const cartCount = useCartStore((s) => s.count);
  const wishCount = useWishlistStore((s) => s.count);

  useEffect(() => {
    setMega(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const solid = !transparentOnTop || scrolled || mega !== null;

  const hoverOpen = (key) => (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMega(key), 90);
  };
  const scheduleClose = (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMega(null), 180);
  };
  const cancelClose = () => clearTimeout(timer.current);

  const onTriggerClick = (key) => () => {
    clearTimeout(timer.current);
    // موس: Hover قبلاً باز کرده؛ کلیک نباید ببندد. لمس/کیبورد: کلیک تعویض می‌کند.
    setMega((cur) => (cur === key && lastInput.current !== "mouse" ? null : key));
  };

  const onHeaderKeyDown = (e) => {
    if (e.key === "Escape" && mega) {
      const key = mega;
      setMega(null);
      triggers.current[key]?.focus();
    }
  };
  const onHeaderBlur = (e) => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setMega(null);
  };

  return (
    <>
      <header
        className={styles.header}
        data-tone={solid ? "dark" : "light"}
        data-compact={scrolled ? "true" : "false"}
        onPointerLeave={scheduleClose}
        onKeyDown={onHeaderKeyDown}
        onBlur={onHeaderBlur}
      >
        <div className={styles.bar}>
          <div className={styles.start}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.mobileOnly}`}
              aria-label="باز کردن منو"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </button>
            <nav className={styles.nav} aria-label="منوی اصلی">
              <ul>
                {GENDERS.map((g) => (
                  <li key={g.key}>
                    <button
                      type="button"
                      ref={(el) => { triggers.current[g.key] = el; }}
                      className={styles.navItem}
                      aria-expanded={mega === g.key}
                      aria-controls="mega-menu"
                      onPointerEnter={hoverOpen(g.key)}
                      onPointerDown={(e) => { lastInput.current = e.pointerType; }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") lastInput.current = "keyboard"; }}
                      onClick={onTriggerClick(g.key)}
                    >
                      {g.label}
                      <ChevronIcon />
                    </button>
                  </li>
                ))}
                <li><Link className={styles.navItem} to="/showroom">شو روم</Link></li>
                <li><Link className={styles.navItem} to="/shop?on_sale=true">تخفیف‌ها</Link></li>
              </ul>
            </nav>
          </div>

          <Link to="/" className={styles.logo} aria-label={`${site.brand.fa} - صفحه اصلی`}>
            {site.brand.en}
          </Link>

          <div className={styles.end}>
            <button type="button" className={styles.iconBtn} aria-label="جستجو" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
            </button>
            <Link to="/wishlist" className={`${styles.iconBtn} ${styles.desktopOnly}`} aria-label="علاقه‌مندی‌ها">
              <HeartIcon />
              {wishCount > 0 && <span className={styles.badge}>{formatNumber(wishCount)}</span>}
            </Link>
            <Link
              to={authed ? "/account" : "/login"}
              className={`${styles.iconBtn} ${styles.desktopOnly}`}
              aria-label={authed ? "حساب کاربری" : "ورود یا ثبت‌نام"}
            >
              <UserIcon />
            </Link>
            <Link to="/cart" className={styles.iconBtn} aria-label={cartCount > 0 ? `سبد خرید، ${formatNumber(cartCount)} محصول` : "سبد خرید"}>
              <BagIcon />
              {cartCount > 0 && <span className={styles.badge}>{formatNumber(cartCount)}</span>}
            </Link>
          </div>
        </div>

        <AnimatePresence>
          {mega && (
            <MegaMenu
              key="mega"
              gender={mega}
              categories={categories}
              collections={collections}
              onPointerEnter={cancelClose}
              onNavigate={() => setMega(null)}
            />
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <MobileMenu
            key="mobile"
            categories={categories}
            authed={authed}
            cartCount={cartCount}
            wishCount={wishCount}
            onClose={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {searchOpen && <SearchOverlay key="search" onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
