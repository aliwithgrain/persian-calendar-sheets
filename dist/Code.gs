// ===== CalendarCore.gs =====
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


// ===== DateParser.gs =====
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


// ===== SettingsService.gs =====
/** Document-wide settings, shared by editors of this spreadsheet. */
const PC_SETTINGS_KEY_ = 'pc_settings_v3';
const PC_DEFAULT_SETTINGS_ = {format:'numeric', digits:'persian', ambiguous:'skip', autoConvert:true};
function pcSettings_() {
  const raw=PropertiesService.getDocumentProperties().getProperty(PC_SETTINGS_KEY_);
  try {return pcSanitizeSettings_(Object.assign({},PC_DEFAULT_SETTINGS_,raw ? JSON.parse(raw) : {}));}
  catch(e) {return Object.assign({},PC_DEFAULT_SETTINGS_);}
}
function pcSanitizeSettings_(s) {
  return {
    format:['numeric','long'].includes(s.format) ? s.format : 'numeric',
    digits:['persian','latin'].includes(s.digits) ? s.digits : 'persian',
    ambiguous:['skip','dmy','mdy'].includes(s.ambiguous) ? s.ambiguous : 'skip',
    autoConvert:s.autoConvert!==false
  };
}
function pcSaveSettings(settings) {
  const config=pcSanitizeSettings_(settings||{});
  PropertiesService.getDocumentProperties().setProperty(PC_SETTINGS_KEY_,JSON.stringify(config));
  return pcGetSettingsState();
}
function pcGetSettingsState() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sheet=ss.getActiveSheet();
  return {settings:pcSettings_(), tab:sheet.getName(), columns:pcRegisteredColumns_(sheet)};
}
function pcShowSettings() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Settings').setTitle('Persian Calendar — Settings'));
}
function pcToast_(text,seconds) {
  SpreadsheetApp.getActiveSpreadsheet().toast(text,'Persian Calendar',seconds||5);
}
function pcUiError_(e) {
  const message=e && e.message ? e.message : String(e);
  pcToast_('خطا: '+message,9);
  console.error(message);
}


// ===== ColumnRegistry.gs =====
/** Column-anchored metadata follows structural column shifts better than numeric indexes. */
const PC_COLUMN_KEY_='PERSIAN_CALENDAR_DATE_COLUMN_V3';
function pcMetadata_(sheet) {return sheet.createDeveloperMetadataFinder().withKey(PC_COLUMN_KEY_).find();}
/** Only whole-column A1 ranges are valid developer-metadata locations in Sheets. */
function pcFullColumnRange_(sheet,index) {const a1=pcColumnA1_(index);return sheet.getRange(a1+':'+a1);}
function pcRegisteredColumns_(sheet) {
  // Migrate old numeric properties lazily, before reading metadata.
  pcMigrateColumns_(sheet);
  const seen=new Set();
  for (const entry of pcMetadata_(sheet)) {
    const col=entry.getLocation().getColumn();
    if (col) seen.add(col.getColumn());
  }
  return Array.from(seen).sort((a,b)=>a-b);
}
function pcMigrateColumns_(sheet) {
  const props=PropertiesService.getDocumentProperties();
  const key='jalali_cols_'+sheet.getSheetId();
  const legacy=props.getProperty(key);
  if (!legacy) return;
  const existing=new Set();
  for (const entry of pcMetadata_(sheet)) {
    const col=entry.getLocation().getColumn(); if(col) existing.add(col.getColumn());
  }
  const indexes=legacy.split(',').map(Number).filter(x=>Number.isInteger(x)&&x>=1&&x<=sheet.getMaxColumns());
  for (const idx of indexes) {
    if (!existing.has(idx)) pcFullColumnRange_(sheet,idx).addDeveloperMetadata(PC_COLUMN_KEY_,'v3');
  }
  props.deleteProperty(key); // prevents obsolete indexes after insertion/deletion
}
const PC_PREP_MAX_ROWS_=10000;
function pcMarkColumns() {
  const lock=LockService.getDocumentLock();
  if(!lock || !lock.tryLock(30000)) {pcToast_('عملیات دیگری در حال اجراست.',7);return;}
  try {
    const ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getActiveSheet();
    const list=ss.getSelection().getActiveRangeList();
    if(!list) throw new Error('ابتدا ستون‌های موردنظر را انتخاب کنید.');
    const columns=new Set();
    list.getRanges().forEach(r=>{for(let c=r.getColumn();c<=r.getLastColumn();c++) columns.add(c);});
    if(!columns.size||columns.size>25) throw new Error('حداکثر ۲۵ ستون را در یک نوبت انتخاب کنید.');
    const prior=new Set(pcRegisteredColumns_(sheet));
    // Preflight ALL exact empty-cell runs before modifying metadata or cell formats.
    const plans=Array.from(columns,c=>pcColumnPrepPlan_(sheet,c));
    for(const plan of plans) for(const [from,to] of plan.runs)
      if(!sheet.getRange(from,plan.col,to-from+1,1).canEdit())
        throw new Error('بعضی سلول‌های خالی ستون '+pcColumnA1_(plan.col)+' قابل‌ویرایش نیستند.');
    const added=[], attempted=[];
    try {
      for(const c of columns) if(!prior.has(c)) {
        pcFullColumnRange_(sheet,c).addDeveloperMetadata(PC_COLUMN_KEY_,'v3');
        added.push(c);
      }
      for(const plan of plans) {
        // Only used for restoring formats on a failed column-registration operation.
        plan.before=sheet.getRange(1,plan.col,plan.limit,1).getNumberFormats();
        attempted.push(plan);
        pcApplyColumnPrep_(sheet,plan);
      }
    } catch(e) {
      const problems=[];
      for(const plan of attempted.reverse()) {
        for(const [from,to] of plan.runs) {
          try {
            const r=sheet.getRange(from,plan.col,to-from+1,1);
            const contents=r.getValues();
            const current=r.getNumberFormats();
            if(contents.every((v,i)=>v[0]==='' && current[i][0]==='@'))
              r.setNumberFormats(plan.before.slice(from-1,to));
            else problems.push(pcColumnA1_(plan.col)+from+':'+to);
          } catch(rollbackError) {problems.push(pcColumnA1_(plan.col)+from+':'+to);}
        }
      }
      for(const md of pcMetadata_(sheet)) {
        const column=md.getLocation().getColumn();
        if(column && added.includes(column.getColumn())) try {md.remove();} catch(ignore) {problems.push('metadata');}
      }
      throw new Error('ثبت ستون کامل نشد: '+(e.message||String(e))+
        (problems.length?'؛ بازیابی برخی قالب‌ها نامطمئن است: '+problems.slice(0,3).join(', '):''));
    }
    const truncated=plans.some(x=>x.limit<sheet.getMaxRows());
    pcToast_(columns.size+' ستون ثبت شد؛ تاریخ‌های قبلی تغییر نکردند.'+
      (truncated?' قالب سلول‌های خالی فقط تا ردیف '+PC_PREP_MAX_ROWS_+' آماده شد.':''),7);
  } catch(e) {pcUiError_(e);} finally {lock.releaseLock();}
}
function pcColumnA1_(col) {
  let name='';
  for(let n=col;n>0;n=Math.floor((n-1)/26)) name=String.fromCharCode(65+(n-1)%26)+name;
  return name;
}
function pcColumnPrepPlan_(sheet,col) {
  const limit=Math.min(sheet.getMaxRows(),PC_PREP_MAX_ROWS_);
  const range=sheet.getRange(1,col,limit,1),values=range.getValues(),formulas=range.getFormulas();
  const runs=[];let begin=0;
  for(let r=1;r<=limit;r++) {
    if(values[r-1][0]==='' && formulas[r-1][0]==='') {if(!begin) begin=r;}
    else if(begin) {runs.push([begin,r-1]);begin=0;}
  }
  if(begin) runs.push([begin,limit]);
  return {col:col,limit:limit,runs:runs};
}
function pcApplyColumnPrep_(sheet,plan) {
  const letter=pcColumnA1_(plan.col);
  for(let i=0;i<plan.runs.length;i+=200) {
    const references=plan.runs.slice(i,i+200).map(([start,end])=>letter+start+':'+letter+end);
    sheet.getRangeList(references).setNumberFormat('@');
  }
}
function pcPrepareEmptyCells_(sheet,col) {
  const plan=pcColumnPrepPlan_(sheet,col);
  pcApplyColumnPrep_(sheet,plan);
  return plan.limit;
}
function pcRemoveColumn(column) {
  const sheet=SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const n=Number(column);
  if(!Number.isInteger(n) || n<1) throw new Error('ستون نامعتبر است.');
  let count=0;
  for(const md of pcMetadata_(sheet)) {
    const loc=md.getLocation().getColumn();
    if(loc && loc.getColumn()===n) {md.remove();count++;}
  }
  return pcGetSettingsState();
}


// ===== ConversionService.gs =====
/** Explicit migration: no confirmation dialog or hidden-sheet snapshot. */
const PC_MAX_SCAN_ = 25000;
const PC_MAX_WRITE_ = 3000;
const PC_MAX_EDIT_ = 3000;
function pcSelectedRanges_() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sheet=ss.getActiveSheet(), list=ss.getSelection().getActiveRangeList();
  if(!list) throw new Error('محدودهٔ موردنظر را انتخاب کنید.');
  const lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(!lastRow || !lastCol) return [];
  let total=0;
  const ranges=[];
  for(const r of list.getRanges()) {
    const r2=Math.min(r.getLastRow(),lastRow),c2=Math.min(r.getLastColumn(),lastCol);
    if(r.getRow()>r2||r.getColumn()>c2) continue;
    const h=r2-r.getRow()+1,w=c2-r.getColumn()+1;
    total+=h*w;
    if(total>PC_MAX_SCAN_) throw new Error('حداکثر '+PC_MAX_SCAN_+' سلول در یک نوبت بررسی می‌شود. محدوده را کوچک‌تر کنید.');
    ranges.push(sheet.getRange(r.getRow(),r.getColumn(),h,w));
  }
  return ranges;
}
function pcIsBlocked_(r,c,blocks) {
  return blocks.some(x=>r>=x.r1&&r<=x.r2&&c>=x.c1&&c<=x.c2&&
    !(x.except||[]).some(a=>r>=a.r1&&r<=a.r2&&c>=a.c1&&c<=a.c2));
}
function pcRect_(range) {
  return {r1:range.getRow(),r2:range.getLastRow(),c1:range.getColumn(),c2:range.getLastColumn()};
}
function pcProtectionBlocks_(sheet) {
  const blocks=[];
  for(const p of sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE))
    if(!p.canEdit()) blocks.push(pcRect_(p.getRange()));
  for(const p of sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET))
    if(!p.canEdit()) blocks.push({r1:1,r2:sheet.getMaxRows(),c1:1,c2:sheet.getMaxColumns(),
      except:p.getUnprotectedRanges().map(pcRect_)});
  return blocks;
}
function pcBlockedRanges_(sheet,range,protectionBlocks) {
  const blocks=range.getMergedRanges().map(pcRect_);
  return blocks.concat(protectionBlocks || pcProtectionBlocks_(sheet));
}
function pcAnalyzeRange_(range,settings,timezone,visited,protectionBlocks) {
  const values=range.getValues(),displays=range.getDisplayValues(),
    formulas=range.getFormulas(), validations=range.getDataValidations();
  const blocked=pcBlockedRanges_(range.getSheet(),range,protectionBlocks);
  const stats={scanned:0,converted:0,normalized:0,already:0,ambiguous:0,
    invalid:0,datetime:0,skipped:0,formula:0};
  const changes=[];
  for(let i=0;i<values.length;i++) for(let j=0;j<values[i].length;j++) {
    const row=range.getRow()+i,col=range.getColumn()+j;
    const unique=row+':'+col;
    if(visited && visited.has(unique)) continue;
    if(visited) visited.add(unique);
    stats.scanned++;
    if(pcIsBlocked_(row,col,blocked)||validations[i][j]!==null) {stats.skipped++;continue;}
    const s=pcClassify_(values[i][j],displays[i][j],formulas[i][j],settings,timezone,false);
    if(s.status==='convert'||s.status==='normalized') {
      changes.push({row:row,col:col,text:s.normalizedText,original:values[i][j]});
      if(s.status==='convert') stats.converted++;else stats.normalized++;
    } else if (s.status==='already') stats.already++;
    else if (s.status==='ambiguous') stats.ambiguous++;
    else if (s.status==='invalid') stats.invalid++;
    else if (s.status==='datetime') stats.datetime++;
    else if (s.status==='formula') stats.formula++;
    else stats.skipped++;
  }
  return {changes:changes,stats:stats};
}
/** Pack EXACT covered cells into contiguous horizontal spans and rectangular blocks. */
function pcWriteRectangles_(changes) {
  const sorted=changes.slice().sort((a,b)=>a.row-b.row||a.col-b.col);
  const spans=[];
  for(const item of sorted) {
    const last=spans[spans.length-1];
    if(last && last.row===item.row && item.col===last.col+last.values.length) {last.values.push(item.text);last.originals.push(item.original);}
    else {
      if(last && last.row===item.row && item.col<last.col+last.values.length)
        throw new Error('مختصات تکراری برای تبدیل یافت شد.');
      spans.push({row:item.row,col:item.col,values:[item.text],originals:[item.original]});
    }
  }
  const result=[], prev=new Map();
  for(const span of spans) {
    const key=span.col+':'+span.values.length;
    const previous=prev.get(key);
    if(previous && previous.row+previous.rows.length===span.row) {
      previous.rows.push(span.values);previous.originals.push(span.originals);
    } else {
      const rect={row:span.row,col:span.col,rows:[span.values],originals:[span.originals]};
      result.push(rect);
      prev.set(key,rect);
    }
  }
  return result;
}
function pcEqualGridValue_(a,b) {
  return a instanceof Date && b instanceof Date ? a.getTime()===b.getTime() : a===b;
}
function pcSameGrid_(before,after) {
  return before.length===after.length && before.every((row,i)=>
    row.length===after[i].length && row.every((v,j)=>pcEqualGridValue_(v,after[i][j])));
}
function pcWriteRuns_(sheet,changes) {
  // Preserve prior formatting in memory for a narrow, safe failure compensation.
  // Never undo a format if the value has changed: a write may have partially committed.
  if(!changes.length) return 0;
  const rectangles=pcWriteRectangles_(changes);
  let completed=0;
  for(const rect of rectangles) {
    const count=rect.rows.length*rect.rows[0].length;
    let range=null,oldValues=null,oldFormats=null,formatAttempted=false;
    try {
      range=sheet.getRange(rect.row,rect.col,rect.rows.length,rect.rows[0].length);
      oldValues=range.getValues();
      for(let i=0;i<oldValues.length;i++) for(let j=0;j<oldValues[i].length;j++) {
        const original=rect.originals[i][j];
        if(original!==undefined && !pcEqualGridValue_(oldValues[i][j],original))
          throw new Error('مقدار سلول از زمان خواندن تغییر کرده است؛ تبدیل آن متوقف شد.');
      }
      oldFormats=range.getNumberFormats();
      formatAttempted=true;
      range.setNumberFormat('@');
      range.setValues(rect.rows);
      completed+=count;
    } catch(e) {
      let rollback='قالب اولیه تأیید یا بازیابی نشد.';
      if(range && formatAttempted && oldValues && oldFormats) {
        try {
          if(pcSameGrid_(oldValues,range.getValues())) {
            range.setNumberFormats(oldFormats);
            rollback='قالب اولیه بازیابی شد.';
          } else rollback='احتمال ثبت بخشی از داده‌ها وجود دارد؛ قالب عمداً بازنویسی نشد.';
        } catch(recoveryError) {
          rollback='بازیابی قالب ناموفق بود: '+(recoveryError.message||String(recoveryError));
        }
      }
      const error=new Error('نوشتن گروهی متوقف شد: '+(e.message||String(e))+' '+rollback);
      error.pcCompleted=completed;
      error.pcTotal=changes.length;
      throw error;
    }
  }
  return completed;
}
function pcStatsTotal_(stats,key) {return stats.reduce((n,s)=>n+s[key],0);}
function pcConvertSelection() {
  const lock=LockService.getDocumentLock();
  if(!lock.tryLock(30000)) {pcToast_('عملیات دیگری در حال اجراست.',7);return;}
  try {
    const ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getActiveSheet();
    const ranges=pcSelectedRanges_();
    if(!ranges.length) {pcToast_('در محدودهٔ انتخاب‌شده داده‌ای وجود ندارد.');return;}
    const settings=pcSettings_(),timezone=ss.getSpreadsheetTimeZone();
    const seen=new Set(),visited=new Set(),changes=[],allStats=[];
    const protectionBlocks=pcProtectionBlocks_(sheet);
    for(const range of ranges) {
      const result=pcAnalyzeRange_(range,settings,timezone,visited,protectionBlocks);
      allStats.push(result.stats);
      for(const c of result.changes) {
        const key=c.row+':'+c.col;
        if(!seen.has(key)) {changes.push(c);seen.add(key);}
      }
    }
    if(!changes.length) {
      pcToast_('هیچ تاریخ قابل تبدیلی پیدا نشد. '+pcStatsTotal_(allStats,'ambiguous')+' مورد مبهم بود.',6);return;
    }
    if(changes.length>PC_MAX_WRITE_) throw new Error('حداکثر '+PC_MAX_WRITE_+' تاریخ در یک نوبت تبدیل می‌شود؛ محدوده را کوچک‌تر کنید.');
    // Permission preflight on exact rectangles, not on every cell; no writing before it finishes.
    // A second permission gate is still enforced by Sheets during the actual writes.
    for(const rect of pcWriteRectangles_(changes)) {
      const target=sheet.getRange(rect.row,rect.col,rect.rows.length,rect.rows[0].length);
      if(!target.canEdit()) throw new Error('در محدوده سلول محافظت‌شده وجود دارد: '+target.getA1Notation());
    }
    let completed=0;
    try {
      completed=pcWriteRuns_(sheet,changes);
      SpreadsheetApp.flush();
    } catch(e) {
      const known=Number.isInteger(e.pcCompleted) ? e.pcCompleted : completed;
      // Flush errors can make remote commit status uncertain. Never claim full success.
      const detail=known+' از '+changes.length+' نوشتن با پاسخ موفق؛ بقیه یا نتیجهٔ نهایی نامشخص است.';
      throw new Error('تبدیل ناقص یا نامطمئن: '+detail+' '+(e.message||String(e))+' از Version History برای بررسی استفاده کنید.');
    }
    pcToast_(pcStatsTotal_(allStats,'converted')+' تبدیل، '+pcStatsTotal_(allStats,'normalized')+
      ' یکسان‌سازی، '+pcStatsTotal_(allStats,'ambiguous')+' مبهم؛ '+changes.length+' تغییر.',8);
  } catch(e) {pcUiError_(e);} finally {lock.releaseLock();}
}


// ===== EditTrigger.gs =====
/** Show failures only, keeping normal onEdit operations free of UI calls. */
function pcOnEditNotice_(e,message) {
  console.warn('Persian Calendar onEdit: '+message);
  try {
    const ss=(e && e.source) || SpreadsheetApp.getActiveSpreadsheet();
    if(ss && ss.toast) ss.toast(message,'Persian Calendar',6);
  } catch(ignore) { console.warn('Persian Calendar onEdit: toast unavailable'); }
}
/** Simple onEdit trigger: only marked columns; no confirmation and no overwriting other data. */
function onEdit(e) {
  if(!e||!e.range) return;
  try {
    const range=e.range,rows=range.getNumRows(),cols=range.getNumColumns();
    // Never read settings, column metadata or grid data for an oversized edit.
    if(rows*cols>PC_MAX_EDIT_) {
      pcOnEditNotice_(e,'ورود گروهی بیش از '+PC_MAX_EDIT_+' سلول بود؛ در صورت نیاز Convert Selection را اجرا کنید.');
      return;
    }
    const sheet=range.getSheet();
    const registered=new Set(pcRegisteredColumns_(sheet));
    if(!registered.size) return;
    const matched=[];
    for(let c=range.getColumn();c<=range.getLastColumn();c++)
      if(registered.has(c)) matched.push(c);
    if(!matched.length) return; // unrelated edits do not read settings or grid values
    const settings=pcSettings_();
    if(!settings.autoConvert) return;
    // Read only the bounding marked columns, never the entire pasted selection.
    const first=matched[0],last=matched[matched.length-1];
    // Serialize script writes with Convert Selection; never spend the trigger's full budget waiting.
    const lock=LockService.getDocumentLock();
    if(!lock || !lock.tryLock(1000)) {
      pcOnEditNotice_(e,'تبدیل خودکار به دلیل اجرای عملیات دیگر انجام نشد؛ Convert Selection را اجرا کنید.');
      return;
    }
    try {
    const target=sheet.getRange(range.getRow(),first,rows,last-first+1);
    const values=target.getValues(),displays=target.getDisplayValues(),formulas=target.getFormulas(),
      validations=target.getDataValidations();
    const ss=e.source||SpreadsheetApp.getActiveSpreadsheet();
    const timezone=ss.getSpreadsheetTimeZone();
    const blocked=pcBlockedRanges_(sheet,target),changed=[];
    for(let i=0;i<rows;i++) for(const col of matched) {
      const j=col-first,row=target.getRow()+i;
      if(pcIsBlocked_(row,col,blocked)||validations[i][j]!==null) continue;
      let current=values[i][j];
      if(rows===1&&cols===1&&typeof e.value==='string' && /^\s*[۰-۹٠-٩1][0-9۰-۹٠-٩]{3}[\/\-.]/.test(e.value))
        current=e.value;
      const result=pcClassify_(current,displays[i][j],formulas[i][j],settings,timezone,false);
      if(result.status==='convert'||result.status==='normalized')
        changed.push({row:row,col:col,text:result.normalizedText,original:values[i][j]});
    }
    if(changed.length) pcWriteRuns_(sheet,changed);
    } finally {lock.releaseLock();}
  } catch(error) {
    console.error('Persian Calendar onEdit: '+(error.message||String(error)));
    pcOnEditNotice_(e,'تبدیل خودکار کامل نشد؛ محدوده را بررسی کنید و Convert Selection را اجرا کنید.');
  }
}


// ===== Code.gs =====
/** Entry points for spreadsheet-bound Persian Calendar. */
function onOpen() {
  const ui=SpreadsheetApp.getUi();
  ui.createMenu('Persian Calendar')
    .addItem('Insert Today','pcInsertToday')
    .addItem('Convert Selection','pcConvertSelection')
    .addItem('Set as Persian Date Column','pcMarkColumns')
    .addItem('Settings','pcShowSettings')
    .addToUi();
}
function pcActiveCell_() {
  const cell=SpreadsheetApp.getActiveSpreadsheet().getSelection().getCurrentCell();
  if(!cell) throw new Error('ابتدا یک سلول را انتخاب کنید.');
  return cell;
}
function pcInsertToday() {
  try {const t=pcToday_();const x=pcWriteDate(t.y,t.m,t.d);pcToast_('تاریخ امروز در '+x.target+' ثبت شد.');}
  catch(e) {pcUiError_(e);}
}
function pcWriteDate(year,month,day) {
  const y=Number(year),m=Number(month),d=Number(day);
  pcToDay_(y,m,d);
  const cell=pcActiveCell_();
  if(!cell.canEdit()) throw new Error('سلول انتخاب‌شده قابل ویرایش نیست.');
  if(cell.getFormula()) throw new Error('سلول انتخاب‌شده فرمول دارد؛ سلول دیگری انتخاب کنید.');
  if(cell.getDataValidation()) throw new Error('سلول دارای اعتبارسنجی است؛ سلول دیگری انتخاب کنید.');
  if(cell.isPartOfMerge()) throw new Error('برای درج تاریخ، سلول ادغام‌نشده انتخاب کنید.');
  const formatted=pcFormat_({y:y,m:m,d:d},pcSettings_());
  cell.setNumberFormat('@').setValue(formatted);
  return {value:formatted,target:cell.getSheet().getName()+'!'+cell.getA1Notation()};
}
