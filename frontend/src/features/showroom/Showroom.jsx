import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "../../shared/router";
import { useProduct, fetchShopProducts } from "../catalog/api";
import { useCartStore } from "../cart/useCartStore";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import ShowroomScene from "./ShowroomScene";
import styles from "./showroom.module.css";

const SHOWROOM_QUERY = { page_size: 12, ordering: "-sales_count" };
const SECTION_POSITIONS = [[-4.7, -2.5], [4.7, -2.5], [-4.7, -8.5], [4.7, -8.5]];

function buildSections(products) {
  const grouped = new Map();
  products.forEach((product) => {
    const title = product.category?.name ?? product.collections?.[0]?.name ?? "منتخب بوتیک";
    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title).push(product);
  });
  const entries = [...grouped.entries()];
  const visibleEntries = entries.length > 4
    ? [...entries.slice(0, 3), ["منتخب بوتیک", entries.slice(3).flatMap(([, items]) => items)]]
    : entries;
  return visibleEntries.map(([title, sectionProducts], index) => ({
    key: `${title}-${index}`,
    title,
    products: sectionProducts,
    position: SECTION_POSITIONS[index],
  }));
}

function ProductPreview({ product, isLoading, isError, onClose }) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [variantId, setVariantId] = useState(null);
  const [cartMessage, setCartMessage] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const variants = product.variants ?? [];
  const colors = product.colors?.length
    ? product.colors
    : [...new Map(variants.map((variant) => [variant.color.slug, variant.color])).values()];
  const sizes = product.sizes?.length
    ? product.sizes
    : [...new Map(variants.map((variant) => [variant.size.code, variant.size])).values()];

  useEffect(() => {
    setVariantId(variants.find((variant) => variant.in_stock)?.id ?? null);
    setCartMessage("");
    setSelectedImageUrl(null);
  }, [product.id, product.variants]);

  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const selectedColor = selectedVariant?.color ?? colors[0];
  const selectedSize = selectedVariant?.size;
  const cartKey = selectedVariant
    ? `${product.id}:${selectedVariant.color.slug}:${selectedVariant.size.code}`
    : "";
  const cartQuantity = cartItems.find((item) => item.key === cartKey)?.quantity ?? 0;
  const images = product.images ?? [];
  const image = selectedImageUrl ?? images[0]?.url ?? product.image;
  const availableSizes = new Set(variants
    .filter((variant) => variant.color.slug === selectedColor?.slug && variant.in_stock)
    .map((variant) => variant.size.code));

  const selectColor = (color) => {
    const matching = variants.find((variant) => variant.color.slug === color.slug && variant.in_stock);
    setVariantId(matching?.id ?? variants.find((variant) => variant.color.slug === color.slug)?.id ?? null);
  };

  const selectSize = (size) => {
    const matching = variants.find((variant) => variant.color.slug === selectedColor?.slug && variant.size.code === size.code);
    if (matching) setVariantId(matching.id);
  };

  const addToCart = () => {
    if (!selectedVariant?.in_stock || !selectedVariant.available || cartQuantity >= selectedVariant.available) return;
    addItem({
      key: cartKey,
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name,
      image,
      colorName: selectedColor?.name ?? "",
      sizeName: selectedSize?.name ?? selectedSize?.code ?? "",
      unitPrice: Number(selectedVariant.price ?? product.final_price),
      originalPrice: Math.max(Number(product.price), Number(selectedVariant.price ?? product.final_price)),
      maxQuantity: selectedVariant.available,
    });
    setCartMessage("به سبد خرید اضافه شد.");
  };

  return (
    <aside className={styles.preview} aria-label={`پیش‌نمایش ${product.name}`} aria-live="polite">
      <button className={styles.closePreview} type="button" onClick={onClose} aria-label="بستن پیش‌نمایش">×</button>
      <div className={styles.previewImage}>
        {image
          ? <img src={image} alt={product.name} />
          : <span aria-hidden="true">{product.name.slice(0, 1)}</span>}
        <span className={styles.previewImageLabel}>BOUTIQUE · OBJECTS OF DESIRE</span>
      </div>
      <div className={styles.previewDetails}>
        {images.length > 1 && (
          <div className={styles.previewGallery} aria-label="زاویه‌های مختلف محصول">
            {images.map((productImage, index) => (
              <button key={productImage.id ?? productImage.url} type="button"
                aria-label={`نمای تصویر ${formatNumber(index + 1)}`}
                aria-pressed={image === productImage.url}
                onClick={() => setSelectedImageUrl(productImage.url)}>
                <img src={productImage.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        <p className={styles.previewBrand}>{product.brand?.name ?? "BOUTIQUE SELECTION"}</p>
        <h2>{product.name}</h2>
        {product.category?.name && <p className={styles.previewCategory}>{product.category.name}</p>}
        <div className={styles.previewPrice}>
          {product.discount_percent > 0 && <del>{formatPrice(product.price)}</del>}
          <strong>{formatPrice(selectedVariant?.price ?? product.final_price)}</strong>
        </div>

        {isLoading && <p className={styles.inlineStatus} role="status">در حال دریافت رنگ‌ها، سایزها و موجودی...</p>}
        {isError && <p className={styles.inlineError} role="alert">جزئیات و موجودی محصول دریافت نشد؛ برای دیدن اطلاعات کامل وارد صفحه محصول شوید.</p>}

        {!isLoading && !isError && (
          <>
            {colors.length > 0 && (
              <fieldset className={styles.choiceGroup}>
                <legend>رنگ: {selectedColor?.name ?? "انتخاب نشده"}</legend>
                <div className={styles.colorOptions}>
                  {colors.map((color) => (
                    <button key={color.slug} type="button" className={styles.colorOption}
                      aria-label={color.name} aria-pressed={selectedColor?.slug === color.slug}
                      title={color.name} onClick={() => selectColor(color)}>
                      <span style={{ "--swatch": color.hex }} />
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {sizes.length > 0 && (
              <fieldset className={styles.choiceGroup}>
                <legend>سایز</legend>
                <div className={styles.sizeOptions}>
                  {sizes.map((size) => (
                    <button key={size.code} type="button" className={styles.sizeOption}
                      aria-pressed={selectedSize?.code === size.code}
                      disabled={!availableSizes.has(size.code)} onClick={() => selectSize(size)}>
                      {size.name || size.code}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {selectedVariant && (
              <p className={selectedVariant.in_stock ? styles.stock : styles.outOfStock} role="status">
                {selectedVariant.in_stock
                  ? `موجود · ${formatNumber(selectedVariant.available)} عدد`
                  : "این ترکیب فعلاً موجود نیست"}
              </p>
            )}
            <button type="button" className={styles.addToCart}
              disabled={!selectedVariant?.in_stock || !selectedVariant.available || cartQuantity >= selectedVariant.available}
              onClick={addToCart}>
              {!selectedVariant?.in_stock
                ? "این ترکیب ناموجود است"
                : cartQuantity >= selectedVariant.available
                  ? "حداکثر موجودی در سبد خرید است"
                  : "افزودن به سبد خرید"}
            </button>
            {cartMessage && <p className={styles.success} role="status">{cartMessage}</p>}
          </>
        )}
        <Link className={styles.productLink} to={`/product/${product.slug}`}>مشاهده‌ی صفحه کامل محصول <span aria-hidden="true">↗</span></Link>
      </div>
    </aside>
  );
}

export default function Showroom() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["showroom-products"],
    queryFn: () => fetchShopProducts(SHOWROOM_QUERY),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
  const products = data?.results ?? [];
  const sections = useMemo(() => buildSections(products), [products]);
  const [selected, setSelected] = useState(null);
  const [selectedSection, setSelectedSection] = useState(0);
  const productQuery = useProduct(selected?.slug);
  const activeProduct = productQuery.data ?? selected;
  const selectProduct = (product) => {
    setSelected(product);
    const sectionIndex = sections.findIndex((section) => section.products.some((item) => item.id === product.id));
    if (sectionIndex >= 0) setSelectedSection(sectionIndex);
  };

  return (
    <section className={styles.page} dir="rtl" aria-labelledby="showroom-title">
      <div className={styles.scene}>
        {!isLoading && !isError && products.length > 0 && (
          <Suspense fallback={<div className={styles.sceneLoading} role="status">در حال آماده‌سازی فضای بوتیک...</div>}>
            <ShowroomScene products={products} sections={sections} selectedSection={selectedSection}
              onSelect={selectProduct} />
          </Suspense>
        )}
        {!isLoading && !isError && products.length > 0 && (
          <div className={styles.accessibleProducts} aria-label="انتخاب محصول در شوروم">
            {products.map((product) => (
              <button key={product.id} type="button" onClick={() => selectProduct(product)}>
                {product.name}، {product.brand?.name ?? "BOUTIQUE"}
              </button>
            ))}
          </div>
        )}
        {(isLoading || isError || (!isLoading && products.length === 0)) && (
          <div className={styles.sceneMessage} role={isError ? "alert" : "status"}>
            {isLoading && "در حال آماده‌سازی فضای بوتیک..."}
            {isError && "دریافت مجموعه محصولات شوروم ناموفق بود. لطفاً دوباره تلاش کنید."}
            {!isLoading && !isError && "در حال حاضر محصولی برای نمایش در شوروم نیست."}
          </div>
        )}

        <header className={styles.topbar}>
          <Link className={styles.wordmark} to="/" aria-label="بازگشت به بوتیک">BOUTIQUE <span>ATELIER</span></Link>
          <nav className={styles.sectionNav} aria-label="بخش‌های شوروم">
            {sections.map((section, index) => (
              <button key={section.key} type="button"
                className={selectedSection === index ? styles.sectionActive : styles.sectionButton}
                aria-pressed={selectedSection === index}
                onClick={() => setSelectedSection(index)}>
                <span>{formatNumber(index + 1).padStart(2, "۰")}</span>{section.title}
              </button>
            ))}
          </nav>
          <Link className={styles.shopLink} to="/shop">فروشگاه کامل <span aria-hidden="true">↗</span></Link>
        </header>

        <section className={styles.titleBlock}>
          <p className={styles.eyebrow}>A PRIVATE VIEWING · EST. 2026</p>
          <h1 id="showroom-title">ورود به دنیای بوتیک</h1>
          <p>در فضای کالکشن قدم بزنید؛ محصولی را لمس کنید تا جزئیاتش را ببینید.</p>
        </section>

        <div className={styles.controlsHint} aria-hidden="true">
          <span><i>⟲</i> کشیدن برای چرخش</span>
          <span><i>＋</i> اسکرول برای نزدیک‌شدن</span>
          <span><i>↗</i> لمس محصول برای جزئیات</span>
        </div>

        {activeProduct && (
          <ProductPreview product={activeProduct} isLoading={productQuery.isLoading}
            isError={productQuery.isError} onClose={() => setSelected(null)} />
        )}

        {!selected && !isLoading && !isError && products.length > 0 && (
          <div className={styles.welcomeNote}>
            <span className={styles.welcomeMark}>B</span>
            <p>با کشیدن صحنه اطراف را بگردانید؛ با اسکرول نزدیک شوید و برای انتخاب روی مانکن یا لباس بزنید.</p>
            <span className={styles.welcomeRule} />
          </div>
        )}
      </div>
      <footer className={styles.footer}>
        <span>DESIGNED TO BE DISCOVERED</span>
        <span>فضای سه‌بعدی بوتیک · کنترل با ماوس، لمس و اسکرول</span>
      </footer>
    </section>
  );
}
