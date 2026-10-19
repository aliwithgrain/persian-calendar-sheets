/** Persian Calendar — Pure calendar math; no service calls in parsers. */
const PC_MONTHS_ = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const PC_MS_DAY_ = 86400000;
const PC_SHEETS_EPOCH_ = Date.UTC(1899, 11, 30) / PC_MS_DAY_;
const PC_MIN_YEAR_ = 1200;
const PC_MAX_YEAR_ = 1600;
const PC_INTL_ = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone:'UTC', year:'numeric', month:'numeric', day:'numeric'
});
const PC_NEW_YEAR_ = Object.create(null);

function pcLatin_(x) {
  return String(x).replace(/[۰-۹]/g, c => String(c.charCodeAt(0)-1776))
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0)-1632));
}
function pcDigits_(x, settings) {
  const s = String(x);
  return settings && settings.digits === 'latin' ? s : s.replace(/[0-9]/g, c => '۰۱۲۳۴۵۶۷۸۹'[Number(c)]);
}
function pcClean_(x) {
  return pcLatin_(x).replace(/[\u200b\u200c\u200d\u200e\u200f\ufeff\u2066-\u2069]/g,'')
    .replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}
function pcParts_(epoch) {
  const p = PC_INTL_.formatToParts(new Date(epoch * PC_MS_DAY_));
  function v(k) { const item = p.find(x => x.type === k); return item ? Number(item.value) : NaN; }
  return {y:v('year'), m:v('month'), d:v('day')};
}
function pcNewYear_(year) {
  if (!Number.isInteger(year) || year < PC_MIN_YEAR_ || year > PC_MAX_YEAR_+1)
    throw new Error('سال شمسی خارج از محدودهٔ پشتیبانی است.');
  if (Object.prototype.hasOwnProperty.call(PC_NEW_YEAR_,year)) return PC_NEW_YEAR_[year];
  for (let d=16; d<=25; d++) {
    const n = Date.UTC(year+621,2,d) / PC_MS_DAY_;
    const p = pcParts_(n);
    if (p.y === year && p.m === 1 && p.d === 1) return (PC_NEW_YEAR_[year]=n);
  }
  throw new Error('مبدأ سال شمسی در این محیط پیدا نشد.');
}
function pcMonthLength_(y,m) {
  if (!Number.isInteger(m) || m<1 || m>12) throw new Error('ماه نامعتبر است.');
  return m<=6 ? 31 : m<=11 ? 30 : pcNewYear_(y+1)-pcNewYear_(y)-336;
}
function pcToDay_(y,m,d) {
  if (!Number.isInteger(y) || y<PC_MIN_YEAR_ || y>PC_MAX_YEAR_ ||
      !Number.isInteger(m) || m<1 || m>12 || !Number.isInteger(d) ||
      d<1 || d>pcMonthLength_(y,m)) throw new Error('تاریخ شمسی نامعتبر است.');
  const epoch = pcNewYear_(y)+(m<=6 ? (m-1)*31 : 186+(m-7)*30)+d-1;
  const check=pcParts_(epoch);
  if (check.y!==y || check.m!==m || check.d!==d) throw new Error('تاریخ شمسی با تقویم محیط سازگار نیست.');
  return epoch;
}
function pcValidJalali_(y,m,d) {
  try { pcToDay_(y,m,d); return {y:y,m:m,d:d}; } catch(e) { return null; }
}
function pcFromGregorian_(y,m,d) {
  if (!Number.isInteger(y) || y<1601 || y>2221 || !Number.isInteger(m) ||
      m<1 || m>12 || !Number.isInteger(d) || d<1 || d>31) return null;
  const t=Date.UTC(y,m-1,d), obj=new Date(t);
  if (obj.getUTCFullYear()!==y || obj.getUTCMonth()!==m-1 || obj.getUTCDate()!==d) return null;
  const p=pcParts_(t/PC_MS_DAY_);
  return p.y>=PC_MIN_YEAR_ && p.y<=PC_MAX_YEAR_ ? p : null;
}
function pcFormat_(p, settings) {
  if (!p) throw new Error('تاریخ نامعتبر است.');
  const opt=settings || {format:'numeric',digits:'persian'};
  if (opt.format==='long') return pcDigits_(p.d+' '+PC_MONTHS_[p.m-1]+' '+p.y,opt);
  const s=String(p.y).padStart(4,'0')+'/'+String(p.m).padStart(2,'0')+'/'+String(p.d).padStart(2,'0');
  return pcDigits_(s,opt);
}
function pcParseJalali_(s) {
  const x=pcClean_(s);
  const numeric=/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/.exec(x);
  let p;
  if (numeric) p={y:Number(numeric[1]),m:Number(numeric[2]),d:Number(numeric[3])};
  else {
    const long=/^(\d{1,2})\s+([^\d]+?)\s+(\d{4})$/.exec(x);
    if (!long) throw new Error('فرمت تاریخ شمسی معتبر نیست.');
    const m=PC_MONTHS_.indexOf(long[2])+1;
    p={y:Number(long[3]),m:m,d:Number(long[1])};
  }
  pcToDay_(p.y,p.m,p.d);
  return p;
}
function pcToday_() {
  const tz=SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const bits=Utilities.formatDate(new Date(),tz,'yyyy-MM-dd').split('-').map(Number);
  const p=pcFromGregorian_(bits[0],bits[1],bits[2]);
  if (!p) throw new Error('تاریخ امروز خارج از محدودهٔ پشتیبانی است.');
  return p;
}

/** @customfunction */
function JALALI_SERIAL(dateText) {
  if (dateText===null || dateText==='') return '';
  const p=pcParseJalali_(dateText);
  return pcToDay_(p.y,p.m,p.d)-PC_SHEETS_EPOCH_;
}
/** @customfunction */
function JALALI_DIFF(startDate,endDate) {
  if (startDate===null || startDate==='' || endDate===null || endDate==='') return '';
  return JALALI_SERIAL(endDate)-JALALI_SERIAL(startDate);
}
/** @customfunction */
function JALALI_ADD(dateText, days) {
  if (dateText===null || dateText==='' || days===null || days==='') return '';
  const offset=Number(days);
  if (!Number.isInteger(offset)) throw new Error('تعداد روز باید صحیح باشد.');
  const p=pcParseJalali_(dateText);
  const result=pcParts_(pcToDay_(p.y,p.m,p.d)+offset);
  if (result.y<PC_MIN_YEAR_ || result.y>PC_MAX_YEAR_) throw new Error('خارج از محدودهٔ پشتیبانی است.');
  return pcFormat_(result); // custom function remains canonical regardless of UI preferences
}
