import type { GameState, Player } from "../GameState.js";

/** 플레이어가 취할 수 있는 베팅 액션 */
export type BetAction =
  | { type: "call" }                       // 콜: 직전 베팅액만큼 따라감
  | { type: "die" }                        // 다이: 판 포기
  | { type: "raise"; amount: number }      // 레이즈: 직전 베팅액보다 더 베팅
  | { type: "check" };                     // 체크: 베팅 없이 넘김 (첫 턴 등)

export interface BetResult {
  success: boolean;
  error?: string;
  state: GameState;
}

/**
 * 베팅 액션을 처리하여 새로운 GameState를 반환한다.
 * 순수 함수: 입력 state를 변경하지 않고 새 객체를 만들어 반환.
 */
export function applyBetAction(
  state: GameState,
  playerId: string,
  action: BetAction
): BetResult {
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "존재하지 않는 플레이어입니다.", state };
  }
  if (state.phase !== "betting") {
    return { success: false, error: "베팅 단계가 아닙니다.", state };
  }
  if (state.currentPlayerIndex !== playerIndex) {
    return { success: false, error: "해당 플레이어의 차례가 아닙니다.", state };
  }

  const player = state.players[playerIndex]!;
  if (player.isDead) {
    return { success: false, error: "이미 다이한 플레이어입니다.", state };
  }

  let updatedPlayer: Player = player;
  let potDelta = 0;
  let newLastBetAmount = state.lastBetAmount;

  switch (action.type) {
    case "die": {
      updatedPlayer = { ...player, isDead: true, hasActed: true };
      break;
    }
    case "check": {
      // 베팅 없이 그대로 넘김 (변화 없음)
      updatedPlayer = { ...player, hasActed: true };
      break;
    }
    case "call": {
      // 칩이 직전 베팅액보다 적으면 가진 만큼만 베팅하는 "올인"으로 처리
      const callAmount = Math.min(state.lastBetAmount, player.chips);
      if (callAmount <= 0) {
        return { success: false, error: "베팅할 칩이 없습니다.", state };
      }
      updatedPlayer = {
        ...player,
        chips: player.chips - callAmount,
        totalBet: player.totalBet + callAmount,
        isAllIn: callAmount < state.lastBetAmount,
        hasActed: true,
      };
      potDelta = callAmount;
      break;
    }
    case "raise": {
      // 레이즈는 최소 직전 베팅액의 2배 이상이어야 함 (표준 섯다 룰)
      const minRaise = state.lastBetAmount * 2;
      if (action.amount < minRaise) {
        return {
          success: false,
          error: `레이즈는 최소 ${minRaise} 이상이어야 합니다.`,
          state,
        };
      }
      if (player.chips < action.amount) {
        return {
          success: false,
          error: "칩이 부족합니다. 레이즈 대신 콜(올인)을 사용하세요.",
          state,
        };
      }
      updatedPlayer = {
        ...player,
        chips: player.chips - action.amount,
        totalBet: player.totalBet + action.amount,
        hasActed: true,
      };
      potDelta = action.amount;
      newLastBetAmount = action.amount;
      break;
    }
  }

  let newPlayers = [...state.players];
  newPlayers[playerIndex] = updatedPlayer;

  // 레이즈가 발생하면 이전에 행동했던 다른 플레이어들은 새 베팅액에 대응해야 하므로
  // hasActed를 리셋한다 (단, 다이했거나 이미 올인한 플레이어는 더 이상 행동할 필요 없음)
  if (action.type === "raise") {
    newPlayers = newPlayers.map((p, i) => {
      if (i === playerIndex) return p;
      if (p.isDead || p.isAllIn) return p;
      return { ...p, hasActed: false };
    });
  }

  const nextIndex = getNextActivePlayerIndex(newPlayers, playerIndex);

  return {
    success: true,
    state: {
      ...state,
      players: newPlayers,
      pot: state.pot + potDelta,
      lastBetAmount: newLastBetAmount,
      currentPlayerIndex: nextIndex,
    },
  };
}

/** 다이하지 않은 다음 플레이어의 인덱스를 찾는다. */
function getNextActivePlayerIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx]!.isDead) {
      return idx;
    }
  }
  return fromIndex; // 전원 다이 등 예외 상황
}

/**
 * 베팅 라운드가 종료되었는지 확인.
 * - 살아있는(다이 안 한) 플레이어가 1명 이하면 종료
 * - 올인하지 않은 살아있는 플레이어 전원이 이번 라운드에 최소 한 번 행동했고,
 *   그들의 베팅액이 모두 같으면 종료
 *   (올인한 플레이어는 더 낼 칩이 없으므로 "행동 완료" 여부와 무관하게 제외)
 */
export function isBettingRoundOver(state: GameState): boolean {
  const alivePlayers = state.players.filter((p) => !p.isDead);
  if (alivePlayers.length <= 1) return true;

  const activeBettors = alivePlayers.filter((p) => !p.isAllIn);
  if (activeBettors.length === 0) return true; // 전원 올인

  const allActed = activeBettors.every((p) => p.hasActed);
  if (!allActed) return false;

  const bets = activeBettors.map((p) => p.totalBet);
  const allEqual = bets.every((b) => b === bets[0]);
  return allEqual;
}
