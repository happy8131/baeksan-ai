// 2번: 사후확률과 신호별 최적 생산량
// 3번: 예측 서비스를 쓸 때 기대이익, 최대 이용료, 완전정보의 가치
// 식의 근거: docs/01_근거_유도.md "베이즈 정리", "정보의 가치"

import type { Params, Signal } from "./params.ts";
import { SIGNALS } from "./params.ts";
import { bestQuantity, bestWithoutInfo, profit, type BestChoice } from "./profit.ts";

// P(신호 | 수요 = d)
// 수요 3,000개: '고수요' a, '고수요 아님' 1 − a
// 수요 1,000·2,000개: '고수요' 1 − a, '고수요 아님' a
export function signalLikelihood(signal: Signal, demand: number, params: Params): number {
  const pHigh = demand === params.highDemand ? params.accuracy : 1 - params.accuracy;
  return signal === "high" ? pHigh : 1 - pHigh;
}

// P(신호) = Σ_d P(신호 | D = d) · P(D = d)   (전확률 법칙)
export function signalProbability(signal: Signal, params: Params): number {
  return params.demands.reduce(
    (sum, d, j) => sum + signalLikelihood(signal, d, params) * params.demandProbs[j],
    0,
  );
}

// P(D = d | 신호) = P(신호 | D = d) · P(D = d) / P(신호)   (베이즈 정리)
export function posterior(signal: Signal, params: Params): number[] {
  const evidence = signalProbability(signal, params);
  return params.demands.map(
    (d, j) => (signalLikelihood(signal, d, params) * params.demandProbs[j]) / evidence,
  );
}

// 신호별 최적 생산량과 그때의 기대이익
export function bestForSignal(signal: Signal, params: Params): BestChoice {
  return bestQuantity(posterior(signal, params), params);
}

// 예측 서비스를 쓸 때 기대이익 (이용료 차감 전)
// = Σ_S P(S) · max_Q E[이익(Q) | S]
export function expectedProfitWithSignal(params: Params): number {
  return SIGNALS.reduce(
    (sum, s) => sum + signalProbability(s, params) * bestForSignal(s, params).expectedProfit,
    0,
  );
}

// 지불 가능한 최대 이용료 = 서비스 사용 시 기대이익 − 정보 없을 때 최적 기대이익
// 이용료가 이 값과 같아도 지불 가능으로 본다 (docs/문항_검토.md 2번)
export function maxServiceFee(params: Params): number {
  return expectedProfitWithSignal(params) - bestWithoutInfo(params).expectedProfit;
}

// 완전정보가 있을 때 기대이익 = Σ_d P(D = d) · max_Q 이익(Q, d)
export function expectedProfitWithPerfectInfo(params: Params): number {
  return params.demands.reduce((sum, d, j) => {
    const bestProfit = Math.max(...params.quantities.map((q) => profit(q, d, params)));
    return sum + params.demandProbs[j] * bestProfit;
  }, 0);
}

// 완전정보의 가치 (EVPI)
export function evpi(params: Params): number {
  return expectedProfitWithPerfectInfo(params) - bestWithoutInfo(params).expectedProfit;
}
