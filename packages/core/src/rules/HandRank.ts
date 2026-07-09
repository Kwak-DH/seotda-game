import type { SeotdaCard } from "../card/Card.js";

/**
 * 섯다 족보 종류 (우선순위 높은 순서로 나열).
 *
 * 우선순위 (높음 → 낮음):
 * 1. 광땡: 광패(1,3,8월) 두 장 조합. 38광땡 > 18광땡 > 13광땡 세 조합만 존재
 * 2. 땡 (같은 월 두 장)
 * 3. 특수 조합: 알리 > 독사 > 구삥 > 장삥 > 장사 > 세륙
 * 4. 끗수 (0~9끗, 두 카드 월의 합의 일의 자리)
 * 5. 망통 (0끗, 합이 10 or 20)
 */
export type HandType =
  | "gwang-ttang"   // 광땡 (38 > 18 > 13)
  | "ttang"         // 땡
  | "ali"           // 알리 (1,2)
  | "doksa"         // 독사 (1,4)
  | "gubbing"       // 구삥 (1,9)
  | "jangbbing"     // 장삥 (1,10)
  | "jangsa"        // 장사 (4,10)
  | "seryuk"        // 세륙 (4,6)
  | "kkeut"         // 일반 끗수 (1~9끗)
  | "mangtong";     // 망통 (0끗)

export interface HandRank {
  type: HandType;
  /** 같은 타입 내에서 비교할 때 쓰는 수치 (땡의 경우 월 숫자, 끗수의 경우 끗수 값 등) */
  value: number;
  /** 사용자에게 보여줄 이름 */
  label: string;
}

/**
 * 두 장의 카드로 족보를 계산한다.
 * 입력 순서는 무관 (정렬해서 처리).
 */
export function calculateHandRank(hand: readonly [SeotdaCard, SeotdaCard]): HandRank {
  const [a, b] = hand;
  const sorted = [a, b].sort((x, y) => x.month - y.month);
  const [low, high] = sorted as [SeotdaCard, SeotdaCard];

  // 1. 광땡: 광패(1,3,8월)만 존재하므로 두 장 모두 광이면 조합은
  // {1,3}, {1,8}, {3,8} 세 가지뿐이다. 월 합이 클수록 강하다 (38 > 18 > 13).
  if (low.isGwang && high.isGwang) {
    return {
      type: "gwang-ttang",
      value: low.month + high.month,
      label: `${low.month}${high.month}광땡`,
    };
  }

  // 2. 땡: 같은 월 두 장
  if (low.month === high.month) {
    return {
      type: "ttang",
      value: low.month,
      label: `${low.month}땡`,
    };
  }

  // 3. 특수 조합 (월 조합으로 판정)
  const pair = `${low.month}-${high.month}`;
  const SPECIAL: Record<string, { type: HandType; label: string; value: number }> = {
    "1-2": { type: "ali", label: "알리", value: 205 },
    "1-4": { type: "doksa", label: "독사", value: 204 },
    "1-9": { type: "gubbing", label: "구삥", value: 203 },
    "1-10": { type: "jangbbing", label: "장삥", value: 202 },
    "4-10": { type: "jangsa", label: "장사", value: 201 },
    "4-6": { type: "seryuk", label: "세륙", value: 200 },
  };
  const special = SPECIAL[pair];
  if (special) {
    return special;
  }

  // 4. 일반 끗수: 두 월의 합의 일의 자리
  const sum = (low.month + high.month) % 10;
  if (sum === 0) {
    return { type: "mangtong", value: 0, label: "망통 (0끗)" };
  }
  return { type: "kkeut", value: sum, label: `${sum}끗` };
}

/**
 * 족보 타입별 전역 우선순위 (숫자가 높을수록 강함).
 * 광땡 > 땡 > 알리 > 독사 > 구삥 > 장삥 > 장사 > 세륙 > 끗수 > 망통
 */
const TYPE_PRIORITY: Record<HandType, number> = {
  "gwang-ttang": 10,
  "ttang": 9,
  "ali": 8,
  "doksa": 7,
  "gubbing": 6,
  "jangbbing": 5,
  "jangsa": 4,
  "seryuk": 3,
  "kkeut": 2,
  "mangtong": 1,
};

/**
 * 두 족보를 비교한다.
 * @returns a가 b보다 강하면 양수, 약하면 음수, 동일하면 0
 */
export function compareHandRank(a: HandRank, b: HandRank): number {
  const priorityDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
  if (priorityDiff !== 0) return priorityDiff;

  // 같은 타입 내 비교
  // - 땡: 월이 높을수록 강함
  // - 끗수: 값이 높을수록 강함
  // - 광땡: 월 합(value)이 클수록 강함 (38 > 18 > 13)
  // - 알리/독사/구삥/장삥/장사/세륙: 동일 조합만 존재하므로 항상 무승부(0)
  return a.value - b.value;
}
