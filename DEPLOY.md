# راهنمای انتشار و همگام‌سازی Persian Calendar

این سند فرآیند انتشار سورس **Persian Calendar v1.0.0** در GitHub و همگام‌سازی فایل‌های اجرایی با Google Apps Script را برای توسعه‌دهندگان توضیح می‌دهد. برای نصب دستی توسط کاربران، به [INSTALL.md](INSTALL.md) مراجعه کنید.

## ۱. تفکیک انتشار سورس و نصب در Google Sheets

انتشار پروژه در مخزن GitHub تنها کد، آزمون‌ها و مستندات را در دسترس قرار می‌دهد. این فرآیند ابزار را به‌صورت خودکار در یک Spreadsheet نصب نمی‌کند.

برای اجرای برنامه، فایل‌های ساخته‌شده در `dist/` باید به پروژه **Google Apps Script متصل به همان Spreadsheet** منتقل شوند. این کار با نصب دستی یا ابزار خط فرمان `clasp` انجام می‌شود.

GitHub Pages محیط اجرای سرویس `SpreadsheetApp` نیست و برای اجرای مستقیم این ابزار کاربرد ندارد.

## ۲. پیش‌نیازها

- Git و Node.js نسخه ۲۰ یا جدیدتر باید نصب شده باشند.
- حساب Google باید دسترسی ویرایش به Spreadsheet مقصد و پروژه Apps Script مرتبط داشته باشد.
- برای استفاده از `clasp`، Google Apps Script API باید در صفحه https://script.google.com/home/usersettings فعال شده باشد.
- شناسه **Script ID** باید از قسمت **Project Settings** در ویرایشگر Apps Script دریافت شود. Script ID با شناسه Spreadsheet متفاوت است.

## ۳. انتشار سورس در GitHub

ابتدا یک مخزن خالی در حساب GitHub ایجاد کنید. سپس دستورهای زیر را از ریشه پروژه اجرا کنید:

```bash
git init
git add .
git commit -m "Initial release: Persian Calendar v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

مقادیر `YOUR_USERNAME` و `YOUR_REPOSITORY` باید با مشخصات مخزن واقعی جایگزین شوند. پیش از اجرای `git add .`، بررسی کنید که فایل‌های دارای اطلاعات حساب یا دسترسی در مسیر پروژه قرار نگرفته باشند.

**این نسخه دارای GitHub Actions نیست.** کنترل کیفیت خودکار در سرویس GitHub اجرا نمی‌شود و باید آزمون‌های پروژه پیش از Commit یا انتشار به‌صورت محلی اجرا شوند.

## ۴. ساخت و بررسی فایل‌های اجرایی

در ریشه مخزن دستور زیر را اجرا کنید:

```bash
npm run check
```

این دستور ابتدا خروجی `dist/` را می‌سازد، سپس آزمون‌های محلی و بررسی نحوی فایل‌های اجرایی را انجام می‌دهد. قبولی این آزمون‌ها جایگزین بررسی عملکرد در Google Sheets واقعی نیست.

## ۵. اتصال `clasp` به پروژه موجود

ابتدا از پروژه Apps Script فعلی نسخه پشتیبان تهیه کنید، زیرا عملیات Push می‌تواند فایل‌های آنلاین را با خروجی محلی جایگزین کند.

پس از آن، فرمان ورود به حساب Google را اجرا کنید:

```bash
npx @google/clasp login
```

در macOS و Linux نمونه پیکربندی را کپی کنید:

```bash
cp .clasp.example.json .clasp.json
```

در Windows PowerShell از فرمان زیر استفاده کنید:

```powershell
Copy-Item .clasp.example.json .clasp.json
```

سپس مقدار `scriptId` را در فایل محلی `.clasp.json` با شناسه پروژه Apps Script مقصد جایگزین کنید:

```json
{
  "scriptId": "YOUR_EXISTING_APPS_SCRIPT_SCRIPT_ID",
  "rootDir": "dist"
}
```

برای همگام‌سازی کد دستور زیر را اجرا کنید:

```bash
npm run push
```

این دستور ابتدا آزمون‌های محلی را اجرا می‌کند و سپس فایل‌های `dist/` را با پروژه Apps Script مقصد همگام می‌کند. پس از پایان عملیات، Spreadsheet را مجدداً بارگذاری کنید و مراحل اعتبارسنجی موجود در [INSTALL.md](INSTALL.md) را انجام دهید.

فایل‌های `.clasp.json`، `.clasprc.json` و سایر داده‌های احراز هویت نباید در مخزن عمومی یا خروجی گزارش‌ها منتشر شوند.

## ۶. ساخت بسته نصب و اولین GitHub Release

پس از موفقیت آزمون‌های موجود در [tests/acceptance-cases.md](tests/acceptance-cases.md)، دستور زیر را اجرا کنید:

```bash
npm run package
```

این دستور Build و تست را اجرا می‌کند و **یک بسته نصب** در `release-output/` می‌سازد:

`Persian-Calendar-v1.0.0-Install.zip`

ساختار ZIP شامل `src/Code.gs`، `src/Calendar.html`، `src/Settings.html`، `GUIDE.html` و `LICENSE` است. پوشه `src/` در این بسته فقط برای نظم‌دادن به **فایل‌های آماده نصب** استفاده می‌شود و با سورس ماژولار `src/` مخزن تفاوت دارد. این فایل‌های اجرایی از `dist/` مخزن تولید می‌شوند.

راهنمای فارسی و آفلاین‌خوان `GUIDE.html` از `release/GUIDE.html` گرفته می‌شود. راهنماهای `INSTALL.md` و `HELP.md` برای مطالعه در GitHub نگهداری می‌شوند و داخل ZIP نصب قرار نمی‌گیرند.

بسته خروجی در GitHub Commit نمی‌شود و در بخش **Assets** انتشار قرار می‌گیرد. فایل `scripts/release-contract.json` فهرست مجاز محتوای بسته را تعیین می‌کند.

برای اولین انتشار، تگ `v1.0.0` را روی Commit تأییدشده بسازید و **یک فایل ZIP نصب** را به GitHub Release پیوست کنید. آرشیوهای خودکار Source code که GitHub می‌سازد، جایگزین این فایل نصب نیستند.

## ۷. منابع رسمی

- [Google Apps Script — clasp](https://developers.google.com/apps-script/guides/clasp)
- [Google Apps Script — Triggers](https://developers.google.com/apps-script/guides/triggers)
- [HTML Service — Client-to-server communication](https://developers.google.com/apps-script/guides/html/communication)
