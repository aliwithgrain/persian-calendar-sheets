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
