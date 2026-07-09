import { describe, it, expect } from "vitest";
import { decideBasicAiAction } from "../src/ai/BasicAI.js";
import type { SeotdaCard } from "../src/card/Card.js";

function card(month: SeotdaCard["month"], isGwang: boolean): SeotdaCard {
  const variant: SeotdaCard["variant"] = isGwang ? "gwang" : "yeolkkeut";
  return { month, isGwang, variant, id: `${month}-${isGwang ? "g" : "p"}`, label: "" };
}

describe("decideBasicAiAction", () => {
  it("광땡이면 레이즈한다", () => {
    const action = decideBasicAiAction([card(1, true), card(8, true)], 100);
    expect(action.type).toBe("raise");
  });

  it("땡이면 레이즈한다", () => {
    const action = decideBasicAiAction([card(7, false), card(7, false)], 100);
    expect(action.type).toBe("raise");
  });

  it("알리면 레이즈한다", () => {
    const action = decideBasicAiAction([card(1, false), card(2, false)], 100);
    expect(action.type).toBe("raise");
  });

  it("구삥(중간 강도)이면 콜한다", () => {
    const action = decideBasicAiAction([card(1, false), card(9, false)], 100);
    expect(action.type).toBe("call");
  });

  it("8끗(중간 강도)이면 콜한다", () => {
    // 예: 1월+7월=8끗
    const action = decideBasicAiAction([card(1, false), card(7, false)], 100);
    expect(action.type).toBe("call");
  });

  it("망통이면 블러핑 확률 0일 때 다이한다", () => {
    const action = decideBasicAiAction([card(3, false), card(7, false)], 100, {
      bluffRate: 0,
    });
    expect(action.type).toBe("die");
  });

  it("약한 패라도 블러핑 확률 1이면 콜한다", () => {
    const action = decideBasicAiAction([card(3, false), card(7, false)], 100, {
      bluffRate: 1,
      rng: () => 0, // 0 < 1 이므로 항상 블러핑
    });
    expect(action.type).toBe("call");
  });

  it("레이즈 금액은 직전 베팅의 2배다", () => {
    const action = decideBasicAiAction([card(5, false), card(5, false)], 150);
    expect(action).toEqual({ type: "raise", amount: 300 });
  });
});
