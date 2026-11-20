// 문제 조건
// 출처: 백산이엔지과제.md 02번 "문제 조건"

export type Signal = "high" | "notHigh";

export const SIGNALS: Signal[] = ["high", "notHigh"];

export type Params = {
  // 개당 생산비 (원)
  cost: number;
  // 개당 판매가격 (원)
  price: number;
  // 미판매품 개당 처분가격 (원)
  salvage: number;
  // 선택할 수 있는 생산량 (개)
  quantities: number[];
  // 가능한 수요 (개)
  demands: number[];
  // 각 수요의 사전확률 (demands와 같은 순서)
  demandProbs: number[];
  // 신호 정확도 a: 수요 3,000개일 때 '고수요' 확률. 1,000·2,000개일 때 '고수요' 확률은 1 − a
  accuracy: number;
  // '고수요'로 보는 수요 (개)
  highDemand: number;
};

// 기본 조건 (a = 0.8)
export const BASE_PARAMS: Params = {
  cost: 6_000,
  price: 10_000,
  salvage: 2_000,
  quantities: [1_000, 2_000, 3_000],
  demands: [1_000, 2_000, 3_000],
  demandProbs: [0.2, 0.5, 0.3],
  accuracy: 0.8,
  highDemand: 3_000,
};

// 원 → 만원 (출력용)
export const toManwon = (won: number): number => won / 10_000;
