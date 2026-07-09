import { Deck } from "../card/Deck.js";
import { calculateHandRank, type HandRank } from "../rules/HandRank.js";
import { determineWinners } from "../rules/HandComparator.js";
import type { GameState, Player } from "./GameState.js";
import { applyBetAction, isBettingRoundOver, type BetAction } from "./actions/Bet.js";
import { dealCards, createShuffledDeckForRound } from "./actions/Deal.js";

/**
 * 섯다 게임 한 판(라운드)의 전체 진행을 관리하는 엔진.
 * 상태는 불변(immutable)으로 다루며, 각 메서드는 새 상태를 반환한다.
 */
export class GameEngine {
  private state: GameState;
  private deck: Deck;

  constructor(initialState: GameState, rng?: () => number) {
    this.state = initialState;
    this.deck = createShuffledDeckForRound(rng);
  }

  getState(): GameState {
    return this.state;
  }

  /** 새 판 시작: 셔플 + 패 분배 */
  startNewRound(rng?: () => number): GameState {
    this.deck = createShuffledDeckForRound(rng);
    this.state = dealCards(
      { ...this.state, roundNumber: this.state.roundNumber + 1 },
      this.deck
    );
    return this.state;
  }

  /** 베팅 액션 적용. 실패 시 에러 메시지와 함께 이전 상태 유지. */
  bet(playerId: string, action: BetAction): { success: boolean; error?: string } {
    const result = applyBetAction(this.state, playerId, action);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    this.state = result.state;

    if (isBettingRoundOver(this.state)) {
      this.state = this.resolveShowdown();
    }

    return { success: true };
  }

  /** 베팅이 끝났을 때 승부를 판정한다. */
  private resolveShowdown(): GameState {
    const alivePlayers = this.state.players.filter((p) => !p.isDead);

    // 한 명만 남은 경우 (나머지 전원 다이) - 바로 승자 처리, 족보 비교 불필요
    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0]!;
      return {
        ...this.state,
        phase: "roundEnd",
        winners: [winner.id],
        results: null,
        players: this.awardPot(this.state.players, [winner.id], this.state.pot),
      };
    }

    // 2명 이상 남은 경우 족보 비교
    const results: Record<string, HandRank> = {};
    for (const player of alivePlayers) {
      const [c1, c2] = player.hand;
      if (!c1 || !c2) {
        throw new Error(`플레이어 ${player.id}의 손패가 올바르지 않습니다.`);
      }
      results[player.id] = calculateHandRank([c1, c2]);
    }

    const ranked = alivePlayers.map((p) => ({
      playerId: p.id,
      rank: results[p.id]!,
    }));
    const winners = determineWinners(ranked).map((w) => w.playerId);

    return {
      ...this.state,
      phase: "showdown",
      results,
      winners,
      players: this.awardPot(this.state.players, winners, this.state.pot),
    };
  }

  /** 팟을 승자(들)에게 분배 (동률이면 균등 분배, 나머지는 첫 승자에게) */
  private awardPot(players: Player[], winnerIds: string[], pot: number): Player[] {
    const share = Math.floor(pot / winnerIds.length);
    const remainder = pot - share * winnerIds.length;

    return players.map((p) => {
      const winnerIndex = winnerIds.indexOf(p.id);
      if (winnerIndex === -1) return p;
      const bonus = winnerIndex === 0 ? remainder : 0;
      return { ...p, chips: p.chips + share + bonus };
    });
  }
}
