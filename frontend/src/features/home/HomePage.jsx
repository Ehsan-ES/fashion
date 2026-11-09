import BestSellers from "./sections/BestSellers";
import FeaturedCollections from "./sections/FeaturedCollections";
import FeaturedProducts from "./sections/FeaturedProducts";
import Hero from "./sections/Hero";
import NewArrivals from "./sections/NewArrivals";
import ShopByCategory from "./sections/ShopByCategory";
import SpecialOffers from "./sections/SpecialOffers";

/**
 * صفحه اصلی. بخش‌های Editorial، Recently Viewed، Recommended، Newsletter و گالری اینستاگرام
 * همراه مراحل ۱۲ و ۱۵ (جستجو/پیشنهاد و مدیریت محتوا) اضافه می‌شوند.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <NewArrivals />
      <FeaturedCollections />
      <ShopByCategory />
      <BestSellers />
      <SpecialOffers />
      <FeaturedProducts />
    </>
  );
}
