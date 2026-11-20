// 몬테카를로 결과가 정확한 값(640 / 680 / 840만원)에 가까운지 확인
// 정확한 값의 출처: docs/02_손계산.md, tests/exact.test.ts

import { describe, expect, it } from "vitest";
import { BASE_PARAMS as P } from "../src/params.ts";
import { bestWithoutInfo } from "../src/profit.ts";
import { expectedProfitWithPerfectInfo, expectedProfitWithSignal } from "../src/bayes.ts";
import {
  STRATEGIES,
  createPolicies,
  sampleDemand,
  sampleSignal,
  simulate,
  type StrategyName,
} from "../src/simulate.ts";

const exact: Record<StrategyName, number> = {
  noInfo: bestWithoutInfo(P).expectedProfit,
  signal: expectedProfitWithSignal(P),
  perfect: expectedProfitWithPerfectInfo(P),
};

describe("4번: 표본 뽑기와 생산량 규칙", () => {
  it("수요는 누적확률 0.2 / 0.7 경계로 나뉜다", () => {
    expect(sampleDemand(0.19, P)).toBe(1_000);
    expect(sampleDemand(0.2, P)).toBe(2_000);
    expect(sampleDemand(0.69, P)).toBe(2_000);
    expect(sampleDemand(0.7, P)).toBe(3_000);
  });

  it("신호는 수요 3,000개면 0.8, 아니면 0.2 확률로 '고수요'", () => {
    expect(sampleSignal(0.79, 3_000, P)).toBe("high");
    expect(sampleSignal(0.81, 3_000, P)).toBe("notHigh");
    expect(sampleSignal(0.19, 2_000, P)).toBe("high");
    expect(sampleSignal(0.21, 2_000, P)).toBe("notHigh");
  });

  it("생산량 규칙: 정보 없음 2,000 / 신호 3,000·2,000 / 완전정보 수요만큼", () => {
    const policies = createPolicies(P);
    expect(policies.noInfo()).toBe(2_000);
    expect(policies.signal("high")).toBe(3_000);
    expect(policies.signal("notHigh")).toBe(2_000);
    expect(P.demands.map(policies.perfect)).toEqual([1_000, 2_000, 3_000]);
  });
});

describe("4번: 시뮬레이션", () => {
  it("같은 시드면 같은 결과가 나온다", () => {
    expect(simulate(1_000, 7, P)).toEqual(simulate(1_000, 7, P));
  });

  it("표본 100만 번이면 세 전략 모두 정확한 값과 표준오차 4배 이내", () => {
    const result = simulate(1_000_000, 2026, P);
    for (const name of STRATEGIES) {
      const { mean, standardError } = result.estimates[name];
      expect(Math.abs(mean - exact[name])).toBeLessThan(4 * standardError);
    }
    expect(result.highSignalRate).toBeCloseTo(0.38, 2);
  });
});
