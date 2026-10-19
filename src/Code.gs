/** Entry points for spreadsheet-bound Persian Calendar. */
function onOpen() {
  const ui=SpreadsheetApp.getUi();
  ui.createMenu('Persian Calendar')
    .addItem('Open Calendar', 'pcShowCalendar')
    .addItem('Insert Today','pcInsertToday')
    .addItem('Convert Selection','pcConvertSelection')
    .addItem('Set as Persian Date Column','pcMarkColumns')
    .addItem('Settings','pcShowSettings')
    .addToUi();
}
function pcShowCalendar() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutputFromFile('Calendar').setTitle('Persian Calendar'));
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
function pcGetMonth(year,month) {
  const y=Number(year),m=Number(month);
  const first=pcToDay_(y,m,1),days=pcMonthLength_(y,m);
  return {year:y,month:m,monthName:PC_MONTHS_[m-1],days:days,
    firstWeekday:(new Date(first*PC_MS_DAY_).getUTCDay()+1)%7};
}
function pcGetCalendarState() {
  const cell=pcActiveCell_(), today=pcToday_();
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const p=pcClassify_(cell.getValue(),cell.getDisplayValue(),cell.getFormula(),
    pcSettings_(),ss.getSpreadsheetTimeZone(),false);
  const selected=p.parts||null,current=selected||today;
  return Object.assign(pcGetMonth(current.y,current.m),{
    selected:selected,today:today,settings:pcSettings_(),
    target:cell.getSheet().getName()+'!'+cell.getA1Notation()
  });
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
