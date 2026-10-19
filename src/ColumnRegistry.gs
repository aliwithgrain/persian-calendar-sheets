/** Column-anchored metadata follows structural column shifts better than numeric indexes. */
const PC_COLUMN_KEY_='PERSIAN_CALENDAR_DATE_COLUMN_V3';
function pcMetadata_(sheet) {return sheet.createDeveloperMetadataFinder().withKey(PC_COLUMN_KEY_).find();}
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
    if (!existing.has(idx)) sheet.getRange(1,idx,sheet.getMaxRows(),1).addDeveloperMetadata(PC_COLUMN_KEY_,'v3');
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
        sheet.getRange(1,c,sheet.getMaxRows(),1).addDeveloperMetadata(PC_COLUMN_KEY_,'v3');
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
