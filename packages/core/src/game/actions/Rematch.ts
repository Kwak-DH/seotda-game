import { Deck } from "../../card/Deck.js";
import type { GameState, Player } from "../GameState.js";

/**
 * 구사(무효화)로 판이 무효 처리됐을 때 재경기 대기 상태로 전환한다.
 * 팟은 그대로 유지되고, 이번 판에서 다이했던 플레이어는 재경기에서 제외되어
 * rejoinRematch로 재참여 배팅을 해야만 다음 판에 다시 낄 수 있다.
 */
export function markPlayersForRematch(state: GameState): GameState {
  return {
    ...state,
    phase: "rematch",
    results: null,
    winners: null,
    specialWin: null,
    players: state.players.map((p): Player => ({
      ...p,
      excludedFromRematch: p.isDead,
    })),
  };
}

export interface RejoinResult {
  success: boolean;
  error?: string;
  state: GameState;
}

/**
 * 재경기에서 제외된 플레이어가 팟의 rebuyRatio만큼 배팅하고 재참여한다.
 */
export function rejoinRematch(state: GameState, playerId: string): RejoinResult {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: "존재하지 않는 플레이어입니다.", state };
  }
  if (state.phase !== "rematch") {
    return { success: false, error: "재경기 대기 상태가 아닙니다.", state };
  }
  if (!player.excludedFromRematch) {
    return { success: false, error: "재참여가 필요한 플레이어가 아닙니다.", state };
  }

  const rebuyAmount = Math.ceil(state.pot * state.rebuyRatio);
  if (player.chips < rebuyAmount) {
    return { success: false, error: "칩이 부족하여 재참여할 수 없습니다.", state };
  }

  return {
    success: true,
    state: {
      ...state,
      pot: state.pot + rebuyAmount,
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, chips: p.chips - rebuyAmount, excludedFromRematch: false }
          : p
      ),
    },
  };
}

/**
 * 재경기 판을 딜한다. 팟은 리셋하지 않고 그대로 이월하며,
 * excludedFromRematch인 플레이어는 카드를 받지 않고 다이 상태로 대기한다.
 */
export function dealRematchCards(state: GameState, deck: Deck): GameState {
  const newPlayers = state.players.map((player): Player => {
    if (player.excludedFromRematch) {
      return {
        ...player,
        hand: [],
        isDead: true,
        totalBet: 0,
        isAllIn: false,
        hasActed: false,
      };
    }
    const hand = [deck.draw(), deck.draw()];
    return {
      ...player,
      hand,
      isDead: false,
      totalBet: 0,
      isAllIn: false,
      hasActed: false,
    };
  });

  return {
    ...state,
    players: newPlayers,
    phase: "betting",
    lastBetAmount: state.baseBet,
    results: null,
    winners: null,
    specialWin: null,
    // 직전 판이 홀수 번의 베팅 액션으로 끝나 currentPlayerIndex가 남아있을 수 있으므로,
    // 재경기 딜 시에도 살아있는(재경기에서 제외되지 않은) 첫 플레이어로 되돌린다.
    currentPlayerIndex: newPlayers.findIndex((p) => !p.isDead),
  };
}
