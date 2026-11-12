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

## مرحله ۶: فروشگاه
- `/shop` از API کاتالوگ استفاده می‌کند؛ فیلترها و مرتب‌سازی در query string نگه‌داری می‌شوند.
- فیلترهای موبایل در Drawer و محصولات در گرید نامتقارن نمایش داده می‌شوند.
- API محصولات: `/api/products/` و گزینه‌های فیلتر: `/api/products/filters/`

## مرحله ۷: جزئیات محصول، نظرها و پرسش‌ها
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend pytest tests/test_catalog.py
docker compose exec frontend npm test
```
- صفحه محصول: `/product/<slug>`؛ شامل گالری، رنگ/سایز، مشخصات، محصولات مرتبط، نظرها و پرسش‌وپاسخ.
- ارسال نظر و پرسش نیازمند ورود است؛ انتشار آن‌ها و پاسخ‌ها پس از تأیید مدیر در `/admin/` انجام می‌شود.
- APIهای مرتبط: `/api/products/<slug>/complete-the-look/`، `/reviews/` و `/questions/`

## مرحله ۸: سبد خرید و تخفیف
- `/cart` سبد خرید را در مرورگر نگه‌داری می‌کند؛ می‌توان تعداد را تغییر داد یا کالا را حذف کرد.
- افزودن محصول از صفحه جزئیات، رنگ/سایز انتخاب‌شده و موجودی همان ترکیب را در نظر می‌گیرد و مینی‌سبد را باز می‌کند.
- تخفیف قیمت محصول در جمع سبد لحاظ می‌شود؛ کد `WELCOME10` ده درصد تخفیف می‌دهد و `STYLE15` برای سبدهای حداقل ۵ میلیون تومان معتبر است.
- جمع‌های نمایشی سمت کاربر هستند؛ endpoint ثبت سفارش در سرور قیمت، کوپن و موجودی را دوباره بررسی می‌کند.
- نوبار دسکتاپ و موبایل لینک مستقیم «همه فروشگاه» دارد.
- صفحه `/wishlist` علاقه‌مندی‌ها را در مرورگر ذخیره می‌کند؛ با دکمه قلب در کارت یا جزئیات محصول می‌توان موردی را اضافه یا حذف کرد.

## مرحله ۹: ثبت سفارش
- مسیر `/checkout` برای کاربران واردشده، اطلاعات گیرنده و نشانی را می‌گیرد و به `POST /api/orders/` می‌فرستد.
- سرور شناسه Variantها و تعداد را می‌پذیرد، قیمت را از کاتالوگ می‌خواند، کوپن‌های `WELCOME10` و `STYLE15` را اعتبارسنجی می‌کند و موجودی را در تراکنش رزرو می‌کند.
- در checkout مالیاتی اضافه نمی‌شود؛ مبلغ نهایی برابر قیمت کالاها پس از تخفیف محصول و کد تخفیف است. مبلغ نهاییِ مورد اعتماد، مبلغ محاسبه‌شده در سرور و درج‌شده در پیش‌فاکتور است. سفارش‌های قدیمی با جمع ثبت‌شده‌ی خود نگه‌داری می‌شوند تا سابقه‌ی مالی آن‌ها تغییر نکند.
- فاکتور قابل چاپ پس از ثبت سفارش نشان داده می‌شود. تا تأیید درگاه، سند «پیش‌فاکتور» است؛ پس از بازگشت از درگاه وضعیت پرداخت و شماره پیگیری در سفارش‌های حساب کاربر دیده می‌شود.
- اتصال زرین‌پال با این متغیرها در `backend/.env` تنظیم می‌شود:
  ```env
  ZARINPAL_MERCHANT_ID=
  ZARINPAL_SANDBOX=True
  ZARINPAL_CALLBACK_URL=https://api.example.com/api/payments/zarinpal/callback/
  FRONTEND_URL=https://shop.example.com
  ```
  تا وقتی Merchant ID و callback عمومی تنظیم نشده باشند، پرداخت غیرفعال است و API خطای روشن برمی‌گرداند؛ پرداخت موفق ساختگی ثبت نمی‌شود. برای محیط واقعی، `ZARINPAL_SANDBOX=False`، دامنه‌های واقعی و callback عمومی HTTPS لازم است. مبلغ‌های قیمت فروشگاه تومان‌اند و پیش از ارسال به زرین‌پال به ریال تبدیل می‌شوند.
- کاربر فقط سفارش‌های خودش را می‌بیند و سفارش در انتظار پرداخت را، به شرط نداشتن تراکنش فعال، می‌تواند لغو کند. پرداخت سمت سرور تأیید می‌شود و موجودی فقط پس از تأیید درگاه قطعی می‌شود.
- گزارش ادمین در `/admin/orders/order/accounting/` خلاصه فروش، مبلغ وصول‌شده، شمار و وضعیت سفارش‌ها، میانگین سفارش، تخفیف‌ها، روند ماهانه، کالاها و Variantهای پرفروش و جزئیات هر سفارش را نشان می‌دهد و CSV کامل دارد. پوسته‌ی ادمین تیره با رنگ‌های خوانا دارد و از انتخاب‌گر تم خود Django برای جابه‌جایی به حالت روشن پشتیبانی می‌کند. سود فقط برای سفارش‌هایی محاسبه می‌شود که بهای تمام‌شده‌ی همه‌ی Variantهایشان ثبت شده باشد؛ این رقم سود ناخالص است و هزینه‌هایی مثل ارسال، مرجوعی و هزینه‌های عملیاتی را کم نمی‌کند. جمع سفارش‌های قدیمی با ارقام زمان ثبتشان حفظ می‌شود.
- بهای تمام‌شده را برای هر Variant در صفحه‌ی مدیریت محصول وارد کنید. مقدار در زمان checkout در قلم سفارش snapshot می‌شود؛ سفارش‌های قدیمی بدون بهای ثبت‌شده، سود ناقص دارند و حدس زده نمی‌شود.
- برای اجرای تغییر مدل در محیط‌های دیگر: `docker compose exec backend python manage.py migrate`.

## شوروم مجازی
- مسیر `/showroom` یک فضای بوتیک سه‌بعدی تعاملی با استندهای انتخاب‌پذیر و لینک مستقیم به جزئیات محصول دارد.
- برای چرخاندن صحنه از دکمه‌های فلش استفاده کنید؛ اگر WebGL در دستگاه پشتیبانی نشود، فهرست انتخاب محصول همچنان در دسترس است.
- رنگ تأکیدی زرشکی (`--oxblood`) در کنار طلایی و خنثی‌های هویت بصری استفاده شده است.
