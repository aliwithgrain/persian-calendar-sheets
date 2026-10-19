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
