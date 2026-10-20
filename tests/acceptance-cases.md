# Real Google Sheets QA — required before stable release

> This is a manual checklist. The local unit tests cannot replace live Apps Script testing.

- [ ] Install `dist/` into a fresh spreadsheet; first-run authorization and all four approved menu commands work.
- [ ] Settings is the only sidebar; there is no Open Calendar menu or installed Calendar HTML.
- [ ] Test migrating registered-column settings from an existing private installation, when applicable.
- [ ] Register a column and save Settings without the Google Sheets Developer Metadata range exception.
- [ ] Paste `Wednesday,28 May 2025`, `monday,16 december 2024` and `2026/10/18` into selected range; Convert succeeds.
- [ ] Select complete row; other text, numbers, formulas, checkboxes remain unchanged.
- [ ] Select complete column; upper limit is enforced without data corruption.
- [ ] Select disjoint ranges; dates aren't double-written even with overlap.
- [ ] Convert in tabs with preexisting filtered ranges, custom formats, frozen rows.
- [ ] Confirm timestamp dates are skipped, and incorrect weekday names are skipped.
- [ ] After Convert, confirm no new hidden backup tab is created and any preexisting legacy hidden backup is unchanged.
- [ ] Open File → Version history; confirm recovery guidance on a disposable sheet copy and understand whole-document effects.
- [ ] Test `Set as Persian Date Column` with existing dates and blank cells; existing date display does not change.
- [ ] Test type and Paste of 2x3 date cells with marked and unmarked columns.
- [ ] Insert and delete columns and check registered metadata follows the original column.
- [ ] Test Settings long format, Latin digits and DMY/MDY policy.
- [ ] Test protection and merge cells.
- [ ] Test editing from two accounts and permission differences.
- [ ] Test a 1000-row mixed-date selection for execution time; split if near quotas.
- [ ] Settings never calls old backup routines, including on a sheet with a legacy backup tab.
- [ ] Trigger an injected write error in a controlled test; no complete-success notification is shown.
- [ ] Verify time zones and midnight dates for the actual spreadsheet locale.
