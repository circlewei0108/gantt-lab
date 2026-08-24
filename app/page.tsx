"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { strToU8, zipSync } from "fflate";
import { addCalendarDays, dateInput, excelDateSerial } from "../lib/date-utils";
import { createProjectFile, parseProjectFile, selectProjectsForExport, updateProjectSnapshot, type ProjectFileBarStyle, type ProjectFileProject, type ProjectFileTask } from "../lib/project-file";

type BarStyle = ProjectFileBarStyle;
type Task = ProjectFileTask;
type Project = ProjectFileProject;
const day = 86400000;
const seedProjects: Project[] = [];
const today = () => new Date();
function blankTask(id = Date.now()): Task { const start = today(); const end = new Date(start); end.setDate(end.getDate() + 6); return { id, name: "", owner: "", start: dateInput(start), end: dateInput(end), progress: 0, color: "#ff3b30", barStyle: "solid" }; }
const excelWeeks = Array.from({ length: 7 }, (_, index) => { const date = today(); date.setDate(date.getDate() + index * 7); return date; });
const barPalette = ["#111111", "#ff3b30", "#ff8a00", "#f2c94c", "#22b573", "#1e90ff", "#7c5cff", "#d65db1"];
const scaleLevels = ["季", "月", "週", "日"] as const;
function parseDate(value: string) { return new Date(`${value}T00:00:00`); }
function formatDate(date: Date) { return `${date.getMonth() + 1}/${date.getDate()}`; }
function formatTick(date: Date, scale: "日" | "週" | "月" | "季") {
  if (scale === "月") return `${date.getFullYear()}/${date.getMonth() + 1}月`;
  if (scale === "季") return `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;
  return formatDate(date);
}
function xml(value: string | number) { return String(value).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char] ?? char); }
function columnName(index: number) { let name = ""; let value = index; while (value > 0) { value -= 1; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); } return name; }
function lightenHex(value: string, ratio = .72) { const raw = value.replace("#", "").padEnd(6, "0"); return `#${[0, 2, 4].map((index) => { const channel = Number.parseInt(raw.slice(index, index + 2), 16); return Math.round(channel + (255 - channel) * ratio).toString(16).padStart(2, "0"); }).join("")}`; }
function safeFileName(value: string) { return (value.trim() || "未命名專案").replace(/[\\/:*?"<>|]/g, "-").slice(0, 80); }
function triggerDownload(blob: Blob, fileName: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.style.display = "none"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function downloadProjectFile(projects: Project[], fileName: string) { triggerDownload(new Blob([createProjectFile(projects)], { type: "application/json;charset=utf-8" }), `${safeFileName(fileName)}.gantt.json`); }

function downloadXlsx(tasks: Task[], projectName: string) {
  const starts = tasks.map((task) => parseDate(task.start).getTime());
  const ends = tasks.map((task) => parseDate(task.end).getTime());
  const min = new Date(Math.min(...starts)); const max = new Date(Math.max(...ends));
  min.setDate(min.getDate() - 2); max.setDate(max.getDate() + 4);
  const dates: Date[] = []; for (let time = min.getTime(); time <= max.getTime(); time += day) dates.push(new Date(time));
  const colors = tasks.map((task) => ({ solid: task.color.replace("#", "").toUpperCase(), light: lightenHex(task.color).replace("#", "").toUpperCase() }));
  const cells = (row: number, values: { value: string | number; style?: number; type?: "s" | "n"; formula?: string }[]) => `<row r="${row}" ht="22">${values.map((item, index) => { const ref = `${columnName(index + 1)}${row}`; if (item.formula) return `<c r="${ref}" s="${item.style ?? 0}"><f>${item.formula}</f></c>`; return item.type === "n" ? `<c r="${ref}" s="${item.style ?? 0}"><v>${item.value}</v></c>` : `<c r="${ref}" s="${item.style ?? 0}" t="inlineStr"><is><t>${xml(item.value)}</t></is></c>`; }).join("")}</row>`;
  const title = cells(1, [{ value: `${projectName || "未命名專案"}｜甘特圖`, style: 4 }]);
  const note = cells(2, [{ value: "修改開始日、結束日或進度百分比後，右側 Bar 會自動更新；深色為已完成，淺色為尚未完成。", style: 5 }]);
  const header = cells(3, [{ value: "任務", style: 2 }, { value: "負責人", style: 2 }, { value: "開始日", style: 2 }, { value: "結束日", style: 2 }, { value: "進度", style: 2 }, ...dates.map((date) => ({ value: excelDateSerial(dateInput(date)), style: 3, type: "n" as const }))]);
  const rows = tasks.map((task, taskIndex) => { const row = taskIndex + 4; return cells(row, [{ value: task.name, style: 1 }, { value: task.owner, style: 1 }, { value: excelDateSerial(task.start), style: 3, type: "n" }, { value: excelDateSerial(task.end), style: 3, type: "n" }, { value: task.progress / 100, style: 6, type: "n" }, ...dates.map((_, dateIndex) => ({ value: "", style: 7, formula: `IF(AND(${columnName(dateIndex + 6)}$3&gt;=$C${row},${columnName(dateIndex + 6)}$3&lt;=$D${row}),1,\"\")` }))]); }).join("");
  const endColumn = columnName(dates.length + 5);
  const conditional = tasks.map((_, index) => { const row = index + 4; const completedPriority = index * 2 + 1; const remainingPriority = completedPriority + 1; return `<conditionalFormatting sqref="F${row}:${endColumn}${row}"><cfRule type="expression" dxfId="${index * 2}" priority="${completedPriority}" stopIfTrue="1"><formula>AND(F$3&gt;=$C${row},F$3&lt;=$D${row},$E${row}&gt;0,F$3&lt;=$C${row}+ROUNDUP(($D${row}-$C${row}+1)*$E${row},0)-1)</formula></cfRule><cfRule type="expression" dxfId="${index * 2 + 1}" priority="${remainingPriority}"><formula>AND(F$3&gt;=$C${row},F$3&lt;=$D${row})</formula></cfRule></conditionalFormatting>`; }).join("");
  const progressValidation = tasks.length ? `<dataValidations count="1"><dataValidation type="decimal" operator="between" allowBlank="0" showErrorMessage="1" errorTitle="請輸入百分比" error="請輸入 0% 到 100% 之間的數值。" sqref="E4:E${tasks.length + 3}"><formula1>0</formula1><formula2>1</formula2></dataValidation></dataValidations>` : "";
  // Date cells need enough room for the localized Excel date format; narrow
  // columns render as ### even though the underlying serial value is correct.
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="5" ySplit="3" topLeftCell="F4" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="15" customWidth="1"/><col min="3" max="4" width="14" customWidth="1"/><col min="5" max="5" width="10" customWidth="1"/><col min="6" max="${dates.length + 5}" width="11" customWidth="1"/></cols><sheetData>${title}${note}${header}${rows}</sheetData><mergeCells count="2"><mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/></mergeCells>${conditional}${progressValidation}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode=";;;"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Microsoft JhengHei"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="18"/><name val="Microsoft JhengHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2F6F62"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFE6E1DA"/></left><right style="thin"><color rgb="FFE6E1DA"/></right><top style="thin"><color rgb="FFE6E1DA"/></top><bottom style="thin"><color rgb="FFE6E1DA"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="14" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment wrapText="1"/></xf><xf numFmtId="10" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/></cellXfs><dxfs count="${colors.length * 2}">${colors.map((color) => `<dxf><fill><patternFill patternType="solid"><fgColor rgb="FF${color.solid}"/><bgColor rgb="FF${color.solid}"/></patternFill></fill></dxf><dxf><fill><patternFill patternType="solid"><fgColor rgb="FF${color.light}"/><bgColor rgb="FF${color.light}"/></patternFill></fill></dxf>`).join("")}</dxfs></styleSheet>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="甘特圖" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(sheet), "xl/styles.xml": strToU8(styles),
  };
  const blob = new Blob([zipSync(files) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, `${projectName || "未命名專案"}.xlsx`);
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial Rounded MT Bold,Noto Sans TC,Microsoft JhengHei,sans-serif"><defs>${patterns}</defs><rect width="100%" height="100%" fill="#fafaf8"/><rect x="24" y="24" width="1552" height="${height - 48}" rx="28" fill="#f1f1ee" stroke="#d8d8d4"/><text x="44" y="90" font-size="30" font-weight="800" fill="#111111">${xml(projectName || "未命名專案")}</text><text x="${chartLeft}" y="72" font-size="13" fill="#777777">PROJECT TIMELINE · ${tasks.length} TASKS</text>${grid}${rows}</svg>`;
}

function downloadImage(tasks: Task[], projectName: string, format: "png" | "jpeg") {
  const svg = buildImageSvg(tasks, projectName); const width = 1600; const height = 230 + tasks.length * 66;
  const image = new Image(); const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const context = canvas.getContext("2d"); if (!context) return; context.fillStyle = "#fafaf8"; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0); canvas.toBlob((blob) => { if (!blob) return; triggerDownload(blob, `${projectName}.${format === "jpeg" ? "jpg" : "png"}`); URL.revokeObjectURL(svgUrl); }, `image/${format}`, .94); };
  image.src = svgUrl;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([blankTask(1)]);
  const [scale, setScale] = useState<"日" | "週" | "月" | "季">("週");
  const [projectName, setProjectName] = useState("未命名專案");
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [showExcel, setShowExcel] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showProjectExport, setShowProjectExport] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("未命名專案");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [screen, setScreen] = useState<"projects" | "editor">("projects");
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [currentProjectId, setCurrentProjectId] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [fileMessage, setFileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("gantt-lab-projects-v2");
        if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) setProjects(parsed); }
      } catch { /* Start clean if browser storage is unavailable. */ }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("gantt-lab-projects-v2", JSON.stringify(projects)); } catch { /* Private browsing may block storage. */ }
  }, [projects, storageReady]);
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
  const saveEditorSnapshot = (nextTasks: Task[], nextName = projectName) => { if (currentProjectId) setProjects((current) => updateProjectSnapshot(current, currentProjectId, nextName, nextTasks)); };
  const update = (id: number, key: keyof Task, value: string | number) => { const next = tasks.map((task) => task.id === id ? { ...task, [key]: value } : task); setTasks(next); saveEditorSnapshot(next); };
  const updateProjectName = (value: string) => { setProjectName(value); saveEditorSnapshot(tasks, value); };
  const moveTask = (targetId: number) => {
    if (!draggedId || draggedId === targetId) return;
    const next = [...tasks]; const from = next.findIndex((item) => item.id === draggedId); const to = next.findIndex((item) => item.id === targetId);
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setTasks(next); saveEditorSnapshot(next);
  };
  const addTask = () => {
    const last = tasks[tasks.length - 1]; const start = last ? addCalendarDays(last.end, 1) : dateInput(new Date()); const end = addCalendarDays(start, 6);
    const next = [...tasks, { id: Date.now(), name: "", owner: "", start, end, progress: 0, color: "#ff3b30", barStyle: "solid" } satisfies Task];
    setTasks(next); saveEditorSnapshot(next);
  };
  const openProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setTasks(project.tasks.map((task) => ({ ...task })));
    setScreen("editor");
  };
  const openCreateProject = () => { setNewProjectName("未命名專案"); setShowCreateProject(true); };
  const createProject = () => { const id = `project-${Date.now()}`; const newTasks = [blankTask()]; const name = newProjectName.trim() || "未命名專案"; const project: Project = { id, name, category: "自訂專案", updated: "剛剛建立", progress: 0, tasks: newTasks }; setProjects((current) => [...current, project]); setCurrentProjectId(id); setProjectName(project.name); setTasks(newTasks); setShowCreateProject(false); setScreen("editor"); };
  const deleteProject = (id: string, name: string) => { if (!window.confirm(`確定刪除「${name}」嗎？此操作無法復原。`)) return; setProjects((current) => current.filter((project) => project.id !== id)); };
  const importProjectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseProjectFile(await file.text());
      setProjects((current) => [...current, ...imported]);
      setFileMessage({ type: "success", text: imported.length === 1 ? `已匯入「${imported[0].name}」` : `已匯入 ${imported.length} 個專案` });
    } catch (error) {
      setFileMessage({ type: "error", text: error instanceof Error ? error.message : "專案檔匯入失敗。" });
    }
  };
  const openSelectiveExport = () => { setSelectedProjectIds([]); setShowProjectExport(true); };
  const toggleProjectSelection = (id: string) => setSelectedProjectIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allProjectsSelected = projects.length > 0 && selectedProjectIds.length === projects.length;
  const toggleAllProjects = () => setSelectedProjectIds(allProjectsSelected ? [] : projects.map((project) => project.id));
  const exportSelectedProjects = () => { const selected = selectProjectsForExport(projects, selectedProjectIds); downloadProjectFile(selected, selected.length === 1 ? selected[0].name : `gantt-lab-${selected.length}個專案-${dateInput(new Date())}`); setShowProjectExport(false); };
  const exportCurrentProject = () => downloadProjectFile([{ id: currentProjectId || `project-${Date.now()}`, name: projectName, category: "自訂專案", updated: "匯出時版本", progress: Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(1, tasks.length)), tasks: tasks.map((task) => ({ ...task })) }], projectName);
  if (screen === "projects") return <main>
    <header className="topbar"><div className="brand"><span>gantt</span><b>!</b><span>lab</span></div></header>
    <section className="project-hub">
      <div className="hub-head"><div><small>PROJECTS</small><h1>我的專案</h1><p>可自動儲存，也能用專案檔備份或移到其他裝置。</p></div><div className="hub-actions"><label className="import-project">↓ 匯入專案檔<input type="file" accept=".json,application/json" onChange={importProjectFile}/></label><button className="backup-projects" onClick={openSelectiveExport} disabled={!projects.length}>↑ 選擇匯出</button><button className="new-project" onClick={openCreateProject}>＋ 新增專案</button></div></div>
      {fileMessage && <div className={`file-message ${fileMessage.type}`} role="status"><span>{fileMessage.type === "success" ? "✓" : "!"}</span>{fileMessage.text}<button onClick={() => setFileMessage(null)} aria-label="關閉訊息">×</button></div>}
      {projects.length === 0 ? <div className="empty-projects"><div>＋</div><h2>還沒有專案</h2><p>建立空白專案，或匯入先前下載的專案檔。</p><button onClick={openCreateProject}>建立第一個專案</button></div> : <div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.id}><button className="project-open" onClick={() => openProject(project)}><div className="project-card-top"><span>{String(index + 1).padStart(2, "0")}</span><i>↗</i></div><div><em>{project.category}</em><h2>{project.name}</h2></div><div className="project-progress"><span><i style={{ width: `${project.progress}%` }}/></span><b>{project.progress}%</b></div><footer><span>{project.tasks.length} 個任務</span><span>{project.updated}</span></footer></button><button className="delete-project" onClick={() => deleteProject(project.id, project.name)}>刪除專案</button></article>)}</div>}
    {showCreateProject && <div className="modal-backdrop" onMouseDown={() => setShowCreateProject(false)}><section className="create-project-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="新增專案"><header><div><small>NEW PROJECT</small><h2>建立新專案</h2><p>先設定專案名稱，再進入甘特圖編輯。</p></div><button onClick={() => setShowCreateProject(false)} aria-label="關閉新增專案">×</button></header><div className="create-project-body"><label>專案名稱<input autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createProject(); }} placeholder="例如：年度活動企劃"/></label><div className="create-project-preview"><span>PROJECT</span><strong>{newProjectName.trim() || "未命名專案"}</strong><small>建立後會先產生一個空白任務</small></div></div><footer><button className="secondary" onClick={() => setShowCreateProject(false)}>取消</button><button className="primary" onClick={createProject}>建立並進入編輯</button></footer></section></div>}
    </section>
    {showProjectExport && <div className="modal-backdrop" onMouseDown={() => setShowProjectExport(false)}><section className="project-export-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="選擇匯出專案"><header><div><small>PROJECT FILE</small><h2>選擇要匯出的專案</h2><p>可勾選一個或多個專案，下載成同一個專案檔。</p></div><button onClick={() => setShowProjectExport(false)} aria-label="關閉選擇匯出">×</button></header><div className="export-select-tools"><button onClick={toggleAllProjects}>{allProjectsSelected ? "取消全選" : "全選"}</button><span>已選擇 <b>{selectedProjectIds.length}</b>／{projects.length} 個</span></div><div className="export-project-list">{projects.map((project) => <label className={selectedProjectIds.includes(project.id) ? "selected" : ""} key={project.id}><input type="checkbox" checked={selectedProjectIds.includes(project.id)} onChange={() => toggleProjectSelection(project.id)}/><span><b>{project.name}</b><small>{project.tasks.length} 個任務 · {project.updated}</small></span><em>{project.progress}%</em></label>)}</div><footer><button className="secondary" onClick={() => setShowProjectExport(false)}>取消</button><button className="primary" disabled={!selectedProjectIds.length} onClick={exportSelectedProjects}>下載 {selectedProjectIds.length ? `${selectedProjectIds.length} 個` : "所選"}專案</button></footer></section></div>}
  </main>;
  return <main>
    <header className="topbar">
      <div className="brand-row"><button className="back-projects" onClick={() => setScreen("projects")}>←</button><div className="brand"><span>gantt</span><b>!</b><span>lab</span></div></div>
      <div className="top-actions"><button className="preview-button" onClick={() => setShowImagePreview(true)}>預覽圖片</button><button className="preview-button" onClick={() => setShowExcel(true)}>預覽 Excel</button><details className="export-menu"><summary>匯出 <span>↗</span></summary><div><button onClick={exportCurrentProject}><b>專案檔</b><span>完整備份，之後可再匯入</span></button><button onClick={() => downloadImage(tasks, projectName, "png")}><b>PNG</b><span>透明度清晰，適合簡報</span></button><button onClick={() => downloadImage(tasks, projectName, "jpeg")}><b>JPG</b><span>檔案較小，方便分享</span></button><button onClick={() => downloadXlsx(tasks, projectName)}><b>Excel</b><span>可繼續修改日期與任務</span></button></div></details></div>
    </header>
    <section className="app-shell">
      <div className="toolbar">
        <div className="project-title"><span className="live-dot"/><input value={projectName} onChange={(event) => updateProjectName(event.target.value)} aria-label="專案名稱"/><small>已儲存</small></div>
        <div className="toolbar-actions"><span>檢視</span><div className="segmented">{(["日","週","月","季"] as const).map((item) => <button key={item} className={scale === item ? "active" : ""} onClick={() => setScale(item)}>{item}</button>)}</div><div className="zoom-control"><button onClick={() => setScale(scaleLevels[Math.max(0, scaleLevels.indexOf(scale) - 1)])} aria-label="縮小時間軸">−</button><input type="range" min="0" max="3" step="1" value={scaleLevels.indexOf(scale)} onChange={(event) => setScale(scaleLevels[Number(event.target.value)])} aria-label="時間軸縮放"/><button onClick={() => setScale(scaleLevels[Math.min(3, scaleLevels.indexOf(scale) + 1)])} aria-label="放大時間軸">＋</button></div></div>
      </div>
      <div className="workspace">
        <aside className="task-panel">
          <div className="panel-title"><div><strong>任務與設定</strong><span>拖曳左側把手即可調整順序</span></div><em>{tasks.length}</em></div>
          <div className="task-list">{tasks.map((task, index) => <article className={`task-card ${draggedId === task.id ? "dragging" : ""}`} key={task.id} draggable onDragStart={() => setDraggedId(task.id)} onDragEnter={() => moveTask(task.id)} onDragOver={(event) => event.preventDefault()} onDragEnd={() => setDraggedId(null)}>
            <button className="drag-handle" aria-label={`拖曳任務 ${task.name}`} title="拖曳調整順序">⠿</button>
            <div className="task-fields"><div className="task-name-line"><span>{String(index + 1).padStart(2, "0")}</span><input className="task-name" value={task.name} placeholder="輸入任務名稱" onChange={(event) => update(task.id, "name", event.target.value)}/></div><div className="task-meta"><label>負責人<input value={task.owner} placeholder="輸入姓名" onChange={(event) => update(task.id, "owner", event.target.value)} aria-label="負責人"/></label><label>開始<input type="date" value={task.start} onChange={(event) => update(task.id, "start", event.target.value)} aria-label="開始日"/></label><span>—</span><label>結束<input type="date" value={task.end} onChange={(event) => update(task.id, "end", event.target.value)} aria-label="結束日"/></label></div><div className="bar-controls"><span>Bar</span><input className="color-input" type="color" value={task.color} onChange={(event) => update(task.id, "color", event.target.value)} aria-label="自訂 Bar 顏色" title="自訂顏色"/><div className="color-palette">{barPalette.map((color) => <button key={color} className={task.color.toLowerCase() === color ? "selected" : ""} style={{ background: color }} onClick={() => update(task.id, "color", color)} aria-label={`選擇色塊 ${color}`}/>)}</div><div className="style-options">{(["solid","outline","stripe","soft"] as BarStyle[]).map((style) => <button key={style} className={`${style} ${task.barStyle === style ? "selected" : ""}`} onClick={() => update(task.id, "barStyle", style)} aria-label={`選擇 ${style} 樣式`}><i style={{ "--swatch": task.color } as React.CSSProperties}/></button>)}</div><label className="progress-control">進度<input type="number" min="0" max="100" step="1" value={task.progress} onChange={(event) => update(task.id, "progress", Math.min(100, Math.max(0, Number(event.target.value))))}/><b>%</b></label></div></div>
            <button className="delete" onClick={() => { if (tasks.length <= 1) return; const next = tasks.filter((item) => item.id !== task.id); setTasks(next); saveEditorSnapshot(next); }} aria-label="刪除任務">×</button>
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
    {showExcel && <div className="modal-backdrop" onMouseDown={() => setShowExcel(false)}><section className="excel-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Excel 匯出預覽"><header><div><span className="excel-icon">X</span><div><strong>{projectName || "未命名專案"}.xlsx</strong><small>動態公式預覽</small></div></div><button onClick={() => setShowExcel(false)}>×</button></header><div className="formula-bar"><span>fx</span><div>=AND(F$3&gt;=$C4,F$3&lt;=$D4,$E4&gt;0,F$3&lt;=$C4+ROUNDUP(($D4-$C4+1)*$E4,0)-1)</div></div><div className="excel-scroll"><div className="excel-sheet"><div className="excel-row excel-columns"><b></b>{["A","B","C","D","E","F","G","H","I","J","K","L"].map((letter) => <span key={letter}>{letter}</span>)}</div><div className="excel-row title-row"><b>1</b><strong>{projectName || "未命名專案"}｜甘特圖</strong></div><div className="excel-row sheet-header"><b>3</b><span>任務</span><span>負責人</span><span>開始日</span><span>結束日</span><span>進度</span>{excelWeeks.map((date) => <span key={date.toISOString()}>{formatDate(date)}</span>)}</div>{tasks.slice(0,6).map((task,index) => <div className="excel-row data-row" key={task.id}><b>{index + 4}</b><span>{task.name || "（未命名任務）"}</span><span>{task.owner || "—"}</span><span>{task.start.slice(5).replace("-","/")}</span><span>{task.end.slice(5).replace("-","/")}</span><span>{task.progress}%</span>{excelWeeks.map((week) => { const weekEnd = new Date(week.getTime() + 6 * day); const taskStart = parseDate(task.start); const taskEnd = parseDate(task.end); const active = taskStart <= weekEnd && taskEnd >= week; const duration = Math.max(1, Math.round((taskEnd.getTime() - taskStart.getTime()) / day) + 1); const completedThrough = new Date(taskStart.getTime() + Math.max(0, Math.ceil(duration * task.progress / 100) - 1) * day); const light = lightenHex(task.color); let background = light; if (completedThrough >= weekEnd) background = task.color; else if (completedThrough >= week) { const completedDays = Math.min(7, Math.max(0, Math.floor((completedThrough.getTime() - week.getTime()) / day) + 1)); background = `linear-gradient(90deg, ${task.color} 0 ${completedDays / 7 * 100}%, ${light} ${completedDays / 7 * 100}% 100%)`; } return <span className={`excel-week-cell ${active ? "active" : ""}`} style={active ? { background } : undefined} key={week.toISOString()}/>; })}</div>)}</div></div><footer><span className="sheet-tab">甘特圖</span><p><i/> 修改日期或進度百分比，Bar 會自動重算；深色為已完成，淺色為尚未完成</p><button onClick={() => { setShowExcel(false); downloadXlsx(tasks, projectName); }}>下載 Excel</button></footer></section></div>}
  </main>;
}
