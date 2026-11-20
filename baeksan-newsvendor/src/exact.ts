// 기본 조건(a = 0.8, 생산비 6,000원)의 정확한 값을 출력한다.
// 실행: npm run exact   (결과를 results/exact.txt 에도 저장)

import { writeFileSync } from "node:fs";
import { BASE_PARAMS as P, SIGNALS, toManwon } from "./params.ts";
import { bestWithoutInfo, expectedProfit, lossProbability, profitTable } from "./profit.ts";
import {
  bestForSignal,
  evpi,
  expectedProfitWithPerfectInfo,
  expectedProfitWithSignal,
  maxServiceFee,
  posterior,
  signalProbability,
} from "./bayes.ts";

const lines: string[] = [];
const out = (text = "") => lines.push(text);
const man = (won: number) => `${toManwon(won).toFixed(1)}만원`;

out("# 정확한 값 (전수 계산)");
out(`입력: 생산비 ${P.cost}원, 판매가 ${P.price}원, 처분가 ${P.salvage}원, 수요 확률 ${P.demandProbs.join(" / ")}, a = ${P.accuracy}`);
out();

out("## 1번 이익표 (행: 생산량, 열: 수요 1,000 / 2,000 / 3,000)");
profitTable(P).forEach((row, i) => out(`생산 ${P.quantities[i]}: ${row.map(man).join(" / ")}`));
out();

out("## 1번 정보가 없을 때");
for (const q of P.quantities) {
  out(`생산 ${q}: 기대이익 ${man(expectedProfit(q, P.demandProbs, P))}, 손실 확률 ${lossProbability(q, P.demandProbs, P)}`);
}
out(`추천: ${bestWithoutInfo(P).quantity}개`);
out();

out("## 2번 신호별");
for (const s of SIGNALS) {
  const post = posterior(s, P);
  const best = bestForSignal(s, P);
  out(`${s === "high" ? "고수요" : "고수요 아님"}: P = ${signalProbability(s, P).toFixed(4)}, 사후확률 ${post.map((p) => p.toFixed(4)).join(" / ")}`);
  out(`  기대이익 ${P.quantities.map((q) => man(expectedProfit(q, post, P))).join(" / ")} → 최적 ${best.quantity}개`);
}
out();

out("## 3번 정보의 가치");
out(`서비스를 쓸 때 기대이익: ${man(expectedProfitWithSignal(P))}`);
out(`최대 이용료: ${man(maxServiceFee(P))}`);
out(`완전정보 기대이익: ${man(expectedProfitWithPerfectInfo(P))}`);
out(`완전정보의 가치: ${man(evpi(P))}`);

const text = lines.join("\n") + "\n";
process.stdout.write(text);
writeFileSync(new URL("../results/exact.txt", import.meta.url), text);
