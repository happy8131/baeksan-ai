// UserPromptSubmit 훅이 호출하는 스크립트
// 표준 입력으로 받은 프롬프트를 prompt_history.csv 에 한 행으로 덧붙인다.
// 표준 출력에는 아무것도 쓰지 않는다(출력하면 대화 맥락에 섞여 들어간다).
import { appendFileSync } from "node:fs";
import { appendRow, ERROR_LOG_PATH, formatKst, TOOL_NAME } from "./csv.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const now = new Date();
  const input = JSON.parse(await readStdin()) as { prompt?: unknown };
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (prompt !== "") {
    appendRow({ time: formatKst(now), tool: TOOL_NAME, prompt });
  }
} catch (error) {
  // 기록에 실패해도 프롬프트 전송은 막지 않는다
  try {
    appendFileSync(ERROR_LOG_PATH, `${new Date().toISOString()} ${String(error)}\n`, "utf8");
  } catch {
    // 오류 기록까지 실패하면 조용히 넘어간다
  }
}
process.exit(0);
