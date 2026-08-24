import assert from "node:assert/strict";
import test from "node:test";

import { addCalendarDays, dateInput, excelDateSerial } from "../lib/date-utils.ts";

test("日期欄位使用台灣當地日期而不是 UTC 日期", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "Asia/Taipei";
  try {
    assert.equal(dateInput(new Date("2026-08-30T16:30:00Z")), "2026-08-31");
  } finally {
    process.env.TZ = previousTimezone;
  }
});

test("新增任務的開始日是前一個結束日的隔天", () => {
  assert.equal(addCalendarDays("2026-08-30", 1), "2026-08-31");
  assert.equal(addCalendarDays("2026-08-31", 6), "2026-09-06");
});

test("Excel 日期序號不受台灣時區影響", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "Asia/Taipei";
  try {
    assert.equal(excelDateSerial("2026-08-24"), 46258);
    assert.equal(excelDateSerial("2026-09-01"), 46266);
  } finally {
    process.env.TZ = previousTimezone;
  }
});
