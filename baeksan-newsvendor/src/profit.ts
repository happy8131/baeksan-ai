// 1번: 이익표, 기대이익, 손실 확률
// 식의 근거: docs/01_근거_유도.md "이익 계산식", "기대이익", "손실 확률"

import type { Params } from "./params.ts";

// 이익(Q, D) = p·min(Q, D) + s·(Q − min(Q, D)) − c·Q  (원)
export function profit(quantity: number, demand: number, params: Params): number {
  const sold = Math.min(quantity, demand);
  const leftover = quantity - sold;
  return params.price * sold + params.salvage * leftover - params.cost * quantity;
}

// 이익표: profitTable[i][j] = 이익(quantities[i], demands[j])
export function profitTable(params: Params): number[][] {
  return params.quantities.map((q) => params.demands.map((d) => profit(q, d, params)));
}

// E[이익(Q)] = Σ_d P(D = d) · 이익(Q, d)
// probs를 사후확률로 바꾸면 신호를 받은 뒤의 기대이익이 된다 (2번)
export function expectedProfit(quantity: number, probs: number[], params: Params): number {
  return params.demands.reduce((sum, d, j) => sum + probs[j] * profit(quantity, d, params), 0);
}

// P(손실 | Q) = 이익 < 0 인 수요의 확률 합
// 이익이 정확히 0원인 경우는 손실에 넣지 않는다 (docs/문항_검토.md 1번)
export function lossProbability(quantity: number, probs: number[], params: Params): number {
  return params.demands.reduce(
    (sum, d, j) => (profit(quantity, d, params) < 0 ? sum + probs[j] : sum),
    0,
  );
}

export type BestChoice = { quantity: number; expectedProfit: number };

// 주어진 확률에서 기대이익이 가장 큰 생산량
// 같은 값이 여럿이면 먼저 나온(작은) 생산량을 고른다
export function bestQuantity(probs: number[], params: Params): BestChoice {
  let best: BestChoice = { quantity: params.quantities[0], expectedProfit: -Infinity };
  for (const q of params.quantities) {
    const value = expectedProfit(q, probs, params);
    if (value > best.expectedProfit + 1e-9) best = { quantity: q, expectedProfit: value };
  }
  return best;
}

// 정보가 없을 때 최적 전략
export function bestWithoutInfo(params: Params): BestChoice {
  return bestQuantity(params.demandProbs, params);
}
