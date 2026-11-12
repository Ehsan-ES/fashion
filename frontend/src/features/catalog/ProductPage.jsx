import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouteParams } from "../../shared/router";
import { useAuthStore } from "../auth/useAuthStore";
import { useCartStore } from "../cart/useCartStore";
import WishlistButton from "../wishlist/WishlistButton";
import { formatNumber, formatPrice } from "../../shared/utils/format";
import ProductCard from "./components/ProductCard";
import {
  submitProductQuestion,
  submitProductReview,
  useCompleteTheLook,
  useProduct,
  useProductQuestions,
  useProductReviews,
} from "./api";
import styles from "./product.module.css";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" });

function Stars({ value, label }) {
  const score = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
  return <span className={styles.stars} aria-label={label ?? `${score} از ۵`}>
    {"★".repeat(score)}<span aria-hidden="true">{"☆".repeat(5 - score)}</span>
  </span>;
}

function ProductGallery({ product, images, selectedImage, setSelectedImage }) {
  return (
    <div className={styles.gallery}>
      <span className={styles.imageEdition}>BOUTIQUE · OBJECTS OF DESIRE</span>
      <div className={styles.mainImage}>
        {selectedImage?.url
          ? <img src={selectedImage.url} alt={selectedImage.alt || product.name} fetchPriority="high" />
          : <div className={styles.imageFallback} aria-label={`تصویر ${product.name} موجود نیست`}>{product.name}</div>}
      </div>
      {images.length > 1 && (
        <div className={styles.thumbnails} aria-label="تصاویر محصول">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={selectedImage?.id === image.id ? styles.thumbnailActive : styles.thumbnail}
              onClick={() => setSelectedImage(image)}
              aria-label={`نمایش تصویر ${formatNumber(index + 1)}`}
              aria-pressed={selectedImage?.id === image.id}
            >
              <img src={image.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewSection({ slug, productName, authenticated, reviews, isLoading, isError }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload) => submitProductReview(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-reviews", slug] }),
  });
  const reviewLink = `/login?next=${encodeURIComponent(`/product/${slug}`)}`;

  const submit = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      rating: Number(form.get("rating")),
      title: form.get("title"),
      body: form.get("body"),
    }, { onSuccess: () => formElement.reset() });
  };

  return (
    <section className={styles.communitySection} aria-labelledby="reviews-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>نظر مشتریان</p>
          <h2 id="reviews-title">نظرها و امتیازها</h2>
        </div>
        {reviews?.average != null && (
          <div className={styles.ratingSummary}>
            <Stars value={reviews.average} label={`${formatNumber(reviews.average)} از ۵`} />
            <strong>{formatNumber(reviews.average)}</strong>
            <span>از {formatNumber(reviews.count)} نظر</span>
          </div>
        )}
      </div>

      {isError && <p className={styles.error} role="alert">بارگذاری نظرها با خطا مواجه شد.</p>}
      {isLoading && <p className={styles.muted} role="status">در حال بارگذاری نظرها...</p>}
      {!isLoading && !isError && reviews?.results?.length === 0 && <p className={styles.muted}>هنوز نظری برای این محصول ثبت نشده است.</p>}
      {reviews?.results?.length > 0 && (
        <div className={styles.entries}>
          {reviews.results.map((review) => (
            <article key={review.id} className={styles.entry}>
              <div className={styles.entryTop}>
                <strong>{review.author}</strong>
                <time dateTime={review.created_at}>{dateFormatter.format(new Date(review.created_at))}</time>
              </div>
              <Stars value={review.rating} />
              {review.title && <h3>{review.title}</h3>}
              <p>{review.body}</p>
            </article>
          ))}
        </div>
      )}

      <div className={styles.formCard}>
        <h3>تجربه‌تان از {productName} را بنویسید</h3>
        {authenticated ? (
          <form className={styles.form} onSubmit={submit}>
            <label>امتیاز
              <select name="rating" defaultValue="5" required>
                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{formatNumber(rating)} از ۵</option>)}
              </select>
            </label>
            <label>عنوان (اختیاری)<input name="title" maxLength="120" /></label>
            <label>نظر شما<textarea name="body" minLength="3" maxLength="2000" rows="4" required /></label>
            {mutation.isError && <p className={styles.error} role="alert">ثبت نظر انجام نشد. {mutation.error?.response?.data?.detail ?? "اطلاعات را بررسی و دوباره تلاش کنید."}</p>}
            {mutation.isSuccess && <p className={styles.success} role="status">{mutation.data.detail}</p>}
            <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "در حال ثبت..." : "ثبت نظر"}</button>
          </form>
        ) : (
          <p className={styles.muted}>برای ثبت نظر <Link to={reviewLink}>وارد حساب کاربری</Link> شوید.</p>
        )}
      </div>
    </section>
  );
}

function QuestionSection({ slug, authenticated, questions, isLoading, isError }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload) => submitProductQuestion(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-questions", slug] }),
  });
  const submit = (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    mutation.mutate({ body: form.get("question") }, { onSuccess: () => formElement.reset() });
  };

  return (
    <section className={styles.communitySection} aria-labelledby="questions-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>راهنمای خرید</p>
          <h2 id="questions-title">پرسش‌های شما</h2>
        </div>
      </div>
      {isError && <p className={styles.error} role="alert">بارگذاری پرسش‌ها با خطا مواجه شد.</p>}
      {isLoading && <p className={styles.muted} role="status">در حال بارگذاری پرسش‌ها...</p>}
      {!isLoading && !isError && questions?.results?.length === 0 && <p className={styles.muted}>هنوز پرسشی برای این محصول ثبت نشده است.</p>}
      {questions?.results?.length > 0 && (
        <div className={styles.entries}>
          {questions.results.map((question) => (
            <article key={question.id} className={styles.question}>
              <div className={styles.entryTop}>
                <strong>{question.author}</strong>
                <time dateTime={question.created_at}>{dateFormatter.format(new Date(question.created_at))}</time>
              </div>
              <p>{question.body}</p>
              {question.answers.map((answer) => (
                <div key={answer.id} className={styles.answer}>
                  <strong>پاسخ بوتیک</strong>
                  <p>{answer.body}</p>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
      <div className={styles.formCard}>
        <h3>سؤالی درباره محصول دارید؟</h3>
        {authenticated ? (
          <form className={styles.form} onSubmit={submit}>
            <label>پرسش شما<textarea name="question" minLength="3" maxLength="1000" rows="3" required /></label>
            {mutation.isError && <p className={styles.error} role="alert">ثبت پرسش انجام نشد. لطفاً دوباره تلاش کنید.</p>}
            {mutation.isSuccess && <p className={styles.success} role="status">{mutation.data.detail}</p>}
            <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "در حال ثبت..." : "ثبت پرسش"}</button>
          </form>
        ) : (
          <p className={styles.muted}>برای ثبت پرسش <Link to={`/login?next=${encodeURIComponent(`/product/${slug}`)}`}>وارد حساب کاربری</Link> شوید.</p>
        )}
      </div>
    </section>
  );
}

function ProductDetail({ product, slug }) {
  const [colorSlug, setColorSlug] = useState("");
  const [sizeCode, setSizeCode] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const reviewsQuery = useProductReviews(slug);
  const questionsQuery = useProductQuestions(slug);
  const variants = product.variants ?? [];
  const images = useMemo(() => {
    const matching = product.images.filter((image) => !image.color || image.color === colorSlug);
    return matching.length ? matching : product.images;
  }, [product.images, colorSlug]);

  useEffect(() => {
    const firstImageColor = product.images.find((image) => image.color)?.color;
    const initial = variants.find((variant) => variant.color.slug === firstImageColor && variant.in_stock)
      ?? variants.find((variant) => variant.in_stock)
      ?? variants[0];
    setColorSlug(initial?.color.slug ?? product.colors?.[0]?.slug ?? "");
    setSizeCode(initial?.size.code ?? "");
    setSelectedImage(null);
  }, [product, variants]);

  useEffect(() => {
    if (selectedImage && !images.some((image) => image.id === selectedImage.id)) setSelectedImage(null);
  }, [images, selectedImage]);

  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const selectedVariant = variants.find((variant) => variant.color.slug === colorSlug && variant.size.code === sizeCode);
  const selectedColor = colors.find((color) => color.slug === colorSlug);
  const selectedSize = sizes.find((size) => size.code === sizeCode);
  const cartKey = `${product.id}:${colorSlug}:${sizeCode}`;
  const cartQuantity = cartItems.find((item) => item.key === cartKey)?.quantity ?? 0;
  const availableSizes = new Set(variants.filter((variant) => variant.color.slug === colorSlug && variant.in_stock).map((variant) => variant.size.code));
  const currentPrice = selectedVariant?.price ?? product.final_price;
  const priceOverride = selectedVariant && Number(selectedVariant.price) !== Number(product.final_price);
  const imagesForColor = images.length ? images : product.images;

  return (
    <>
      <div className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
          <Link to="/">خانه</Link><span aria-hidden="true">/</span>
          <Link to="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className={styles.product}>
          <ProductGallery product={product} images={imagesForColor} selectedImage={selectedImage ?? imagesForColor[0]} setSelectedImage={setSelectedImage} />
          <section className={styles.details} aria-labelledby="product-title">
            <p className={styles.editorialNote}>THE BOUTIQUE EDIT · {formatNumber(product.id).padStart(2, "0")}</p>
            <span className={styles.editorialRule} aria-hidden="true" />
            {product.brand && <p className={styles.brand}>{product.brand.name}</p>}
            <h1 id="product-title">{product.name}</h1>
            <p className={styles.category}>{product.category?.name}</p>
            {product.discount_percent > 0 && <span className={styles.discount}>{formatNumber(product.discount_percent)}٪ تخفیف</span>}
            <div className={styles.price}>
              {product.discount_percent > 0 && !priceOverride && <del>{formatPrice(product.price)}</del>}
              <strong>{formatPrice(currentPrice)}</strong>
              {selectedVariant && !selectedVariant.in_stock && <span className={styles.unavailable}>این ترکیب ناموجود است</span>}
            </div>

            {colors.length > 0 && (
              <fieldset className={styles.choiceGroup}>
                <legend>رنگ: {colors.find((color) => color.slug === colorSlug)?.name}</legend>
                <div className={styles.colorOptions}>
                  {colors.map((color) => (
                    <label key={color.slug} className={styles.colorOption} title={color.name}>
                      <input type="radio" name="product-color" value={color.slug} checked={colorSlug === color.slug}
                        onChange={() => {
                          setColorSlug(color.slug);
                          setSizeCode(variants.find((variant) => variant.color.slug === color.slug && variant.in_stock)?.size.code ?? "");
                          setSelectedImage(null);
                        }} />
                      <span style={{ "--swatch": color.hex }} />
                      <span className="sr-only">{color.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {sizes.length > 0 && (
              <fieldset className={styles.choiceGroup}>
                <legend>سایز</legend>
                <div className={styles.sizeOptions}>
                  {sizes.map((size) => {
                    const available = availableSizes.has(size.code);
                    return (
                      <label key={size.code} className={available ? styles.sizeOption : styles.sizeUnavailable}>
                        <input type="radio" name="product-size" value={size.code} disabled={!available}
                          checked={sizeCode === size.code} onChange={() => setSizeCode(size.code)} />
                        <span>{size.name || size.code}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {selectedVariant?.in_stock
              ? <p className={styles.stock}>موجود · {formatNumber(selectedVariant.available)} عدد</p>
              : <p className={styles.unavailable}>این ترکیب فعلاً موجود نیست</p>}
            <button
              type="button"
              className={styles.addToCart}
              disabled={!selectedVariant?.in_stock || cartQuantity >= (selectedVariant?.available ?? 0)}
              onClick={() => addItem({
                key: cartKey,
                productId: product.id,
                variantId: selectedVariant.id,
                slug: product.slug,
                name: product.name,
                image: imagesForColor[0]?.url ?? product.image,
                colorName: selectedColor?.name ?? "",
                sizeName: selectedSize?.name ?? selectedSize?.code ?? "",
                unitPrice: Number(currentPrice),
                originalPrice: Math.max(Number(product.price), Number(currentPrice)),
                maxQuantity: selectedVariant?.available ?? 0,
              })}
            >
              {!selectedVariant?.in_stock
                ? "این ترکیب ناموجود است"
                : cartQuantity >= (selectedVariant?.available ?? 0)
                  ? "حداکثر موجودی در سبد خرید است"
                  : "افزودن به سبد خرید"}
            </button>
            <WishlistButton product={product} className={styles.wishlistDetail}>
              {(saved) => saved ? "ذخیره‌شده در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            </WishlistButton>

            <dl className={styles.specs}>
              {product.material && <><dt>جنس</dt><dd>{product.material}</dd></>}
              {product.construction && <><dt>جزئیات</dt><dd>{product.construction}</dd></>}
              {product.country_of_origin && <><dt>کشور سازنده</dt><dd>{product.country_of_origin}</dd></>}
              {product.model_size && <><dt>سایز مدل</dt><dd>{product.model_size}{product.model_height_cm ? ` · قد مدل ${formatNumber(product.model_height_cm)} سانتی‌متر` : ""}</dd></>}
            </dl>
          </section>
        </div>

        {product.description && (
          <section className={styles.description} aria-labelledby="description-title">
            <p className={styles.eyebrow}>جزئیات بیشتر</p>
            <h2 id="description-title">درباره محصول</h2>
            <p>{product.description}</p>
            {product.collections?.length > 0 && (
              <p className={styles.collections}>
                کالکشن‌ها: {product.collections.map((collection, index) => (
                  <span key={collection.slug}><Link to={`/shop?collection=${encodeURIComponent(collection.slug)}`}>{collection.name}</Link>{index < product.collections.length - 1 ? "، " : ""}</span>
                ))}
              </p>
            )}
          </section>
        )}
      </div>
      <div className={styles.community}>
        <ReviewSection
          slug={slug}
          productName={product.name}
          authenticated={authenticated}
          reviews={reviewsQuery.data}
          isLoading={reviewsQuery.isLoading}
          isError={reviewsQuery.isError}
        />
        <QuestionSection
          slug={slug}
          authenticated={authenticated}
          questions={questionsQuery.data}
          isLoading={questionsQuery.isLoading}
          isError={questionsQuery.isError}
        />
      </div>
      <CompleteTheLook slug={slug} />
    </>
  );
}

function CompleteTheLook({ slug }) {
  const { data, isLoading, isError } = useCompleteTheLook(slug);
  if (isError) return <p className={styles.error} role="alert">بارگذاری پیشنهادهای مرتبط با خطا مواجه شد.</p>;
  if (!isLoading && !data?.length) return null;
  return (
    <section className={styles.related} aria-labelledby="related-title">
      <p className={styles.eyebrow}>استایل کامل</p>
      <h2 id="related-title">برای تکمیل این استایل</h2>
      <div className={styles.relatedGrid}>
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <div key={index} className={styles.relatedSkeleton} aria-hidden="true" />)
          : data.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

export default function ProductPage() {
  const { slug } = useRouteParams();
  const { data: product, isLoading, isError } = useProduct(slug);
  if (isLoading) return <section className={styles.state} role="status">در حال بارگذاری محصول...</section>;
  if (isError) return <section className={styles.state} role="alert">بارگذاری محصول با خطا مواجه شد. لطفاً دوباره تلاش کنید.</section>;
  if (!product) return <section className={styles.state} role="status">محصول موردنظر پیدا نشد.</section>;
  return <ProductDetail key={product.slug} product={product} slug={slug} />;
}
