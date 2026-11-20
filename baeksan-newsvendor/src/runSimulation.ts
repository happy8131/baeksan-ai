// 4번: 몬테카를로 결과를 정확한 값과 비교해 출력한다.
// 실행: npm run simulate   (결과를 results/simulate.txt 에도 저장)

import { writeFileSync } from "node:fs";
import { BASE_PARAMS as P, toManwon } from "./params.ts";
import { bestWithoutInfo } from "./profit.ts";
import { expectedProfitWithPerfectInfo, expectedProfitWithSignal } from "./bayes.ts";
import { STRATEGIES, STRATEGY_LABELS, simulate, type StrategyName } from "./simulate.ts";

const SEED = 2026;
const SAMPLE_SIZES = [100, 1_000, 10_000, 100_000, 1_000_000];
const EXTRA_SEEDS = [1, 2, 3, 4, 5];

const exact: Record<StrategyName, number> = {
  noInfo: bestWithoutInfo(P).expectedProfit,
  signal: expectedProfitWithSignal(P),
  perfect: expectedProfitWithPerfectInfo(P),
};

const lines: string[] = [];
const out = (text = "") => lines.push(text);
const man = (won: number) => toManwon(won).toFixed(1);

out("# 몬테카를로 시뮬레이션");
out(`입력: 기본 조건 (a = ${P.accuracy}, 생산비 ${P.cost}원), 시드 ${SEED}`);
out("순서: ① 수요 → ② 신호 → ③ 생산량(전략별) → ④ 이익. 세 전략은 같은 ①② 표본을 쓴다.");
out();

out("## 표본 수에 따른 추정값 (만원)");
out("| 전략 | 표본 수 | 추정 기대이익 | 정확한 값 | 오차 | 표준오차 |");
out("|---|---|---|---|---|---|");
for (const name of STRATEGIES) {
  for (const n of SAMPLE_SIZES) {
    const { mean, standardError } = simulate(n, SEED, P).estimates[name];
    out(`| ${STRATEGY_LABELS[name]} | ${n.toLocaleString()} | ${man(mean)} | ${man(exact[name])} | ${man(mean - exact[name])} | ${man(standardError)} |`);
  }
}
out();

out("## '고수요' 신호 비율 (정확한 값 0.38)");
for (const n of SAMPLE_SIZES) {
  out(`${n.toLocaleString()}번: ${simulate(n, SEED, P).highSignalRate.toFixed(4)}`);
}
out();

out(`## 시드를 바꿔 본 정보 없음 전략 (정확한 값 ${man(exact.noInfo)}만원)`);
for (const n of [100, 100_000]) {
  const means = EXTRA_SEEDS.map((seed) => man(simulate(n, seed, P).estimates.noInfo.mean));
  out(`${n.toLocaleString()}번, 시드 ${EXTRA_SEEDS.join("·")}: ${means.join(" / ")}`);
}

const text = lines.join("\n") + "\n";
process.stdout.write(text);
writeFileSync(new URL("../results/simulate.txt", import.meta.url), text);
