import type { SeotdaCard } from "../card/Card.js";
import { calculateHandRank, type HandRank } from "./HandRank.js";

/**
 * variant 조합에 의존하는 특수패.
 *
 * - amhaengeosa (암행어사, 47): 4월 열끗[두견새] + 7월 열끗[멧돼지]
 * - ttangjabi (땡잡이, 37): 3월 광 + 7월 열끗[멧돼지]
 * - gusa (구사, 94 일반): 4월 아무 variant + 9월 아무 variant
 * - meongtungguri-gusa (멍텅구리구사, 94 특수): 4월 열끗[두견새] + 9월 열끗[술잔]
 *
 * 이 넷은 서로 다른 (월, variant) 카드를 요구하고, 각 (월, variant) 카드는
 * 20장 덱에 정확히 1장뿐이므로 같은 판에서 두 플레이어가 서로 다른 특수패를
 * 동시에 들고 있는 조합은 카드 구성상 자연히 제한된다 (예: 암행어사와 땡잡이는
 * 둘 다 "7월 열끗"을 요구하므로 동시에 존재할 수 없음).
 */
export type SpecialHandKind =
  | "amhaengeosa"
  | "ttangjabi"
  | "gusa"
  | "meongtungguri-gusa";

/**
 * 특수패 판정 결과.
 * 2인 대결(handA vs handB) 기준으로 판정한다.
 */
export type SpecialMatchupOutcome =
  | { outcome: "normal" }
  | { outcome: "rematch"; reason: Extract<SpecialHandKind, "gusa" | "meongtungguri-gusa"> }
  | {
      outcome: "special-win";
      winner: "A" | "B";
      kind: Extract<SpecialHandKind, "amhaengeosa" | "ttangjabi">;
    };

function hasCard(
  hand: readonly [SeotdaCard, SeotdaCard],
  month: SeotdaCard["month"],
  variant: SeotdaCard["variant"]
): boolean {
  return hand.some((c) => c.month === month && c.variant === variant);
}

/**
 * 손패가 어떤 특수패에 해당하는지 판정한다 (variant 조합 기준).
 * 해당 없으면 null.
 */
export function identifySpecialHand(
  hand: readonly [SeotdaCard, SeotdaCard]
): SpecialHandKind | null {
  if (hasCard(hand, 4, "yeolkkeut") && hasCard(hand, 7, "yeolkkeut")) {
    return "amhaengeosa";
  }
  if (hasCard(hand, 3, "gwang") && hasCard(hand, 7, "yeolkkeut")) {
    return "ttangjabi";
  }
  // 멍텅구리구사(정확한 variant 조합)를 일반 구사보다 먼저 검사해야
  // 더 강한 특수패로 우선 인식된다.
  if (hasCard(hand, 4, "yeolkkeut") && hasCard(hand, 9, "yeolkkeut")) {
    return "meongtungguri-gusa";
  }
  const months = hand.map((c) => c.month);
  if (months.includes(4) && months.includes(9)) {
    return "gusa";
  }
  return null;
}

/** 일반 구사: 상대 패가 "알리 이하"(땡/광땡이 아닌 모든 것)면 무효화 대상 */
function qualifiesForGusaInvalidation(opponentRank: HandRank): boolean {
  return opponentRank.type !== "gwang-ttang" && opponentRank.type !== "ttang";
}

/**
 * 멍텅구리구사: 상대 패가 "9땡 이하"면 무효화 대상.
 * 단, 광땡·10땡(장땡)은 제외되고, 상대가 암행어사/땡잡이 특수패인 경우도
 * (평소 판정이 1끗/망통으로 보이더라도) 명시적으로 제외된다.
 */
function qualifiesForMeongtungguriInvalidation(
  opponentRank: HandRank,
  opponentSpecial: SpecialHandKind | null
): boolean {
  if (opponentSpecial === "amhaengeosa" || opponentSpecial === "ttangjabi") {
    return false;
  }
  if (opponentRank.type === "gwang-ttang") {
    return false;
  }
  if (opponentRank.type === "ttang" && opponentRank.value === 10) {
    return false;
  }
  return true;
}

/** 암행어사: 상대가 13광땡(value 4) 또는 18광땡(value 9)일 때만 승리. 38광땡(value 11)은 무적. */
function qualifiesForAmhaengeosaWin(opponentRank: HandRank): boolean {
  return opponentRank.type === "gwang-ttang" && opponentRank.value !== 3 + 8;
}

/** 땡잡이: 상대가 1땡~9땡일 때만 승리. 10땡(장땡)은 못 이김. */
function qualifiesForTtangjabiWin(opponentRank: HandRank): boolean {
  return opponentRank.type === "ttang" && opponentRank.value <= 9;
}

/**
 * 2인 대결에서 특수패 규칙을 적용해 결과를 판정한다.
 * "normal"이 나오면 기존 calculateHandRank/compareHandRank로 통상 비교하면 된다
 * (암행어사/땡잡이는 이 경우 자동으로 1끗/망통 값을 갖는다).
 */
export function resolveSpecialMatchup(
  handA: readonly [SeotdaCard, SeotdaCard],
  handB: readonly [SeotdaCard, SeotdaCard]
): SpecialMatchupOutcome {
  const rankA = calculateHandRank(handA);
  const rankB = calculateHandRank(handB);
  const specialA = identifySpecialHand(handA);
  const specialB = identifySpecialHand(handB);

  if (specialA === "gusa" && qualifiesForGusaInvalidation(rankB)) {
    return { outcome: "rematch", reason: "gusa" };
  }
  if (
    specialA === "meongtungguri-gusa" &&
    qualifiesForMeongtungguriInvalidation(rankB, specialB)
  ) {
    return { outcome: "rematch", reason: "meongtungguri-gusa" };
  }
  if (specialB === "gusa" && qualifiesForGusaInvalidation(rankA)) {
    return { outcome: "rematch", reason: "gusa" };
  }
  if (
    specialB === "meongtungguri-gusa" &&
    qualifiesForMeongtungguriInvalidation(rankA, specialA)
  ) {
    return { outcome: "rematch", reason: "meongtungguri-gusa" };
  }

  if (specialA === "amhaengeosa" && qualifiesForAmhaengeosaWin(rankB)) {
    return { outcome: "special-win", winner: "A", kind: "amhaengeosa" };
  }
  if (specialA === "ttangjabi" && qualifiesForTtangjabiWin(rankB)) {
    return { outcome: "special-win", winner: "A", kind: "ttangjabi" };
  }
  if (specialB === "amhaengeosa" && qualifiesForAmhaengeosaWin(rankA)) {
    return { outcome: "special-win", winner: "B", kind: "amhaengeosa" };
  }
  if (specialB === "ttangjabi" && qualifiesForTtangjabiWin(rankA)) {
    return { outcome: "special-win", winner: "B", kind: "ttangjabi" };
  }

  return { outcome: "normal" };
}
