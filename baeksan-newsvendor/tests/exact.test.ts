// 손계산 값과 코드 결과 비교 (전수 계산)
// 예상 값의 출처: docs/02_손계산.md

import { describe, expect, it } from "vitest";
import { BASE_PARAMS as P } from "../src/params.ts";
import {
  bestWithoutInfo,
  expectedProfit,
  lossProbability,
  profitTable,
} from "../src/profit.ts";
import {
  bestForSignal,
  evpi,
  expectedProfitWithPerfectInfo,
  expectedProfitWithSignal,
  maxServiceFee,
  posterior,
  signalProbability,
} from "../src/bayes.ts";

const MAN = 10_000; // 만원

describe("1번: 이익표", () => {
  it("9칸이 손계산과 같다", () => {
    expect(profitTable(P)).toEqual([
      [400 * MAN, 400 * MAN, 400 * MAN],
      [0, 800 * MAN, 800 * MAN],
      [-400 * MAN, 400 * MAN, 1_200 * MAN],
    ]);
  });
});

describe("1번: 정보가 없을 때", () => {
  it("기대이익 400 / 640 / 480만원", () => {
    const values = P.quantities.map((q) => expectedProfit(q, P.demandProbs, P));
    expect(values[0]).toBeCloseTo(400 * MAN, 6);
    expect(values[1]).toBeCloseTo(640 * MAN, 6);
    expect(values[2]).toBeCloseTo(480 * MAN, 6);
  });

  it("손실 확률 0 / 0 / 0.2 (0원은 손실 아님)", () => {
    const values = P.quantities.map((q) => lossProbability(q, P.demandProbs, P));
    expect(values).toEqual([0, 0, 0.2]);
  });

  it("추천 생산량 2,000개", () => {
    expect(bestWithoutInfo(P).quantity).toBe(2_000);
  });
});

describe("2번: 사후확률", () => {
  it("신호 확률 0.38 / 0.62", () => {
    expect(signalProbability("high", P)).toBeCloseTo(0.38, 12);
    expect(signalProbability("notHigh", P)).toBeCloseTo(0.62, 12);
  });

  it("'고수요' 사후확률 40/380, 100/380, 240/380", () => {
    const post = posterior("high", P);
    expect(post[0]).toBeCloseTo(40 / 380, 12);
    expect(post[1]).toBeCloseTo(100 / 380, 12);
    expect(post[2]).toBeCloseTo(240 / 380, 12);
  });

  it("'고수요 아님' 사후확률 160/620, 400/620, 60/620", () => {
    const post = posterior("notHigh", P);
    expect(post[0]).toBeCloseTo(160 / 620, 12);
    expect(post[1]).toBeCloseTo(400 / 620, 12);
    expect(post[2]).toBeCloseTo(60 / 620, 12);
  });
});

describe("2번: 신호별 최적 생산량", () => {
  it("'고수요' 기대이익 400 / 715.8 / 821.1만원, 최적 3,000개", () => {
    const post = posterior("high", P);
    const values = P.quantities.map((q) => expectedProfit(q, post, P) / MAN);
    expect(values[0]).toBeCloseTo(400, 6);
    expect(values[1]).toBeCloseTo(272_000 / 380, 6); // 715.789…
    expect(values[2]).toBeCloseTo(312_000 / 380, 6); // 821.052…
    expect(bestForSignal("high", P).quantity).toBe(3_000);
  });

  it("'고수요 아님' 기대이익 400 / 593.5 / 271.0만원, 최적 2,000개", () => {
    const post = posterior("notHigh", P);
    const values = P.quantities.map((q) => expectedProfit(q, post, P) / MAN);
    expect(values[0]).toBeCloseTo(400, 6);
    expect(values[1]).toBeCloseTo(368_000 / 620, 6); // 593.548…
    expect(values[2]).toBeCloseTo(168_000 / 620, 6); // 270.967…
    expect(bestForSignal("notHigh", P).quantity).toBe(2_000);
  });
});

describe("3번: 정보의 가치", () => {
  it("서비스를 쓸 때 기대이익 680만원", () => {
    expect(expectedProfitWithSignal(P)).toBeCloseTo(680 * MAN, 4);
  });

  it("최대 이용료 40만원", () => {
    expect(maxServiceFee(P)).toBeCloseTo(40 * MAN, 4);
  });

  it("완전정보 기대이익 840만원, 완전정보의 가치 200만원", () => {
    expect(expectedProfitWithPerfectInfo(P)).toBeCloseTo(840 * MAN, 6);
    expect(evpi(P)).toBeCloseTo(200 * MAN, 6);
  });
});
