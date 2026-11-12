import { useWishlistStore } from "./useWishlistStore";

const toWishlistProduct = (product) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  brand: product.brand ?? null,
  price: product.price ?? product.final_price,
  sale_price: product.sale_price ?? null,
  final_price: product.final_price ?? product.sale_price ?? product.price,
  discount_percent: product.discount_percent ?? 0,
  is_new: Boolean(product.is_new),
  is_best_seller: Boolean(product.is_best_seller),
  in_stock: Boolean(product.in_stock),
  image: product.images?.[0]?.url ?? product.image ?? null,
  hover_image: product.images?.[1]?.url ?? product.hover_image ?? null,
  colors: product.colors ?? [],
});

export default function WishlistButton({ product, className = "", children }) {
  const saved = useWishlistStore((state) => state.items.some((item) => item.id === product.id));
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const label = saved
    ? `حذف ${product.name} از علاقه‌مندی‌ها`
    : `افزودن ${product.name} به علاقه‌مندی‌ها`;

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={saved}
      data-saved={saved ? "true" : "false"}
      onClick={() => toggleItem(toWishlistProduct(product))}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
      </svg>
      {typeof children === "function" ? children(saved) : children}
    </button>
  );
}
