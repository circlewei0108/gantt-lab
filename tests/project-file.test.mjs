import assert from "node:assert/strict";
import test from "node:test";

import { createProjectFile, parseProjectFile, selectProjectsForExport, updateProjectSnapshot } from "../lib/project-file.ts";

const project = {
  id: "project-1",
  name: "網站改版",
  category: "自訂專案",
  updated: "剛剛更新",
  progress: 50,
  tasks: [
    { id: 1, name: "設計", owner: "小明", start: "2026-08-24", end: "2026-08-28", progress: 50, color: "#ff3b30", barStyle: "solid" },
  ],
};

test("專案檔可匯出並重新匯入", () => {
  const text = createProjectFile([project]);
  const parsed = parseProjectFile(text, 1000);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "網站改版");
  assert.equal(parsed[0].category, "匯入專案");
  assert.equal(parsed[0].tasks[0].owner, "小明");
  assert.equal(parsed[0].id, "imported-1000-0");
  assert.equal(parsed[0].tasks[0].id, 1000);
});

test("多專案備份會完整保留所有專案", () => {
  const second = { ...project, id: "project-2", name: "活動籌備" };
  const parsed = parseProjectFile(createProjectFile([project, second]), 2000);

  assert.deepEqual(parsed.map((item) => item.name), ["網站改版", "活動籌備"]);
  assert.equal(new Set(parsed.map((item) => item.id)).size, 2);
});

test("格式錯誤或缺少任務的檔案會被拒絕", () => {
  assert.throws(() => parseProjectFile("not-json"), /無法讀取/);
  assert.throws(() => parseProjectFile(JSON.stringify({ format: "gantt-lab", version: 1, projects: [{ name: "空專案", tasks: [] }] })), /至少需要一個任務/);
});

test("選擇匯出只包含勾選的專案並維持原排序", () => {
  const projects = [
    { ...project, id: "project-1", name: "第一個" },
    { ...project, id: "project-2", name: "第二個" },
    { ...project, id: "project-3", name: "第三個" },
  ];

  const selected = selectProjectsForExport(projects, ["project-3", "project-1"]);

  assert.deepEqual(selected.map((item) => item.name), ["第一個", "第三個"]);
});

test("沒有勾選任何專案時不可匯出", () => {
  assert.throws(() => selectProjectsForExport([project], []), /至少選擇一個專案/);
});

test("操作頁更新只寫回目前專案並重新計算整體進度", () => {
  const other = { ...project, id: "project-2", name: "其他專案" };
  const nextTasks = [
    { ...project.tasks[0], id: 10, progress: 20 },
    { ...project.tasks[0], id: 11, progress: 80 },
  ];

  const updated = updateProjectSnapshot([project, other], "project-1", "新版名稱", nextTasks);

  assert.equal(updated[0].name, "新版名稱");
  assert.equal(updated[0].progress, 50);
  assert.deepEqual(updated[0].tasks.map((task) => task.id), [10, 11]);
  assert.equal(updated[1], other);
});
