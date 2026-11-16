// 프롬프트 히스토리 CSV를 읽고 쓰는 공통 함수
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CSV_PATH = join(import.meta.dirname, "prompt_history.csv");
export const ERROR_LOG_PATH = join(import.meta.dirname, "log_errors.txt");
export const TOOL_NAME = "Claude Code";

const BOM = "﻿";
const HEADER = ["작성시각", "도구", "프롬프트"];

export type PromptRow = { time: string; tool: string; prompt: string };

// 한국 시간 기준 "YYYY-MM-DD HH:MM:SS"
export function formatKst(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  return parts.replace(",", "");
}

// "YYYY-MM-DD HH:MM:SS"(한국 시간)를 밀리초로 변환
export function parseKst(text: string): number {
  return Date.parse(text.replace(" ", "T") + "+09:00");
}

function escapeField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toLine(fields: string[]): string {
  return fields.map(escapeField).join(",") + "\r\n";
}

// 파일이 없으면 BOM과 머리글을 먼저 쓴다
export function ensureCsv(): void {
  if (!existsSync(CSV_PATH)) {
    writeFileSync(CSV_PATH, BOM + toLine(HEADER), "utf8");
  }
}

export function appendRow(row: PromptRow): void {
  ensureCsv();
  appendFileSync(CSV_PATH, toLine([row.time, row.tool, row.prompt]), "utf8");
}

export function writeRows(rows: PromptRow[]): void {
  const body = rows.map((r) => toLine([r.time, r.tool, r.prompt])).join("");
  writeFileSync(CSV_PATH, BOM + toLine(HEADER) + body, "utf8");
}

// 따옴표 안의 쉼표와 줄바꿈을 처리하는 CSV 파서
export function readRows(): PromptRow[] {
  if (!existsSync(CSV_PATH)) return [];
  const text = readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "");
  const records: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      fields.push(field);
      records.push(fields);
      fields = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || fields.length > 0) {
    fields.push(field);
    records.push(fields);
  }
  return records
    .slice(1)
    .filter((r) => r.length >= 3)
    .map((r) => ({ time: r[0], tool: r[1], prompt: r[2] }));
}
