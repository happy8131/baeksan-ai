// 훅이 놓친 프롬프트를 Claude Code 세션 기록(JSONL)에서 읽어 CSV에 보충한다.
// 세션 기록에 남은 실제 시각과 내용을 그대로 쓰며, 이미 있는 행은 건너뛴다.
// 실행: node prompts/backfill-prompts.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { formatKst, parseKst, readRows, TOOL_NAME, writeRows, type PromptRow } from "./csv.ts";

// 같은 프롬프트로 볼 시각 차이(훅 시각과 세션 기록 시각은 조금 다르다)
const SAME_PROMPT_WINDOW_MS = 60_000;

// 프로젝트 경로를 Claude Code의 세션 폴더 이름으로 바꾼다 (영문자·숫자 외에는 "-")
const projectDir = resolve(import.meta.dirname, "..", "..");
const sessionDir = join(homedir(), ".claude", "projects", projectDir.replace(/[^a-zA-Z0-9]/g, "-"));

type Entry = {
  type?: string;
  timestamp?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  promptSource?: unknown;
  userFeedback?: unknown;
  message?: { content?: unknown };
};

// 사용자가 직접 입력한 글만 고른다
function extractPrompt(entry: Entry): string | null {
  if (entry.type !== "user" || entry.isMeta || entry.isSidechain) return null;
  // 계획 승인 창 등에서 직접 적어 보낸 의견
  if (typeof entry.userFeedback === "string" && entry.userFeedback.trim() !== "") {
    return entry.userFeedback.trim();
  }
  const content = entry.message?.content;
  if (typeof content !== "string" || entry.promptSource === undefined) return null;
  const text = content.trim();
  // 슬래시 명령의 내부 표기와 그 출력은 제외
  if (text === "" || text.startsWith("<command-name>") || text.startsWith("<local-command")) return null;
  return text;
}

if (!existsSync(sessionDir)) {
  console.error(`세션 기록 폴더를 찾지 못했습니다: ${sessionDir}`);
  process.exit(1);
}

const found: PromptRow[] = [];
for (const file of readdirSync(sessionDir).filter((f) => f.endsWith(".jsonl"))) {
  for (const line of readFileSync(join(sessionDir, file), "utf8").split("\n")) {
    if (line.trim() === "") continue;
    let entry: Entry;
    try {
      entry = JSON.parse(line) as Entry;
    } catch {
      continue;
    }
    const prompt = extractPrompt(entry);
    if (prompt === null || !entry.timestamp) continue;
    found.push({ time: formatKst(new Date(entry.timestamp)), tool: TOOL_NAME, prompt });
  }
}

const rows = readRows();
let added = 0;
for (const candidate of found) {
  const candidateTime = parseKst(candidate.time);
  const exists = rows.some(
    (row) =>
      row.prompt === candidate.prompt &&
      Math.abs(parseKst(row.time) - candidateTime) <= SAME_PROMPT_WINDOW_MS,
  );
  if (!exists) {
    rows.push(candidate);
    added++;
  }
}

rows.sort((a, b) => parseKst(a.time) - parseKst(b.time));
writeRows(rows);
console.log(`세션 기록에서 찾은 프롬프트 ${found.length}개, 새로 추가 ${added}개, 전체 ${rows.length}행`);
