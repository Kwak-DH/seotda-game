import { Deck } from "../../card/Deck.js";
import type { GameState } from "../GameState.js";

/**
 * 모든 살아있는(다이하지 않은) 플레이어에게 2장씩 패를 분배한다.
 * 순수 함수: 새로운 GameState와 사용된 Deck을 반환.
 */
export function dealCards(state: GameState, deck: Deck): GameState {
  const newPlayers = state.players.map((player) => {
    const hand = [deck.draw(), deck.draw()];
    return { ...player, hand, isDead: false, totalBet: 0, isAllIn: false, hasActed: false };
  });

  return {
    ...state,
    players: newPlayers,
    phase: "betting",
    pot: 0,
    lastBetAmount: state.baseBet,
    results: null,
    winners: null,
    specialWin: null,
    // 직전 판이 홀수 번의 베팅 액션(예: AI 레이즈 후 콜)으로 끝나면 currentPlayerIndex가
    // 그대로 남아있을 수 있으므로, 새 판 시작 시 항상 살아있는 첫 플레이어로 되돌린다.
    currentPlayerIndex: newPlayers.findIndex((p) => !p.isDead),
  };
}

/** 새 판을 위해 덱을 생성하고 셔플한다. */
export function createShuffledDeckForRound(rng?: () => number): Deck {
  return Deck.createShuffled(rng);
}
