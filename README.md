
  # Persian Calendar for Google Sheets
<div dir="rtl">
  
**مبدل تاریخ جلالی برای Google Sheets**

ابزار **Persian Calendar** مبتنی بر **Google Apps Script** است و امکان درج تاریخ امروز، تبدیل تاریخ‌های میلادی به جلالی و یکدست‌سازی خودکار ورودی‌های تاریخ در ستون‌های تعیین‌شده را فراهم می‌کند. این ابزار در محیط Google Sheets اجرا می‌شود و برای تبدیل تاریخ به سرویس بیرونی وابسته نیست.

[![Version](https://img.shields.io/github/v/release/aliwithgrain/persian-calendar-sheets?label=Version&style=flat-square&color=0969da&labelColor=555555)](https://github.com/aliwithgrain/persian-calendar-sheets/releases/latest) [![MIT License](https://img.shields.io/badge/License-MIT-e5b567?style=flat-square&labelColor=555555)](LICENSE) ![Google Apps Script](https://img.shields.io/badge/Platform-Google%20Apps%20Script-e98e1d?style=flat-square&labelColor=555555) ![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=F7DF1E&labelColor=555555) [![Download Latest Release](https://img.shields.io/badge/Download-Latest%20Release-238636?style=flat-square&logo=github&logoColor=white&labelColor=555555)](https://github.com/aliwithgrain/persian-calendar-sheets/releases/latest)


## دریافت و نصب

بسته نصب را از بخش **Assets** دریافت کنید. این بسته شامل فایل‌های `Code.gs` و `Settings.html` در پوشه `src/`، راهنمای فارسی `GUIDE.html` و مجوز `LICENSE` است.

## امکانات

پس از نصب و بارگذاری مجدد فایل، منوی **Persian Calendar** به Google Sheets اضافه می‌شود.


### فرمان‌ها
| فرمان | عملکرد |
| ---: | ---: |
| **Insert Today** | تاریخ جلالی امروز را بر اساس منطقه زمانی فایل درج می‌کند |
| **Convert Selection** | تاریخ‌های معتبر را در محدوده انتخاب‌شده به جلالی تبدیل یا از نظر قالب یکدست می‌کند |
| **Set as Persian Date Column** | ستون‌های انتخاب‌شده را برای تبدیل خودکار تاریخ‌های جدید ثبت می‌کند و مقادیر قبلی را تغییر نمی‌دهد |
| **Settings** | تنظیمات تبدیل و ستون‌های ثبت‌شده را در پنل کناری مدیریت می‌کند |


### نمونه‌های تبدیل

خروجی‌های زیر با قالب عددی و ارقام فارسی نمایش داده شده‌اند:

| ورودی | خروجی |
| ---: | ---: |
| `Wednesday,28 May 2025` | `۱۴۰۴/۰۳/۰۷` |
| `monday,16 december 2024` | `۱۴۰۳/۰۹/۲۶` |
| `Monday,14 April 2025` | `۱۴۰۴/۰۱/۲۵` |
| `2026/10/18` | `۱۴۰۵/۰۷/۲۶` |
| `1405/7/26` | `۱۴۰۵/۰۷/۲۶` |
| `03/04/2026` | بدون تغییر؛ این تاریخ در حالت پیش‌فرض مبهم است |

نام روز هفته، در صورت وجود، اعتبارسنجی می‌شود. تاریخ‌های نامعتبر یا ناشناخته به‌صورت پیش‌فرض تغییر نمی‌کنند.


### تنظیمات

| گزینه | انتخاب‌های در دسترس |
| ---: | ---: |
| قالب تاریخ | عددی یا نوشتاری با نام ماه فارسی |
| ارقام | فارسی یا لاتین |
| تاریخ‌های کوتاه مبهم | بدون تبدیل (پیش‌فرض)، `DMY` یا `MDY` |
| تبدیل خودکار | فعال یا غیرفعال برای ستون‌های ثبت‌شده |

تنظیمات در سطح فایل Google Sheets مشترک هستند.


### توابع محاسباتی

سه تابع سفارشی برای استفاده در فرمول‌های Google Sheets ارائه شده‌اند:

| تابع | کاربرد |
| ---: | ---: |
| `JALALI_SERIAL(dateText)` | تاریخ جلالی را به شماره روز قابل محاسبه تبدیل می‌کند |
| `JALALI_DIFF(startDate, endDate)` | اختلاف دو تاریخ را بر حسب روز محاسبه می‌کند |
| `JALALI_ADD(dateText, days)` | تعداد روز تعیین‌شده را به تاریخ جلالی اضافه می‌کند یا از آن کم می‌کند |

برای نمونه، فرمول `=JALALI_DIFF("۱۴۰۵/۰۷/۰۱", "۱۴۰۵/۰۷/۱۰")` مقدار `9` را برمی‌گرداند. جداکننده آرگومان‌ها ممکن است با توجه به تنظیمات منطقه‌ای فایل `,` یا `;` باشد.

## رفتار تبدیل و حفاظت از داده‌ها

- تبدیل فقط روی محدوده انتخاب‌شده یا ستون‌هایی اجرا می‌شود که کاربر برای تبدیل خودکار ثبت کرده است.
- تاریخ‌های مبهم، نامعتبر و ناشناخته در تنظیمات پیش‌فرض بدون تغییر باقی می‌مانند.
- فرمول‌ها، چک‌باکس‌ها، سلول‌های دارای اعتبارسنجی داده، سلول‌های ادغام‌شده یا محافظت‌شده و متن‌های غیرتاریخی نباید بازنویسی شوند.
- برنامه قابلیت پشتیبان‌گیری و بازیابی اختصاصی ندارد. برای بررسی یا بازیابی نسخه‌های قبلی می‌توان از `File → Version history → See version history` استفاده کرد؛ بااین‌حال، بازیابی نسخه قدیمی ممکن است تغییرات دیگر فایل را نیز برگرداند.

## محدودیت‌ها

- تاریخ جلالی در سلول‌ها به‌صورت **متن** ذخیره می‌شود، نه مقدار Date بومی Google Sheets. برای محاسبه یا مرتب‌سازی زمانی می‌توان از توابع اختصاصی یا ستون کمکی استفاده کرد.
- موتور تقویم سال‌های جلالی **۱۲۰۰ تا ۱۶۰۰** را پشتیبانی می‌کند و تاریخ‌های دارای ساعت را به‌طور خودکار تبدیل نمی‌کند.
- هر اجرای `Convert Selection` حداکثر **۲۵٬۰۰۰ سلول** را بررسی و **۳٬۰۰۰ مقدار** را تبدیل می‌کند. تبدیل خودکار نیز رویدادهای ویرایش بیش از **۳٬۰۰۰ سلول** را پردازش نمی‌کند؛ در این حالت می‌توان از فرمان دستی `Convert Selection` استفاده کرد.
- این ابزار به‌عنوان افزونه Google Workspace Marketplace نصب نمی‌شود.

## مستندات

| محتوا | راهنما |
| ---: | ---: |
| نصب، به‌روزرسانی و رفع مشکلات راه‌اندازی | **[INSTALL.md](INSTALL.md)** |
| راهنمای استفاده از فرمان‌ها، تنظیمات و توابع | **[HELP.md](HELP.md)** |
| ساخت، آزمایش و انتشار پروژه برای توسعه‌دهندگان | **[DEPLOY.md](DEPLOY.md)** |
</div>

---

**English:** A Gregorian-to-Jalali date converter for Google Sheets, with customizable formats, selection-based conversion and automatic conversion in registered columns.

**License:** MIT. Copyright © 2026 aliwithgrain.
