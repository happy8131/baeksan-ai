// 4번: 몬테카를로 시뮬레이션
// 무작위 장사 한 번의 순서
//   ① 수요를 뽑는다      (수요 확률 0.2 / 0.5 / 0.3)
//   ② 신호를 뽑는다      (뽑힌 수요에 따라 P(고수요 | D) 가 달라진다)
//   ③ 생산량을 정한다    (전략별: 정보 없음은 아무것도 보지 않고, 예측 서비스는 신호만, 완전정보는 수요를 본다)
//   ④ 이익을 계산한다    (생산량과 실제 수요로 계산)
// 세 전략은 ③만 다르고, 같은 ①② 표본을 함께 쓴다.

import type { Params, Signal } from "./params.ts";
import { profit, bestWithoutInfo } from "./profit.ts";
import { bestForSignal, signalLikelihood } from "./bayes.ts";

export type StrategyName = "noInfo" | "signal" | "perfect";
export const STRATEGIES: readonly StrategyName[] = ["noInfo", "signal", "perfect"];
export const STRATEGY_LABELS: Record<StrategyName, string> = {
  noInfo: "정보 없음",
  signal: "예측 서비스",
  perfect: "완전정보",
};

// 시드를 정하면 같은 난수열이 나오는 난수 생성기 (mulberry32)
// 0 이상 1 미만의 수를 돌려준다.
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ① 수요: 누적확률 0.2 / 0.7 / 1.0 구간 중 u 가 들어가는 칸
export function sampleDemand(u: number, params: Params): number {
  let cumulative = 0;
  for (let j = 0; j < params.demands.length; j++) {
    cumulative += params.demandProbs[j];
    if (u < cumulative) return params.demands[j];
  }
  return params.demands[params.demands.length - 1];
}

// ② 신호: 수요가 3,000개면 a, 아니면 1 − a 의 확률로 '고수요'
export function sampleSignal(u: number, demand: number, params: Params): Signal {
  return u < signalLikelihood("high", demand, params) ? "high" : "notHigh";
}

// ③ 전략별 생산량 규칙. 예측 서비스 규칙은 신호만 받는다(수요를 볼 수 없다).
export function createPolicies(params: Params) {
  const noInfoQuantity = bestWithoutInfo(params).quantity;
  const signalQuantity: Record<Signal, number> = {
    high: bestForSignal("high", params).quantity,
    notHigh: bestForSignal("notHigh", params).quantity,
  };
  const perfectQuantity = (demand: number) =>
    params.quantities.reduce((best, q) =>
      profit(q, demand, params) > profit(best, demand, params) ? q : best,
    );
  return {
    noInfo: () => noInfoQuantity,
    signal: (signal: Signal) => signalQuantity[signal],
    perfect: (demand: number) => perfectQuantity(demand),
  };
}

export type StrategyEstimate = {
  mean: number; // 표본 평균 이익 (원)
  standardError: number; // 표준오차 = 표본 표준편차 / √n (원)
};

export type SimulationResult = {
  samples: number;
  seed: number;
  highSignalRate: number; // '고수요' 신호가 나온 비율 (정확한 값 0.38)
  estimates: Record<StrategyName, StrategyEstimate>;
};

export function simulate(samples: number, seed: number, params: Params): SimulationResult {
  const random = createRandom(seed);
  const policies = createPolicies(params);
  const sum: Record<StrategyName, number> = { noInfo: 0, signal: 0, perfect: 0 };
  const sumSq: Record<StrategyName, number> = { noInfo: 0, signal: 0, perfect: 0 };
  let highCount = 0;

  for (let i = 0; i < samples; i++) {
    const demand = sampleDemand(random(), params); // ①
    const signal = sampleSignal(random(), demand, params); // ②
    if (signal === "high") highCount++;

    const quantities: Record<StrategyName, number> = {
      noInfo: policies.noInfo(), // ③ 아무것도 보지 않음
      signal: policies.signal(signal), // ③ 신호만 봄
      perfect: policies.perfect(demand), // ③ 수요를 봄
    };
    for (const name of STRATEGIES) {
      const value = profit(quantities[name], demand, params); // ④
      sum[name] += value;
      sumSq[name] += value * value;
    }
  }

  const estimate = (name: StrategyName): StrategyEstimate => {
    const mean = sum[name] / samples;
    const variance = samples > 1 ? (sumSq[name] - samples * mean * mean) / (samples - 1) : 0;
    return { mean, standardError: Math.sqrt(Math.max(variance, 0) / samples) };
  };

  return {
    samples,
    seed,
    highSignalRate: highCount / samples,
    estimates: {
      noInfo: estimate("noInfo"),
      signal: estimate("signal"),
      perfect: estimate("perfect"),
    },
  };
}
