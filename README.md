# Fashion Boutique — مرحله ۱: اسکلت پروژه

## نصب و اجرا
```bash
cp backend/.env.example backend/.env      # SECRET_KEY را تغییر دهید
cp frontend/.env.example frontend/.env
docker compose up --build
```
- API: http://localhost:8000/api/health/
- مستندات: http://localhost:8000/api/docs/
- فرانت: http://localhost:5173

> هنوز `migrate` نزنید؛ مدل User سفارشی در مرحله ۲ قبل از اولین migrate اضافه می‌شود.

## تست
```bash
docker compose run --rm backend pytest
docker compose run --rm frontend npm test
```

## مرحله ۳: کاتالوگ
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_catalog        # داده نمونه (با تصاویر Placeholder)
docker compose exec backend pytest
```
- API: `/api/products/` · `/api/products/filters/` · `/api/categories/` · `/api/brands/` · `/api/collections/`
- ادمین: `/admin/` ← محصولات (تصاویر، Variantها و موجودی در همان صفحه محصول)

## مرحله ۴: Layout فرانت
```bash
docker compose up -d --build --renew-anon-volumes frontend   # وابستگی‌های جدید: framer-motion, gsap, lenis
docker compose exec backend python manage.py seed_catalog     # تصویر دسته‌ها/کالکشن‌ها برای Mega Menu
docker compose exec frontend npm test
```

## مرحله ۴b: Vike (Routing)
```bash
docker compose exec frontend npm install vike vike-react     # قبل از استخراج فایل‌های جدید
# فایل‌ها را استخراج کنید، سپس:
docker compose restart frontend
docker compose exec frontend npm uninstall react-router-dom
docker compose exec frontend npm test
```
فایل‌های حذفی: `frontend/index.html`، `src/main.jsx`، `src/app/App.jsx`، `src/app/App.test.jsx`، `src/features/home/HomePlaceholder.jsx`

## مرحله ۵: صفحه اصلی
```bash
docker compose exec frontend npm install three @react-three/fiber
docker compose restart frontend
docker compose exec frontend npm test
```
