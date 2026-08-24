export type ProjectFileBarStyle = "solid" | "outline" | "stripe" | "soft";

export type ProjectFileTask = {
  id: number;
  name: string;
  owner: string;
  start: string;
  end: string;
  progress: number;
  color: string;
  barStyle: ProjectFileBarStyle;
  milestone?: boolean;
};

export type ProjectFileProject = {
  id: string;
  name: string;
  category: string;
  updated: string;
  progress: number;
  tasks: ProjectFileTask[];
};

type PortableProjectFile = {
  format: "gantt-lab";
  version: 1;
  exportedAt: string;
  projects: ProjectFileProject[];
};

const barStyles = new Set<ProjectFileBarStyle>(["solid", "outline", "stripe", "soft"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const colorPattern = /^#[0-9a-f]{6}$/i;

function objectValue(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeTask(value: unknown, id: number): ProjectFileTask {
  const task = objectValue(value, "專案中的任務格式不正確。");
  const start = textValue(task.start);
  const end = textValue(task.end);
  if (!datePattern.test(start) || !datePattern.test(end)) throw new Error("任務日期格式不正確。");
  if (start > end) throw new Error("任務的結束日期不可早於開始日期。");
  const progress = Number(task.progress);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error("任務進度必須介於 0 到 100。");
  const color = textValue(task.color, "#ff3b30");
  if (!colorPattern.test(color)) throw new Error("任務顏色格式不正確。");
  const barStyle = textValue(task.barStyle, "solid") as ProjectFileBarStyle;
  if (!barStyles.has(barStyle)) throw new Error("任務 Bar 樣式不正確。");

  return {
    id,
    name: textValue(task.name),
    owner: textValue(task.owner),
    start,
    end,
    progress,
    color: color.toLowerCase(),
    barStyle,
    milestone: task.milestone === true || undefined,
  };
}

export function createProjectFile(projects: ProjectFileProject[]) {
  if (!projects.length) throw new Error("目前沒有可匯出的專案。");
  const payload: PortableProjectFile = {
    format: "gantt-lab",
    version: 1,
    exportedAt: new Date().toISOString(),
    projects,
  };
  return JSON.stringify(payload, null, 2);
}

export function selectProjectsForExport(projects: ProjectFileProject[], selectedIds: string[]): ProjectFileProject[] {
  if (!selectedIds.length) throw new Error("請至少選擇一個專案。");
  const selected = new Set(selectedIds);
  const result = projects.filter((project) => selected.has(project.id));
  if (!result.length) throw new Error("找不到可匯出的專案。");
  return result;
}

export function updateProjectSnapshot(projects: ProjectFileProject[], projectId: string, name: string, tasks: ProjectFileTask[]) {
  const progress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(1, tasks.length));
  return projects.map((project) => project.id === projectId ? { ...project, name, tasks: tasks.map((task) => ({ ...task })), progress, updated: "剛剛更新" } : project);
}

export function parseProjectFile(text: string, now = Date.now()): ProjectFileProject[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("無法讀取這個專案檔，請確認檔案沒有損壞。");
  }

  const file = objectValue(parsed, "專案檔格式不正確。");
  if (file.format !== "gantt-lab" || file.version !== 1 || !Array.isArray(file.projects)) throw new Error("這不是支援的 gantt!lab 專案檔。");
  if (!file.projects.length) throw new Error("專案檔中沒有可匯入的專案。");

  return file.projects.map((value, projectIndex) => {
    const project = objectValue(value, "專案格式不正確。");
    if (!Array.isArray(project.tasks) || !project.tasks.length) throw new Error("每個專案至少需要一個任務。");
    const tasks = project.tasks.map((task, taskIndex) => normalizeTask(task, now + projectIndex * 10000 + taskIndex));
    return {
      id: `imported-${now}-${projectIndex}`,
      name: textValue(project.name, "匯入的專案") || "匯入的專案",
      category: "匯入專案",
      updated: "剛剛匯入",
      progress: Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length),
      tasks,
    };
  });
}
