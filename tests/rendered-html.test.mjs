import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the production project workspace without the removed share flow", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>gantt!lab｜可編輯的甘特圖工作台<\/title>/);
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /↑ 選擇匯出/);
  assert.doesNotMatch(html, /分享專案/);
});

test("匯入按鈕會直接觸發檔案選擇器，而非依賴隱藏欄位的標籤行為", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /useRef<HTMLInputElement>\(null\)/);
  assert.match(source, /fileInputRef\.current\?\.click\(\)/);
  assert.match(source, /<button[^>]*className="import-project"[^>]*onClick=\{openProjectFilePicker\}/);
});

test("甘特圖 Bar 以整段深淺色呈現完成與未完成進度", async () => {
  const source = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /\.bar-progress-fill[^}]*height:100%/);
  assert.match(source, /\.style-solid[^}]*background:color-mix/);
});

test("專案首頁可將專案檔直接拖放匯入", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /onDrop=\{handleProjectFileDrop\}/);
  assert.match(source, /dataTransfer\.files\?\.\[0\]/);
  assert.match(source, /拖放專案檔到這裡匯入/);
});
