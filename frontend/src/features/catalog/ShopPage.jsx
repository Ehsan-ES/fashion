import { useMemo, useRef, useState } from "react";
import { formatNumber } from "../../shared/utils/format";
import { useLocation, useNavigate } from "../../shared/router";
import ProductCard, { ProductCardSkeleton } from "./components/ProductCard";
import { useCategories, useProductFilters, useShopProducts } from "./api";
import { parseShopFilters, SHOP_PAGE_SIZE, SORT_OPTIONS, toShopApiParams, updateShopSearch } from "./shopFilters";
import styles from "./shop.module.css";
import { useModal } from "../../shared/hooks/useModal";

const GENDERS = [
  { value: "women", label: "زنانه" },
  { value: "men", label: "مردانه" },
  { value: "unisex", label: "یونیسکس" },
];

function FilterOptions({ title, name, options, selected, onChange, getValue, getLabel, getColor }) {
  if (!options?.length) return null;
  return (
    <fieldset className={styles.filterGroup}>
      <legend>{title}</legend>
      <div className={styles.options}>
        {options.map((option) => {
          const value = getValue(option);
          const checked = selected.includes(value);
          return (
            <label key={value} className={styles.option}>
              <input
                type="checkbox"
                name={name}
                value={value}
                checked={checked}
                onChange={() => onChange(checked ? selected.filter((item) => item !== value) : [...selected, value])}
              />
              {getColor && <span className={styles.swatch} style={{ "--swatch": getColor(option) }} aria-hidden="true" />}
              <span>{getLabel(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FilterPanel({ filters, facets, categories, filterError, filterLoading, onChange, onClear, onClose, modal = false, panelRef }) {
  const setList = (key, value) => onChange({ [key]: value, page: 1 });
  const setToggle = (key) => onChange({ [key]: !filters[key], page: 1 });
  const submitPrice = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onChange({ min_price: form.get("min_price") ?? "", max_price: form.get("max_price") ?? "", page: 1 });
  };
  const categoryOptions = (categories ?? []).flatMap((category) => [
    category,
    ...(category.children ?? []),
  ]);

  return (
    <div className={modal ? styles.drawerBackdrop : styles.inlinePanel} onMouseDown={(event) => {
      if (modal && event.target === event.currentTarget) onClose();
    }}>
      <aside
        ref={panelRef}
        className={styles.filters}
        role={modal ? "dialog" : undefined}
        aria-modal={modal ? "true" : undefined}
        aria-label={modal ? "فیلتر محصولات" : undefined}
      >
        <div className={styles.filterHeader}>
          <h2>فیلتر محصولات</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="بستن فیلترها">×</button>
        </div>

        <div className={styles.filterBody} data-lenis-prevent>
          {filterError && <p className={styles.filterError} role="alert">بارگذاری گزینه‌های فیلتر با خطا مواجه شد.</p>}
          {filterLoading && <p className={styles.filterLoading} role="status">در حال بارگذاری گزینه‌های فیلتر...</p>}
          <fieldset className={styles.filterGroup}>
            <legend>دسته‌بندی</legend>
            <div className={styles.options}>
              {categoryOptions.map((category) => (
                <label key={category.slug} className={styles.option}>
                  <input
                    type="radio"
                    name="category"
                    checked={filters.category === category.slug}
                    onChange={() => onChange({ category: category.slug, page: 1 })}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
              {filters.category && (
                <button type="button" className={styles.clearCategory} onClick={() => onChange({ category: "", page: 1 })}>
                  همه دسته‌بندی‌ها
                </button>
              )}
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend>جنسیت</legend>
            <div className={styles.options}>
              {GENDERS.map((gender) => (
                <label key={gender.value} className={styles.option}>
                  <input
                    type="radio"
                    name="gender"
                    checked={filters.gender === gender.value}
                    onChange={() => onChange({ gender: gender.value, page: 1 })}
                  />
                  <span>{gender.label}</span>
                </label>
              ))}
              <label className={styles.option}>
                <input type="radio" name="gender" checked={!filters.gender} onChange={() => onChange({ gender: "", page: 1 })} />
                <span>همه</span>
              </label>
            </div>
          </fieldset>

          <form key={`${filters.min_price}:${filters.max_price}`} className={`${styles.filterGroup} ${styles.priceGroup}`} onSubmit={submitPrice}>
            <fieldset className={styles.priceFieldset}>
              <legend>محدوده قیمت (تومان)</legend>
              <div className={styles.priceInputs}>
                <label>از<input name="min_price" type="number" min="0" inputMode="numeric" defaultValue={filters.min_price} /></label>
                <label>تا<input name="max_price" type="number" min="0" inputMode="numeric" defaultValue={filters.max_price} /></label>
              </div>
              {facets?.price?.min != null && facets?.price?.max != null && (
                <p className={styles.rangeHint}>
                  {formatNumber(facets.price.min)} تا {formatNumber(facets.price.max)}
                </p>
              )}
              <button className={styles.applyPrice} type="submit">اعمال قیمت</button>
            </fieldset>
          </form>

          <FilterOptions
            title="برند"
            name="brand"
            options={facets?.brands}
            selected={filters.brand}
            onChange={(value) => setList("brand", value)}
            getValue={(item) => item.slug}
            getLabel={(item) => item.name}
          />
          <FilterOptions
            title="رنگ"
            name="color"
            options={facets?.colors}
            selected={filters.color}
            onChange={(value) => setList("color", value)}
            getValue={(item) => item.slug}
            getLabel={(item) => item.name}
            getColor={(item) => item.hex}
          />
          <FilterOptions
            title="سایز"
            name="size"
            options={facets?.sizes}
            selected={filters.size}
            onChange={(value) => setList("size", value)}
            getValue={(item) => item.code}
            getLabel={(item) => item.name ? `${item.name} (${item.code})` : item.code}
          />

          <fieldset className={styles.filterGroup}>
            <legend>وضعیت محصول</legend>
            <div className={styles.options}>
              <label className={styles.option}><input type="checkbox" checked={filters.on_sale} onChange={() => setToggle("on_sale")} />تخفیف‌دار</label>
              <label className={styles.option}><input type="checkbox" checked={filters.in_stock} onChange={() => setToggle("in_stock")} />موجود</label>
              <label className={styles.option}><input type="checkbox" checked={filters.is_new} onChange={() => setToggle("is_new")} />تازه‌رسیده</label>
            </div>
          </fieldset>
        </div>

        <div className={styles.filterFooter}>
          <button type="button" className={styles.clearButton} onClick={onClear}>پاک‌کردن فیلترها</button>
          <button type="button" className={styles.doneButton} onClick={onClose}>مشاهده نتایج</button>
        </div>
      </aside>
    </div>
  );
}

function MobileFilterPanel(props) {
  const panelRef = useRef(null);
  useModal(panelRef, props.onClose);
  return <FilterPanel {...props} modal panelRef={panelRef} />;
}

function PageStatus({ children, error = false }) {
  return <p className={error ? styles.error : styles.status} role={error ? "alert" : "status"}>{children}</p>;
}

export default function ShopPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filters = useMemo(() => parseShopFilters(search), [search]);
  const apiParams = useMemo(() => toShopApiParams(filters), [filters]);
  const facetParams = useMemo(() => ({
    ...(filters.gender ? { gender: filters.gender } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  }), [filters.category, filters.gender]);
  const { data: result, isLoading, isError, isFetching } = useShopProducts(apiParams);
  const facetsQuery = useProductFilters(facetParams);
  const categoriesQuery = useCategories();

  const updateFilters = (updates) => {
    navigate(`/shop${updateShopSearch(search, updates)}`, { replace: false });
  };
  const clearFilters = () => {
    const base = {};
    if (filters.gender) base.gender = filters.gender;
    if (filters.search) base.search = filters.search;
    const params = new URLSearchParams(base).toString();
    navigate(`/shop${params ? `?${params}` : ""}`);
  };
  const pageCount = Math.ceil((result?.count ?? 0) / SHOP_PAGE_SIZE);
  const title = filters.search
    ? `نتایج جستجو برای «${filters.search}»`
    : filters.gender === "women" ? "پوشاک زنانه" : filters.gender === "men" ? "پوشاک مردانه" : "فروشگاه";

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>کالکشن بوتیک</p>
        <h1>{title}</h1>
        <p className={styles.intro}>انتخابی از طراحی‌های ماندگار، پارچه‌های باکیفیت و جزئیات دقیق.</p>
      </header>

      <div className={styles.toolbar}>
        <button type="button" className={styles.filterButton} onClick={() => setDrawerOpen(true)}>
          فیلترها
        </button>
        <p className={styles.count} aria-live="polite">
          {isLoading ? "در حال دریافت محصولات..." : `${formatNumber(result?.count ?? 0)} محصول`}
        </p>
        <label className={styles.sort}>
          <span>مرتب‌سازی</span>
          <select value={filters.ordering} onChange={(event) => updateFilters({ ordering: event.target.value, page: 1 })}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.layout}>
        <aside className={styles.desktopFilters} aria-label="فیلتر محصولات">
          <FilterPanel
            key="desktop-filters"
            filters={filters}
            facets={facetsQuery.data}
            categories={categoriesQuery.data}
            filterError={facetsQuery.isError || categoriesQuery.isError}
            filterLoading={facetsQuery.isLoading || categoriesQuery.isLoading}
            onChange={updateFilters}
            onClear={clearFilters}
            onClose={() => {}}
          />
        </aside>

        <section className={styles.results} aria-label="فهرست محصولات">
          {isError ? (
            <PageStatus error>دریافت محصولات با خطا مواجه شد. لطفاً دوباره تلاش کنید.</PageStatus>
          ) : isLoading ? (
            <div className={styles.grid} aria-label="در حال بارگذاری محصولات">
              {Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}
            </div>
          ) : result?.results?.length ? (
            <>
              {isFetching && <span className={styles.fetching} role="status">در حال به‌روزرسانی...</span>}
              <div className={styles.grid}>
                {result.results.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
              {pageCount > 1 && (
                <nav className={styles.pagination} aria-label="صفحه‌های محصولات">
                  <button type="button" disabled={filters.page <= 1} onClick={() => updateFilters({ page: filters.page - 1 })}>قبلی</button>
                  <span>صفحه {formatNumber(filters.page)} از {formatNumber(pageCount)}</span>
                  <button type="button" disabled={filters.page >= pageCount} onClick={() => updateFilters({ page: filters.page + 1 })}>بعدی</button>
                </nav>
              )}
            </>
          ) : (
            <div className={styles.empty}>
              <h2>محصولی پیدا نشد</h2>
              <p>فیلترها را تغییر دهید یا دوباره جستجو کنید.</p>
              <button type="button" className={styles.clearButton} onClick={clearFilters}>پاک‌کردن فیلترها</button>
            </div>
          )}
        </section>
      </div>

      {drawerOpen && (
        <div className={styles.mobileDrawer}>
          <MobileFilterPanel
            key="mobile-filters"
            filters={filters}
            facets={facetsQuery.data}
            categories={categoriesQuery.data}
            filterError={facetsQuery.isError || categoriesQuery.isError}
            filterLoading={facetsQuery.isLoading || categoriesQuery.isLoading}
            onChange={updateFilters}
            onClear={clearFilters}
            onClose={() => setDrawerOpen(false)}
          />
        </div>
      )}
    </main>
  );
}
