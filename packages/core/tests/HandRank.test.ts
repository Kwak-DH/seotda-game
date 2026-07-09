import { describe, it, expect } from "vitest";
import { calculateHandRank, compareHandRank } from "../src/rules/HandRank.js";
import type { SeotdaCard } from "../src/card/Card.js";

/** 테스트용 카드 헬퍼 */
function card(month: SeotdaCard["month"], isGwang: boolean): SeotdaCard {
  return { month, isGwang, id: `${month}-${isGwang ? "g" : "p"}`, label: "" };
}

describe("calculateHandRank", () => {
  it("38광땡을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(3, true), card(8, true)]);
    expect(rank.type).toBe("gwang-ttang");
    expect(rank.label).toBe("38광땡");
  });

  it("18광땡을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(1, true), card(8, true)]);
    expect(rank.type).toBe("gwang-ttang");
    expect(rank.label).toBe("18광땡");
  });

  it("13광땡을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(1, true), card(3, true)]);
    expect(rank.type).toBe("gwang-ttang");
    expect(rank.label).toBe("13광땡");
  });

  it("38광땡 > 18광땡 > 13광땡 순으로 강하다", () => {
    const sam8 = calculateHandRank([card(3, true), card(8, true)]);
    const il8 = calculateHandRank([card(1, true), card(8, true)]);
    const ilsam = calculateHandRank([card(1, true), card(3, true)]);

    expect(compareHandRank(sam8, il8)).toBeGreaterThan(0);
    expect(compareHandRank(il8, ilsam)).toBeGreaterThan(0);
  });

  it("땡을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(5, false), card(5, false)]);
    expect(rank.type).toBe("ttang");
    expect(rank.value).toBe(5);
    expect(rank.label).toBe("5땡");
  });

  it("땡끼리는 월이 높을수록 강하다", () => {
    const low = calculateHandRank([card(2, false), card(2, false)]);
    const high = calculateHandRank([card(9, false), card(9, false)]);
    expect(compareHandRank(high, low)).toBeGreaterThan(0);
  });

  it("1땡~10땡을 모두 정확히 판정하고, 월이 높을수록 강하다", () => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
    const ranks = months.map((month) => calculateHandRank([card(month, false), card(month, false)]));

    ranks.forEach((rank, i) => {
      const month = months[i]!;
      expect(rank.type).toBe("ttang");
      expect(rank.value).toBe(month);
      expect(rank.label).toBe(`${month}땡`);
    });

    for (let i = 1; i < ranks.length; i++) {
      expect(compareHandRank(ranks[i]!, ranks[i - 1]!)).toBeGreaterThan(0);
    }
  });

  it("알리(1,2)를 정확히 판정한다", () => {
    const rank = calculateHandRank([card(1, false), card(2, false)]);
    expect(rank.type).toBe("ali");
  });

  it("독사(1,4)를 정확히 판정한다", () => {
    const rank = calculateHandRank([card(4, false), card(1, false)]);
    expect(rank.type).toBe("doksa");
  });

  it("구삥(1,9)을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(9, false), card(1, false)]);
    expect(rank.type).toBe("gubbing");
  });

  it("장삥(1,10)을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(10, false), card(1, false)]);
    expect(rank.type).toBe("jangbbing");
  });

  it("장사(4,10)를 정확히 판정한다", () => {
    const rank = calculateHandRank([card(10, false), card(4, false)]);
    expect(rank.type).toBe("jangsa");
  });

  it("세륙(4,6)을 정확히 판정한다", () => {
    const rank = calculateHandRank([card(6, false), card(4, false)]);
    expect(rank.type).toBe("seryuk");
  });

  it("일반 끗수를 정확히 계산한다 (예: 2월+7월=9끗)", () => {
    const rank = calculateHandRank([card(2, false), card(7, false)]);
    expect(rank.type).toBe("kkeut");
    expect(rank.value).toBe(9);
  });

  it("일반 끗수를 정확히 계산한다 (8월+9월=7끗)", () => {
    const rank = calculateHandRank([card(8, false), card(9, false)]);
    expect(rank.type).toBe("kkeut");
    expect(rank.value).toBe(7);
  });

  it("일반 끗수를 정확히 계산한다 (10월+9월=9끗)", () => {
    const rank = calculateHandRank([card(10, false), card(9, false)]);
    expect(rank.type).toBe("kkeut");
    expect(rank.value).toBe(9);
  });

  it("망통(0끗)을 정확히 판정한다 (예: 3월+7월=10 → 0끗)", () => {
    const rank = calculateHandRank([card(3, false), card(7, false)]);
    expect(rank.type).toBe("mangtong");
    expect(rank.value).toBe(0);
  });

  it("4월+6월(합 10)은 망통이 아니라 세륙으로 판정된다", () => {
    const rank = calculateHandRank([card(4, false), card(6, false)]);
    expect(rank.type).toBe("seryuk");
    expect(rank.type).not.toBe("mangtong");
  });

  it("카드 입력 순서가 바뀌어도 동일한 결과를 낸다", () => {
    const a = calculateHandRank([card(5, false), card(3, false)]);
    const b = calculateHandRank([card(3, false), card(5, false)]);
    expect(a).toEqual(b);
  });
});

describe("compareHandRank - 족보 우선순위", () => {
  it("광땡 > 땡", () => {
    const gwangTtang = calculateHandRank([card(1, true), card(8, true)]);
    const ttang = calculateHandRank([card(9, false), card(9, false)]);
    expect(compareHandRank(gwangTtang, ttang)).toBeGreaterThan(0);
  });

  it("땡 > 알리", () => {
    const ttang = calculateHandRank([card(2, false), card(2, false)]);
    const ali = calculateHandRank([card(1, false), card(2, false)]);
    expect(compareHandRank(ttang, ali)).toBeGreaterThan(0);
  });

  it("알리 > 독사 > 구삥 > 장삥 > 장사 > 세륙", () => {
    const ali = calculateHandRank([card(1, false), card(2, false)]);
    const doksa = calculateHandRank([card(1, false), card(4, false)]);
    const gubbing = calculateHandRank([card(1, false), card(9, false)]);
    const jangbbing = calculateHandRank([card(1, false), card(10, false)]);
    const jangsa = calculateHandRank([card(4, false), card(10, false)]);
    const seryuk = calculateHandRank([card(4, false), card(6, false)]);

    expect(compareHandRank(ali, doksa)).toBeGreaterThan(0);
    expect(compareHandRank(doksa, gubbing)).toBeGreaterThan(0);
    expect(compareHandRank(gubbing, jangbbing)).toBeGreaterThan(0);
    expect(compareHandRank(jangbbing, jangsa)).toBeGreaterThan(0);
    expect(compareHandRank(jangsa, seryuk)).toBeGreaterThan(0);
  });

  it("세륙 > 일반 9끗", () => {
    const seryuk = calculateHandRank([card(4, false), card(6, false)]);
    const kkeut9 = calculateHandRank([card(2, false), card(7, false)]);
    expect(compareHandRank(seryuk, kkeut9)).toBeGreaterThan(0);
  });

  it("일반 끗수는 숫자가 높을수록 강하다", () => {
    const kkeut9 = calculateHandRank([card(2, false), card(7, false)]);
    // 3끗 예시: 5월+8월=13 → 3끗
    const kkeut3 = calculateHandRank([card(5, false), card(8, false)]);
    expect(compareHandRank(kkeut9, kkeut3)).toBeGreaterThan(0);
  });

  it("끗수 > 망통", () => {
    const kkeut1 = calculateHandRank([card(2, false), card(9, false)]);
    const mangtong = calculateHandRank([card(3, false), card(7, false)]);
    expect(compareHandRank(kkeut1, mangtong)).toBeGreaterThan(0);
  });

  it("동일 끗수는 무승부(0)", () => {
    const a = calculateHandRank([card(2, false), card(7, false)]); // 9끗
    const b = calculateHandRank([card(4, false), card(5, false)]); // 9끗
    expect(compareHandRank(a, b)).toBe(0);
  });
});
