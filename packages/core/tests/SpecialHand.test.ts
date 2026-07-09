import { describe, it, expect } from "vitest";
import {
  identifySpecialHand,
  resolveSpecialMatchup,
} from "../src/rules/SpecialHand.js";
import { calculateHandRank } from "../src/rules/HandRank.js";
import type { SeotdaCard, Month, CardVariant } from "../src/card/Card.js";

/** 테스트용 카드 헬퍼: 월/variant를 직접 지정 */
function card(month: Month, variant: CardVariant): SeotdaCard {
  return {
    month,
    variant,
    isGwang: variant === "gwang",
    id: `${month}-${variant}`,
    label: "",
  };
}

// 특수패를 구성하는 카드들
const AMHAENGEOSA_HAND: [SeotdaCard, SeotdaCard] = [
  card(4, "yeolkkeut"), // 두견새
  card(7, "yeolkkeut"), // 멧돼지
];
const TTANGJABI_HAND: [SeotdaCard, SeotdaCard] = [
  card(3, "gwang"),
  card(7, "yeolkkeut"), // 멧돼지
];
const MEONGTUNGGURI_HAND: [SeotdaCard, SeotdaCard] = [
  card(4, "yeolkkeut"), // 두견새
  card(9, "yeolkkeut"), // 술잔
];
const GENERAL_GUSA_HAND: [SeotdaCard, SeotdaCard] = [
  card(4, "chodan"),
  card(9, "cheongdan"),
];

describe("identifySpecialHand", () => {
  it("암행어사(4월 열끗+7월 열끗)를 정확히 판정한다", () => {
    expect(identifySpecialHand(AMHAENGEOSA_HAND)).toBe("amhaengeosa");
  });

  it("땡잡이(3월 광+7월 열끗)를 정확히 판정한다", () => {
    expect(identifySpecialHand(TTANGJABI_HAND)).toBe("ttangjabi");
  });

  it("멍텅구리구사(4월 열끗+9월 열끗)를 정확히 판정한다", () => {
    expect(identifySpecialHand(MEONGTUNGGURI_HAND)).toBe("meongtungguri-gusa");
  });

  it("일반 구사(4월 아무 variant+9월 아무 variant)를 정확히 판정한다", () => {
    expect(identifySpecialHand(GENERAL_GUSA_HAND)).toBe("gusa");
  });

  it("4월 초단+7월 열끗은 암행어사가 아니다 (variant 불일치)", () => {
    const hand: [SeotdaCard, SeotdaCard] = [card(4, "chodan"), card(7, "yeolkkeut")];
    expect(identifySpecialHand(hand)).not.toBe("amhaengeosa");
    expect(identifySpecialHand(hand)).toBeNull();
  });

  it("4월 열끗+7월 홑껍데기는 암행어사가 아니다 (7월 variant 불일치)", () => {
    const hand: [SeotdaCard, SeotdaCard] = [card(4, "yeolkkeut"), card(7, "hotgeopdegi")];
    expect(identifySpecialHand(hand)).toBeNull();
  });

  it("3월 광+7월 홑껍데기는 땡잡이가 아니다 (7월 variant 불일치)", () => {
    const hand: [SeotdaCard, SeotdaCard] = [card(3, "gwang"), card(7, "hotgeopdegi")];
    expect(identifySpecialHand(hand)).toBeNull();
  });

  it("특수패 조합이 아니면 null을 반환한다", () => {
    const hand: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")];
    expect(identifySpecialHand(hand)).toBeNull();
  });
});

describe("암행어사 - 평상시 취급 및 승리 조건", () => {
  it("평상시엔 1끗 패로 취급된다 (4+7=11 -> 1끗)", () => {
    const rank = calculateHandRank(AMHAENGEOSA_HAND);
    expect(rank.type).toBe("kkeut");
    expect(rank.value).toBe(1);
  });

  it("상대가 13광땡이면 암행어사가 승리한다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(1, "gwang"), card(3, "gwang")];
    const result = resolveSpecialMatchup(AMHAENGEOSA_HAND, opponent);
    expect(result).toEqual({ outcome: "special-win", winner: "A", kind: "amhaengeosa" });
  });

  it("상대가 18광땡이면 암행어사가 승리한다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(1, "gwang"), card(8, "gwang")];
    const result = resolveSpecialMatchup(AMHAENGEOSA_HAND, opponent);
    expect(result).toEqual({ outcome: "special-win", winner: "A", kind: "amhaengeosa" });
  });

  it("상대가 38광땡이면 암행어사도 못 이긴다 (무적)", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(3, "gwang"), card(8, "gwang")];
    const result = resolveSpecialMatchup(AMHAENGEOSA_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });

  it("상대에게 13/18광땡이 없으면 그냥 1끗으로 취급되어 다른 패와 정상 경쟁한다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")]; // 7끗
    const result = resolveSpecialMatchup(AMHAENGEOSA_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });

  it("반대편(B)이 암행어사를 들고 있어도 동일하게 승리 판정된다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(1, "gwang"), card(8, "gwang")];
    const result = resolveSpecialMatchup(opponent, AMHAENGEOSA_HAND);
    expect(result).toEqual({ outcome: "special-win", winner: "B", kind: "amhaengeosa" });
  });
});

describe("땡잡이 - 평상시 취급 및 승리 조건", () => {
  it("평상시엔 망통으로 취급된다 (3+7=10 -> 망통)", () => {
    const rank = calculateHandRank(TTANGJABI_HAND);
    expect(rank.type).toBe("mangtong");
  });

  it("상대가 1땡~9땡이면 땡잡이가 승리한다", () => {
    for (let month = 1; month <= 9; month++) {
      const opponent: [SeotdaCard, SeotdaCard] = [
        card(month as Month, "yeolkkeut"),
        card(month as Month, month === 1 ? "hongdan" : "chodan"),
      ];
      // 자기 자신과 겹치지 않는 variant 조합으로만 땡 구성 (월별 스펙과 무관하게 순수 판정 로직만 테스트)
      const result = resolveSpecialMatchup(TTANGJABI_HAND, opponent);
      expect(result).toEqual({ outcome: "special-win", winner: "A", kind: "ttangjabi" });
    }
  });

  it("상대가 10땡(장땡)이면 땡잡이도 못 이긴다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(10, "yeolkkeut"), card(10, "cheongdan")];
    const result = resolveSpecialMatchup(TTANGJABI_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });

  it("상대에게 땡이 없으면 망통으로 취급되어 정상 경쟁한다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")]; // 7끗
    const result = resolveSpecialMatchup(TTANGJABI_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });
});

describe("구사 - 무효화 및 재경기 조건", () => {
  it("상대가 알리 이하 족보(예: 알리)면 무효 처리된다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(1, "hongdan"), card(2, "yeolkkeut")]; // 알리
    const result = resolveSpecialMatchup(GENERAL_GUSA_HAND, opponent);
    expect(result).toEqual({ outcome: "rematch", reason: "gusa" });
  });

  it("상대가 일반 끗수면 무효 처리된다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")]; // 7끗
    const result = resolveSpecialMatchup(GENERAL_GUSA_HAND, opponent);
    expect(result).toEqual({ outcome: "rematch", reason: "gusa" });
  });

  it("상대가 망통이면 무효 처리된다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(3, "hongdan"), card(7, "hotgeopdegi")]; // 망통
    const result = resolveSpecialMatchup(GENERAL_GUSA_HAND, opponent);
    expect(result).toEqual({ outcome: "rematch", reason: "gusa" });
  });

  it("상대가 땡이면 무효 처리되지 않는다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(5, "yeolkkeut"), card(5, "chodan")];
    const result = resolveSpecialMatchup(GENERAL_GUSA_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });

  it("상대가 광땡이면 무효 처리되지 않는다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(1, "gwang"), card(8, "gwang")];
    const result = resolveSpecialMatchup(GENERAL_GUSA_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });
});

describe("멍텅구리구사 - 무효화 및 재경기 조건", () => {
  it("상대가 9땡이면 무효 처리된다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(9, "yeolkkeut"), card(9, "cheongdan")];
    const result = resolveSpecialMatchup(MEONGTUNGGURI_HAND, opponent);
    expect(result).toEqual({ outcome: "rematch", reason: "meongtungguri-gusa" });
  });

  it("상대가 알리 이하 족보면 무효 처리된다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "chodan")]; // 7끗
    const result = resolveSpecialMatchup(MEONGTUNGGURI_HAND, opponent);
    expect(result).toEqual({ outcome: "rematch", reason: "meongtungguri-gusa" });
  });

  it("상대가 10땡(장땡)이면 무효 처리되지 않는다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(10, "yeolkkeut"), card(10, "cheongdan")];
    const result = resolveSpecialMatchup(MEONGTUNGGURI_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });

  it("상대가 광땡이면 무효 처리되지 않는다", () => {
    const opponent: [SeotdaCard, SeotdaCard] = [card(3, "gwang"), card(8, "gwang")];
    const result = resolveSpecialMatchup(MEONGTUNGGURI_HAND, opponent);
    expect(result.outcome).toBe("normal");
  });

  it("상대가 암행어사(평소 1끗으로 보임)여도 무효 처리되지 않는다 (명시적 제외)", () => {
    const result = resolveSpecialMatchup(MEONGTUNGGURI_HAND, AMHAENGEOSA_HAND);
    expect(result.outcome).toBe("normal");
  });

  it("상대가 땡잡이(평소 망통으로 보임)여도 무효 처리되지 않는다 (명시적 제외)", () => {
    const result = resolveSpecialMatchup(MEONGTUNGGURI_HAND, TTANGJABI_HAND);
    expect(result.outcome).toBe("normal");
  });
});

describe("resolveSpecialMatchup - 사용자 제공 예시", () => {
  it("특수패가 아닌 두 손패끼리는 normal을 반환한다", () => {
    const handA: [SeotdaCard, SeotdaCard] = [card(4, "chodan"), card(10, "cheongdan")]; // 장사
    const handB: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")]; // 7끗
    expect(resolveSpecialMatchup(handA, handB).outcome).toBe("normal");
  });
});
