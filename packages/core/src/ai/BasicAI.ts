import { calculateHandRank, type HandRank, type HandType } from "../rules/HandRank.js";
import type { SeotdaCard } from "../card/Card.js";
import type { BetAction } from "../game/actions/Bet.js";

/**
 * 족보 타입을 3단계 강도로 분류.
 * AI의 베팅 판단 기준으로 사용.
 */
type HandStrength = "strong" | "medium" | "weak";

const STRENGTH_MAP: Record<HandType, HandStrength> = {
  "gwang-ttang": "strong",
  "ttang": "strong",
  "ali": "strong",
  "doksa": "medium",
  "gubbing": "medium",
  "jangbbing": "medium",
  "jangsa": "medium",
  "seryuk": "medium",
  "kkeut": "medium", // 끗수는 값에 따라 아래에서 재조정
  "mangtong": "weak",
};

function classifyStrength(rank: HandRank): HandStrength {
  if (rank.type === "kkeut") {
    // 끗수는 값(1~9)에 따라 세분화: 7~9는 medium, 1~6은 weak
    return rank.value >= 7 ? "medium" : "weak";
  }
  return STRENGTH_MAP[rank.type];
}

export interface BasicAiOptions {
  /** 블러핑(약한 패로도 가끔 콜/레이즈) 확률 (0~1). 기본 0.1 */
  bluffRate?: number;
  /** 난수 생성기 (테스트용 주입 가능) */
  rng?: () => number;
}

/**
 * 규칙 기반 기본 AI.
 * 족보 강도에 따라 결정론적으로 행동하되, 약한 패에서도 낮은 확률로
 * 블러핑을 섞어 완전히 읽히지 않도록 한다.
 *
 * - strong (광땡/땡/알리): 레이즈
 * - medium (독사/구삥/장삥/세륙/7~9끗): 콜
 * - weak (0~6끗/망통): 다이 (블러핑 확률로 콜)
 */
export function decideBasicAiAction(
  hand: readonly [SeotdaCard, SeotdaCard],
  lastBetAmount: number,
  options: BasicAiOptions = {}
): BetAction {
  const { bluffRate = 0.1, rng = Math.random } = options;
  const rank = calculateHandRank(hand);
  const strength = classifyStrength(rank);

  switch (strength) {
    case "strong":
      return { type: "raise", amount: lastBetAmount * 2 };
    case "medium":
      return { type: "call" };
    case "weak":
      if (rng() < bluffRate) {
        return { type: "call" };
      }
      return { type: "die" };
  }
}
