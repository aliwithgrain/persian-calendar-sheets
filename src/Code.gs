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
