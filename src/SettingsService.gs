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
