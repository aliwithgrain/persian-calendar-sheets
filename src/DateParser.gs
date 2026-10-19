/** Deterministic classifier. Never writes and never guesses short numeric dates. */
const PC_EN_MONTHS_ = {
  january:1,jan:1, february:2,feb:2, march:3,mar:3, april:4,apr:4,
  may:5, june:6,jun:6, july:7,jul:7, august:8,aug:8, september:9,sep:9,sept:9,
  october:10,oct:10, november:11,nov:11, december:12,dec:12
};
const PC_WEEKDAYS_ = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const PC_WEEKDAY_ABBR_ = ['sun','mon','tue','wed','thu','fri','sat'];
function pcClassification_(status,calendar,parts,text,reason) {
  return {status:status, calendar:calendar||null, parts:parts||null,
    normalizedText:text||null, reason:reason||''};
}
function pcParseEnglishDate_(source) {
  let s=source.toLowerCase().trim();
  let weekday=null;
  const prefix=/^([a-z]+)\s*,\s*/.exec(s);
  if (prefix) {
    let i=PC_WEEKDAYS_.indexOf(prefix[1]);
    if (i<0) i=PC_WEEKDAY_ABBR_.indexOf(prefix[1]);
    if (i<0) return {invalid:true, reason:'نام روز هفته ناشناخته است.'};
    weekday=i;
    s=s.slice(prefix[0].length);
  }
  let m=/^(\d{1,2})\s+([a-z]+)\s*,?\s*(\d{4})$/.exec(s);
  let day,month,year;
  if (m) {day=Number(m[1]); month=PC_EN_MONTHS_[m[2]]; year=Number(m[3]);}
  else {
    m=/^([a-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})$/.exec(s);
    if (!m) return null;
    month=PC_EN_MONTHS_[m[1]]; day=Number(m[2]); year=Number(m[3]);
  }
  if (!month) return {invalid:true,reason:'ماه انگلیسی ناشناخته است.'};
  const p=pcFromGregorian_(year,month,day);
  if (!p) return {invalid:true,reason:'تاریخ میلادی نامعتبر یا خارج از محدوده است.'};
  if (weekday!==null && new Date(Date.UTC(year,month-1,day)).getUTCDay()!==weekday)
    return {invalid:true,reason:'روز هفتهٔ نوشته‌شده با تاریخ هماهنگ نیست.'};
  return {parts:p};
}
function pcDateText_(v,display,timezone) {
  // formatDate omits subsecond precision; preserve datetime semantics before truncation.
  if(v.getUTCMilliseconds()!==0) return {status:'datetime'};
  const parsed=Utilities.formatDate(v,timezone,'yyyy-MM-dd HH:mm:ss');
  if (!/ 00:00:00$/.test(parsed)) return {status:'datetime'};
  const d=parsed.slice(0,10).split('-').map(Number);
  const p=pcFromGregorian_(d[0],d[1],d[2]);
  return p ? {parts:p,calendar:'gregorian'} : {status:'invalid'};
}
/** settings: {format:'numeric'|'long', digits:'persian'|'latin', ambiguous:'skip'|'dmy'|'mdy'}. */
function pcClassify_(value,display,formula,settings,timezone, isCheckbox) {
  if (formula) return pcClassification_('formula');
  if (isCheckbox) return pcClassification_('checkbox');
  if (value===null || value==='') return pcClassification_('empty');
  const cfg=settings||{format:'numeric',digits:'persian',ambiguous:'skip'};
  let p=null, kind=null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return pcClassification_('invalid');
    const date=pcDateText_(value,display,timezone);
    if (date.status) return pcClassification_(date.status);
    p=date.parts; kind='gregorian';
  } else if (typeof value === 'string') {
    const s=pcClean_(value);
    // Only date-shaped strings may be classified as invalid; ordinary prose is never rewritten.
    if (/\d{1,2}:\d{2}/.test(s)) return pcClassification_('datetime');
    const yf=/^(\d{4})([\/\-.])(\d{1,2})\2(\d{1,2})$/.exec(s);
    if (yf) {
      const y=Number(yf[1]),m=Number(yf[3]),d=Number(yf[4]);
      kind=y>=PC_MIN_YEAR_ && y<=PC_MAX_YEAR_ ? 'jalali' : 'gregorian';
      p=kind==='jalali' ? pcValidJalali_(y,m,d) : pcFromGregorian_(y,m,d);
    } else {
      const yl=/^(\d{1,2})([\/\-.])(\d{1,2})\2(\d{4})$/.exec(s);
      if (yl) {
        const a=Number(yl[1]),b=Number(yl[3]),y=Number(yl[4]);
        let day,month;
        if (a>12 && b<=12) {day=a;month=b;}
        else if (b>12 && a<=12) {month=a;day=b;}
        else if (a>=1 && a<=12 && b>=1 && b<=12) {
          if (cfg.ambiguous==='dmy') {day=a;month=b;}
          else if (cfg.ambiguous==='mdy') {month=a;day=b;}
          else return pcClassification_('ambiguous',null,null,null,'DD/MM/YYYY یا MM/DD/YYYY مشخص نیست.');
        } else return pcClassification_('invalid');
        kind=y>=PC_MIN_YEAR_ && y<=PC_MAX_YEAR_ ? 'jalali' : 'gregorian';
        p=kind==='jalali' ? pcValidJalali_(y,month,day) : pcFromGregorian_(y,month,day);
      } else {
        // Explicit Persian long date, otherwise English text with named month.
        try { p=pcParseJalali_(s); kind='jalali'; }
        catch(e) {
          const english=pcParseEnglishDate_(s);
          if (!english) return pcClassification_('other');
          if (english.invalid) return pcClassification_('invalid',null,null,null,english.reason);
          p=english.parts; kind='gregorian';
        }
      }
    }
  } else return pcClassification_('other'); // numbers, booleans, errors are not dates
  if (!p) return pcClassification_('invalid');
  const target=pcFormat_(p,cfg);
  if (kind==='jalali' && typeof value==='string' && value===target)
    return pcClassification_('already','jalali',p,target);
  return pcClassification_(kind==='jalali'?'normalized':'convert',kind,p,target);
}
