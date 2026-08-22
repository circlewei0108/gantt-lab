"use client";

import { useEffect, useMemo, useState } from "react";
import { strToU8, zipSync } from "fflate";

type BarStyle = "solid" | "outline" | "stripe" | "soft";
type Task = { id: number; name: string; owner: string; start: string; end: string; progress: number; color: string; barStyle: BarStyle; milestone?: boolean };
const day = 86400000;
const initialTasks: Task[] = [
  { id: 1, name: "需求與授權範圍確認", owner: "順緯", start: "2026-09-01", end: "2026-09-08", progress: 100, color: "#111111", barStyle: "solid" },
  { id: 2, name: "知情同意書及報名流程", owner: "梅玲", start: "2026-09-04", end: "2026-09-14", progress: 65, color: "#28f23c", barStyle: "solid" },
  { id: 3, name: "系統介面與資料欄位設計", owner: "開發團隊", start: "2026-09-10", end: "2026-09-30", progress: 35, color: "#7c5cff", barStyle: "stripe" },
  { id: 4, name: "黑豹旗拍攝前測試", owner: "執行廠商", start: "2026-10-01", end: "2026-10-12", progress: 10, color: "#ff6534", barStyle: "outline" },
  { id: 5, name: "正式拍攝與資料蒐集", owner: "專案團隊", start: "2026-10-13", end: "2026-11-06", progress: 0, color: "#1e90ff", barStyle: "soft" },
  { id: 6, name: "第一階段成果確認", owner: "中心", start: "2026-11-07", end: "2026-11-07", progress: 0, color: "#111111", barStyle: "solid", milestone: true },
];
const seedProjects = [
  { id: "baseball-video", name: "基層棒球影音蒐錄計畫", category: "影音與資料", updated: "今天更新", progress: 42, tasks: initialTasks },
  { id: "mr-baseball", name: "野球先生平台優化", category: "產品開發", updated: "昨天更新", progress: 68, tasks: initialTasks.map((task, index) => ({ ...task, id: 100 + index, name: ["使用需求確認", "UI／UX 設計", "API 與資料欄位介接", "前後台功能開發", "整合測試與修正", "正式上線"][index] })) },
  { id: "ctba", name: "棒球協會合作與授權", category: "跨單位合作", updated: "3 天前更新", progress: 25, tasks: initialTasks.slice(0, 5).map((task, index) => ({ ...task, id: 200 + index, name: ["合作範圍確認", "授權文件擬定", "賽事與資料盤點", "知情同意流程整合", "簽約與後續執行"][index] })) },
];
const excelWeeks = Array.from({ length: 7 }, (_, index) => new Date(2026, 8, 1 + index * 7));
const barPalette = ["#111111", "#ff3b30", "#ff8a00", "#f2c94c", "#22b573", "#1e90ff", "#7c5cff", "#d65db1"];
const scaleLevels = ["季", "月", "週", "日"] as const;
function parseDate(value: string) { return new Date(`${value}T00:00:00`); }
function formatDate(date: Date) { return `${date.getMonth() + 1}/${date.getDate()}`; }
function formatTick(date: Date, scale: "日" | "週" | "月" | "季") {
  if (scale === "月") return `${date.getFullYear()}/${date.getMonth() + 1}月`;
  if (scale === "季") return `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;
  return formatDate(date);
}
function dateInput(date: Date) { return date.toISOString().slice(0, 10); }
function xml(value: string | number) { return String(value).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char); }
function columnName(index: number) { let name = ""; let value = index; while (value > 0) { value -= 1; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); } return name; }
function excelSerial(value: string) { return Math.floor((parseDate(value).getTime() - Date.UTC(1899, 11, 30)) / day); }

function downloadXlsx(tasks: Task[]) {
  const starts = tasks.map((task) => parseDate(task.start).getTime());
  const ends = tasks.map((task) => parseDate(task.end).getTime());
  const min = new Date(Math.min(...starts)); const max = new Date(Math.max(...ends));
  min.setDate(min.getDate() - 2); max.setDate(max.getDate() + 4);
  const dates: Date[] = []; for (let time = min.getTime(); time <= max.getTime(); time += day) dates.push(new Date(time));
  const colors = tasks.map((task) => task.color.replace("#", "").toUpperCase());
  const cells = (row: number, values: { value: string | number; style?: number; type?: "s" | "n"; formula?: string }[]) => `<row r="${row}" ht="22">${values.map((item, index) => { const ref = `${columnName(index + 1)}${row}`; if (item.formula) return `<c r="${ref}" s="${item.style ?? 0}"><f>${item.formula}</f></c>`; return item.type === "n" ? `<c r="${ref}" s="${item.style ?? 0}"><v>${item.value}</v></c>` : `<c r="${ref}" s="${item.style ?? 0}" t="inlineStr"><is><t>${xml(item.value)}</t></is></c>`; }).join("")}</row>`;
  const title = cells(1, [{ value: "基層棒球影音蒐錄計畫｜甘特圖", style: 4 }]);
  const note = cells(2, [{ value: "修改開始日或結束日後，右側甘特圖會自動更新。", style: 5 }]);
  const header = cells(3, [{ value: "任務", style: 2 }, { value: "負責人", style: 2 }, { value: "開始日", style: 2 }, { value: "結束日", style: 2 }, { value: "進度", style: 2 }, ...dates.map((date) => ({ value: Math.floor((date.getTime() - Date.UTC(1899, 11, 30)) / day), style: 3, type: "n" as const }))]);
  const rows = tasks.map((task, taskIndex) => { const row = taskIndex + 4; return cells(row, [{ value: task.name, style: 1 }, { value: task.owner, style: 1 }, { value: excelSerial(task.start), style: 3, type: "n" }, { value: excelSerial(task.end), style: 3, type: "n" }, { value: task.progress / 100, style: 6, type: "n" }, ...dates.map((_, dateIndex) => ({ value: "", style: 1, formula: `IF(AND(${columnName(dateIndex + 6)}$3&gt;=$C${row},${columnName(dateIndex + 6)}$3&lt;=$D${row}),1,\"\")` }))]); }).join("");
  const endColumn = columnName(dates.length + 5);
  const conditional = tasks.map((_, index) => { const row = index + 4; return `<conditionalFormatting sqref="F${row}:${endColumn}${row}"><cfRule type="expression" dxfId="${index}" priority="${index + 1}"><formula>AND(F$3&gt;=$C${row},F$3&lt;=$D${row})</formula></cfRule></conditionalFormatting>`; }).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="5" ySplit="3" topLeftCell="F4" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="15" customWidth="1"/><col min="3" max="4" width="12" customWidth="1"/><col min="5" max="5" width="10" customWidth="1"/><col min="6" max="${dates.length + 5}" width="4" customWidth="1"/></cols><sheetData>${title}${note}${header}${rows}</sheetData><mergeCells count="2"><mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/></mergeCells>${conditional}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Microsoft JhengHei"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="18"/><name val="Microsoft JhengHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F6F62"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFE6E1DA"/></left><right style="thin"><color rgb="FFE6E1DA"/></right><top style="thin"><color rgb="FFE6E1DA"/></top><bottom style="thin"><color rgb="FFE6E1DA"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="14" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment wrapText="1"/></xf><xf numFmtId="10" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center"/></xf></cellXfs><dxfs count="${colors.length}">${colors.map((color) => `<dxf><fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor rgb="FF${color}"/></patternFill></fill></dxf>`).join("")}</dxfs></styleSheet>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="甘特圖" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(sheet), "xl/styles.xml": strToU8(styles),
  };
  const blob = new Blob([zipSync(files) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "可編輯甘特圖.xlsx"; anchor.click(); URL.revokeObjectURL(url);
}

function buildImageSvg(tasks: Task[], projectName: string) {
  const width = 1600; const rowHeight = 66; const height = 230 + tasks.length * rowHeight; const chartLeft = 420; const chartWidth = 1120;
  const starts = tasks.map((task) => parseDate(task.start).getTime()); const ends = tasks.map((task) => parseDate(task.end).getTime());
  const min = Math.min(...starts) - day * 3; const max = Math.max(...ends) + day * 4; const total = (max - min) / day;
  const ticks = Array.from({ length: Math.ceil(total / 7) + 1 }, (_, index) => min + index * 7 * day).filter((time) => time <= max);
  const patterns = tasks.map((task, index) => `<pattern id="stripe-${index}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="${task.color}"/><rect x="6" width="6" height="12" fill="#fafaf8"/></pattern>`).join("");
  const rows = tasks.map((task, index) => {
    const y = 178 + index * rowHeight; const x = chartLeft + ((parseDate(task.start).getTime() - min) / day / total) * chartWidth; const barWidth = Math.max(16, (((parseDate(task.end).getTime() - parseDate(task.start).getTime()) / day + 1) / total) * chartWidth);
    const fill = task.barStyle === "stripe" ? `url(#stripe-${index})` : task.barStyle === "outline" ? "#fafaf8" : task.color;
    const opacity = task.barStyle === "soft" ? .22 : 1; const stroke = task.barStyle === "outline" || task.barStyle === "soft" ? task.color : "none"; const textColor = task.barStyle === "solid" ? "#ffffff" : "#111111";
    const progressWidth = Math.max(0, barWidth * task.progress / 100); const badgeX = Math.min(chartLeft + chartWidth - 56, Math.max(x + 4, x + barWidth - 52));
    return `<text x="44" y="${y + 25}" font-size="20" font-weight="700" fill="#111111">${xml(task.name)}</text><text x="44" y="${y + 48}" font-size="13" fill="#777777">${xml(task.owner)} · ${task.start.slice(5).replace("-", "/")}—${task.end.slice(5).replace("-", "/")}</text><line x1="${chartLeft}" y1="${y + 56}" x2="${chartLeft + chartWidth}" y2="${y + 56}" stroke="#e2e2de" stroke-dasharray="4 5"/>${task.milestone ? `<rect x="${x}" y="${y + 13}" width="22" height="22" rx="3" fill="${task.color}" transform="rotate(45 ${x + 11} ${y + 24})"/><rect x="${x + 30}" y="${y + 10}" width="50" height="26" rx="13" fill="#111111"/><text x="${x + 55}" y="${y + 28}" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">${task.progress}%</text>` : `<rect x="${x}" y="${y + 8}" width="${barWidth}" height="34" rx="6" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="2"/><rect x="${x}" y="${y + 37}" width="${barWidth}" height="5" rx="2.5" fill="#111111" opacity=".12"/><rect x="${x}" y="${y + 37}" width="${progressWidth}" height="5" rx="2.5" fill="${task.barStyle === "solid" ? "#ffffff" : task.color}"/><text x="${x + 12}" y="${y + 31}" font-size="13" font-weight="700" fill="${textColor}">${barWidth > 180 ? xml(task.name) : ""}</text><rect x="${badgeX}" y="${y + 12}" width="48" height="24" rx="12" fill="#111111"/><text x="${badgeX + 24}" y="${y + 28}" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">${task.progress}%</text>`}`;
  }).join("");
  const grid = ticks.map((time) => { const date = new Date(time); const x = chartLeft + ((time - min) / day / total) * chartWidth; return `<line x1="${x}" y1="142" x2="${x}" y2="${height - 42}" stroke="#ddddda"/><text x="${x + 6}" y="126" font-size="13" fill="#777777">${formatDate(date)}</text>`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial Rounded MT Bold,Noto Sans TC,Microsoft JhengHei,sans-serif"><defs>${patterns}</defs><rect width="100%" height="100%" fill="#fafaf8"/><rect x="24" y="24" width="1552" height="${height - 48}" rx="28" fill="#f1f1ee" stroke="#d8d8d4"/><text x="44" y="72" font-size="17" font-weight="900" fill="#ff3b30">GANTT!LAB</text><text x="44" y="112" font-size="30" font-weight="800" fill="#111111">${xml(projectName)}</text><text x="${chartLeft}" y="72" font-size="13" fill="#777777">PROJECT TIMELINE · ${tasks.length} TASKS</text>${grid}${rows}<text x="44" y="${height - 55}" font-size="12" fill="#888888">匯出日期 2026.08.21</text></svg>`;
}

function downloadImage(tasks: Task[], projectName: string, format: "png" | "jpeg") {
  const svg = buildImageSvg(tasks, projectName); const width = 1600; const height = 230 + tasks.length * 66;
  const image = new Image(); const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const context = canvas.getContext("2d"); if (!context) return; context.fillStyle = "#fafaf8"; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0); canvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${projectName}.${format === "jpeg" ? "jpg" : "png"}`; anchor.click(); URL.revokeObjectURL(url); URL.revokeObjectURL(svgUrl); }, `image/${format}`, .94); };
  image.src = svgUrl;
}

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [scale, setScale] = useState<"日" | "週" | "月" | "季">("週");
  const [projectName, setProjectName] = useState("基層棒球影音蒐錄計畫");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [showExcel, setShowExcel] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);
  const [screen, setScreen] = useState<"projects" | "editor">("projects");
  const [projects, setProjects] = useState(seedProjects);
  const [currentProjectId, setCurrentProjectId] = useState(seedProjects[0].id);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gantt-lab-projects-v1");
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length) setProjects(parsed); }
    } catch { /* Keep the built-in projects if browser storage is unavailable. */ }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("gantt-lab-projects-v1", JSON.stringify(projects)); } catch { /* Private browsing may block storage. */ }
  }, [projects, storageReady]);
  useEffect(() => {
    if (!storageReady || screen !== "editor") return;
    setProjects((current) => current.map((project) => project.id === currentProjectId ? { ...project, name: projectName, tasks: tasks.map((task) => ({ ...task })), progress: Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(1, tasks.length)), updated: "剛剛更新" } : project));
  }, [tasks, projectName, currentProjectId, screen, storageReady]);
  const range = useMemo(() => {
    const starts = tasks.map((task) => parseDate(task.start).getTime());
    const ends = tasks.map((task) => parseDate(task.end).getTime());
    const start = new Date(Math.min(...starts)); const end = new Date(Math.max(...ends));
    start.setDate(start.getDate() - 3); end.setDate(end.getDate() + 4);
    return { start, end, total: Math.max(1, Math.round((end.getTime() - start.getTime()) / day) + 1) };
  }, [tasks]);
  const ticks = useMemo(() => {
    const result: Date[] = [];
    if (scale === "月" || scale === "季") {
      const cursor = new Date(range.start);
      if (scale === "月") cursor.setDate(1);
      else { cursor.setMonth(Math.floor(cursor.getMonth() / 3) * 3); cursor.setDate(1); }
      while (cursor <= range.end) { result.push(new Date(cursor)); cursor.setMonth(cursor.getMonth() + (scale === "月" ? 1 : 3)); }
    } else {
      const step = scale === "日" ? 1 : 7;
      for (let index = 0; index < range.total; index += step) result.push(new Date(range.start.getTime() + index * day));
    }
    return result;
  }, [range, scale]);
  const update = (id: number, key: keyof Task, value: string | number) => setTasks((current) => current.map((task) => task.id === id ? { ...task, [key]: value } : task));
  const moveTask = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return;
    setTasks((current) => {
      const next = [...current]; const from = next.findIndex((item) => item.id === draggedId); const to = next.findIndex((item) => item.id === targetId);
      const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next;
    });
  };
  const addTask = () => {
    const last = tasks[tasks.length - 1]; const start = last ? parseDate(last.end) : new Date(); start.setDate(start.getDate() + 1);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    setTasks([...tasks, { id: Date.now(), name: "新增工作項目", owner: "未指派", start: dateInput(start), end: dateInput(end), progress: 0, color: "#111111", barStyle: "solid" }]);
  };
  const openProject = (project: typeof seedProjects[number]) => {
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setTasks(project.tasks.map((task) => ({ ...task })));
    setScreen("editor");
  };
  if (screen === "projects") return <main>
    <header className="topbar"><div className="brand"><span>gantt</span><b>!</b><span>lab</span></div><div className="cloud-status"><span className="cloud-dot"/>Google Drive 尚未連結<button onClick={() => setShowGoogleInfo(true)}>連結</button></div></header>
    <section className="project-hub"><div className="hub-head"><div><small>PROJECTS</small><h1>選擇一個專案</h1><p>專案會自動保留在這台裝置；登入雲端後則能跨裝置同步。</p></div><button className="new-project" onClick={() => { const id = `project-${Date.now()}`; const newTasks = initialTasks.slice(0, 3).map((task, index) => ({ ...task, id: Date.now() + index, name: `新增任務 ${index + 1}` })); setProjects((current) => [...current, { id, name: "未命名專案", category: "自訂專案", updated: "剛剛建立", progress: 0, tasks: newTasks }]); setCurrentProjectId(id); setProjectName("未命名專案"); setTasks(newTasks); setScreen("editor"); }}>＋ 新增專案</button></div><div className="project-grid">{projects.map((project, index) => <button className="project-card" key={project.id} onClick={() => openProject(project)}><div className="project-card-top"><span>{String(index + 1).padStart(2, "0")}</span><i>↗</i></div><div><em>{project.category}</em><h2>{project.name}</h2></div><div className="project-progress"><span><i style={{ width: `${project.progress}%` }}/></span><b>{project.progress}%</b></div><footer><span>{project.tasks.length} 個任務</span><span>{project.updated}</span></footer></button>)}</div><div className="cloud-card"><div className="google-mark">G</div><div><strong>Google Drive 跨裝置同步</strong><span>未登入仍會儲存在目前瀏覽器；連結雲端後可備份及換裝置使用。</span></div><button onClick={() => setShowGoogleInfo(true)}>了解連結方式</button></div></section>
    {showGoogleInfo && <div className="modal-backdrop" onMouseDown={() => setShowGoogleInfo(false)}><section className="connect-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowGoogleInfo(false)}>×</button><div className="google-mark large">G</div><h2>連結 Google Drive</h2><p>不登入也會自動保留在目前的瀏覽器；Google Drive 是用來跨裝置同步與備份。</p><ol><li>在 Google Cloud 開啟 Drive API</li><li>建立網站用 OAuth 用戶端</li><li>加入本站網址並設定 Client ID</li></ol><button className="google-login" disabled>使用 Google 帳號登入</button><small>完成 Google OAuth 設定後即可啟用</small><button className="later" onClick={() => setShowGoogleInfo(false)}>先使用本機儲存</button></section></div>}
  </main>;
  return <main>
    <header className="topbar">
      <div className="brand-row"><button className="back-projects" onClick={() => setScreen("projects")}>←</button><div className="brand"><span>gantt</span><b>!</b><span>lab</span></div></div>
      <div className="top-actions"><button className="preview-button" onClick={() => setShowImagePreview(true)}>預覽圖片</button><button className="preview-button" onClick={() => setShowExcel(true)}>預覽 Excel</button><details className="export-menu"><summary>匯出 <span>↗</span></summary><div><button onClick={() => downloadImage(tasks, projectName, "png")}><b>PNG</b><span>透明度清晰，適合簡報</span></button><button onClick={() => downloadImage(tasks, projectName, "jpeg")}><b>JPG</b><span>檔案較小，方便分享</span></button><button onClick={() => downloadXlsx(tasks)}><b>Excel</b><span>可繼續修改日期與任務</span></button></div></details></div>
    </header>
    <section className="app-shell">
      <div className="toolbar">
        <div className="project-title"><span className="live-dot"/><input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="專案名稱"/><small>已儲存</small></div>
        <div className="toolbar-actions"><span>檢視</span><div className="segmented">{(["日","週","月","季"] as const).map((item) => <button key={item} className={scale === item ? "active" : ""} onClick={() => setScale(item)}>{item}</button>)}</div><div className="zoom-control"><button onClick={() => setScale(scaleLevels[Math.max(0, scaleLevels.indexOf(scale) - 1)])} aria-label="縮小時間軸">−</button><input type="range" min="0" max="3" step="1" value={scaleLevels.indexOf(scale)} onChange={(event) => setScale(scaleLevels[Number(event.target.value)])} aria-label="時間軸縮放"/><button onClick={() => setScale(scaleLevels[Math.min(3, scaleLevels.indexOf(scale) + 1)])} aria-label="放大時間軸">＋</button></div></div>
      </div>
      <div className="workspace">
        <aside className="task-panel">
          <div className="panel-title"><div><strong>任務與設定</strong><span>拖曳左側把手即可調整順序</span></div><em>{tasks.length}</em></div>
          <div className="task-list">{tasks.map((task, index) => <article className={`task-card ${draggedId === task.id ? "dragging" : ""}`} key={task.id} draggable onDragStart={() => setDraggedId(task.id)} onDragEnter={() => moveTask(task.id)} onDragOver={(event) => event.preventDefault()} onDragEnd={() => setDraggedId(null)}>
            <button className="drag-handle" aria-label={`拖曳任務 ${task.name}`} title="拖曳調整順序">⠿</button>
            <div className="task-fields"><div className="task-name-line"><span>{String(index + 1).padStart(2, "0")}</span><input className="task-name" value={task.name} onChange={(event) => update(task.id, "name", event.target.value)}/></div><div className="task-meta"><label>負責人<input value={task.owner} onChange={(event) => update(task.id, "owner", event.target.value)} aria-label="負責人"/></label><label>開始<input type="date" value={task.start} onChange={(event) => update(task.id, "start", event.target.value)} aria-label="開始日"/></label><span>—</span><label>結束<input type="date" value={task.end} onChange={(event) => update(task.id, "end", event.target.value)} aria-label="結束日"/></label></div><div className="bar-controls"><span>Bar</span><input className="color-input" type="color" value={task.color} onChange={(event) => update(task.id, "color", event.target.value)} aria-label="自訂 Bar 顏色" title="自訂顏色"/><div className="color-palette">{barPalette.map((color) => <button key={color} className={task.color.toLowerCase() === color ? "selected" : ""} style={{ background: color }} onClick={() => update(task.id, "color", color)} aria-label={`選擇色塊 ${color}`}/>)}</div><div className="style-options">{(["solid","outline","stripe","soft"] as BarStyle[]).map((style) => <button key={style} className={`${style} ${task.barStyle === style ? "selected" : ""}`} onClick={() => update(task.id, "barStyle", style)} aria-label={`選擇 ${style} 樣式`}><i style={{ "--swatch": task.color } as React.CSSProperties}/></button>)}</div><label className="progress-control">進度<input type="number" min="0" max="100" step="1" value={task.progress} onChange={(event) => update(task.id, "progress", Math.min(100, Math.max(0, Number(event.target.value))))}/><b>%</b></label></div></div>
            <button className="delete" onClick={() => tasks.length > 1 && setTasks(tasks.filter((item) => item.id !== task.id))} aria-label="刪除任務">×</button>
          </article>)}</div>
          <button className="add-task" onClick={addTask}>＋ 新增任務</button>
        </aside>
        <div className="chart-panel">
          <div className="chart-caption"><div><small>TIMELINE</small><h1>{projectName}</h1></div><div className="chart-meta"><span>{tasks.length} 個任務</span><span>{range.total} 天</span></div></div>
          <div className="chart-scroll"><div className="chart" style={{ minWidth: scale === "日" ? Math.max(920, range.total * 30) : scale === "週" ? 760 : scale === "月" ? 660 : 560 }}><div className="timeline-header">{ticks.map((tick) => <span key={tick.toISOString()}>{formatTick(tick, scale)}</span>)}</div><div className="grid-lines">{ticks.map((tick) => <i key={tick.toISOString()}/>)}</div><div className="bars">{tasks.map((task) => {
            const left = ((parseDate(task.start).getTime() - range.start.getTime()) / day / range.total) * 100;
            const width = ((parseDate(task.end).getTime() - parseDate(task.start).getTime()) / day + 1) / range.total * 100;
            return <div className="bar-row" key={task.id}><div className={`bar style-${task.barStyle} ${task.milestone ? "milestone" : ""}`} style={{ left: `${left}%`, width: task.milestone ? 18 : `${Math.max(width, 1.8)}%`, "--bar-color": task.color } as React.CSSProperties}>{task.milestone ? <b className="milestone-progress">{task.progress}%</b> : <><i className="bar-progress-fill" style={{ width: `${task.progress}%` }}/><span className="bar-label">{task.name}</span><b className="bar-progress-badge">{task.progress}%</b></>}</div></div>;
          })}</div></div></div>
          <div className="chart-footer"><span>最後更新：今天</span><span>拖曳任務即可同步圖表順序</span></div>
        </div>
      </div>
    </section>
    {showImagePreview && <div className="modal-backdrop" onMouseDown={() => setShowImagePreview(false)}><section className="image-preview-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="圖片匯出預覽"><header><div><strong>圖片匯出預覽</strong><small>進度、日期與 Bar 樣式會一併輸出</small></div><button onClick={() => setShowImagePreview(false)}>×</button></header><div className="image-preview-canvas" dangerouslySetInnerHTML={{ __html: buildImageSvg(tasks, projectName) }}/><footer><button onClick={() => downloadImage(tasks, projectName, "jpeg")}>下載 JPG</button><button className="primary" onClick={() => downloadImage(tasks, projectName, "png")}>下載 PNG</button></footer></section></div>}
    {showExcel && <div className="modal-backdrop" onMouseDown={() => setShowExcel(false)}><section className="excel-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Excel 匯出預覽"><header><div><span className="excel-icon">X</span><div><strong>可編輯甘特圖.xlsx</strong><small>匯出預覽</small></div></div><button onClick={() => setShowExcel(false)}>×</button></header><div className="formula-bar"><span>fx</span><div>=IF(AND(F$3&gt;=$C4,F$3&lt;=$D4),1,&quot;&quot;)</div></div><div className="excel-scroll"><div className="excel-sheet"><div className="excel-row excel-columns"><b></b>{["A","B","C","D","E","F","G","H","I","J","K","L"].map((letter) => <span key={letter}>{letter}</span>)}</div><div className="excel-row title-row"><b>1</b><strong>{projectName}｜甘特圖</strong></div><div className="excel-row sheet-header"><b>2</b><span>任務</span><span>負責人</span><span>開始日</span><span>結束日</span><span>進度</span>{excelWeeks.map((date) => <span key={date.toISOString()}>{formatDate(date)}</span>)}</div>{tasks.slice(0,6).map((task,index) => <div className="excel-row data-row" key={task.id}><b>{index + 3}</b><span>{task.name}</span><span>{task.owner}</span><span>{task.start.slice(5).replace("-","/")}</span><span>{task.end.slice(5).replace("-","/")}</span><span>{task.progress}%</span>{excelWeeks.map((week) => { const weekEnd = new Date(week.getTime() + 6 * day); const active = parseDate(task.start) <= weekEnd && parseDate(task.end) >= week; return <span className={`excel-week-cell ${active ? "active" : ""}`} style={active ? { background: task.color } : undefined} key={week.toISOString()}/>; })}</div>)}</div></div><footer><span className="sheet-tab">甘特圖</span><p><i/> 日期、任務、負責人及進度都能直接修改，色塊會跟著日期自動更新</p><button onClick={() => { setShowExcel(false); downloadXlsx(tasks); }}>下載 Excel</button></footer></section></div>}
  </main>;
}
