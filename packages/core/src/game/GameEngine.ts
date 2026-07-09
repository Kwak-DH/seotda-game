import type { SeotdaCard } from "../card/Card.js";
import { Deck } from "../card/Deck.js";
import { calculateHandRank, type HandRank } from "../rules/HandRank.js";
import { determineWinners } from "../rules/HandComparator.js";
import { resolveSpecialMatchup } from "../rules/SpecialHand.js";
import type { GameState, Player } from "./GameState.js";
import { applyBetAction, isBettingRoundOver, type BetAction } from "./actions/Bet.js";
import { dealCards, createShuffledDeckForRound } from "./actions/Deal.js";
import {
  markPlayersForRematch,
  rejoinRematch as rejoinRematchAction,
  dealRematchCards,
  type RejoinResult,
} from "./actions/Rematch.js";

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

  /**
   * 새 판 시작: 셔플 + 패 분배.
   * 직전 판이 구사로 무효화되어 phase가 "rematch"인 경우, 팟을 리셋하지 않고
   * 이월하며 excludedFromRematch인 플레이어는 카드를 받지 않는다.
   */
  startNewRound(rng?: () => number): GameState {
    this.deck = createShuffledDeckForRound(rng);
    const nextRoundState = { ...this.state, roundNumber: this.state.roundNumber + 1 };
    this.state =
      this.state.phase === "rematch"
        ? dealRematchCards(nextRoundState, this.deck)
        : dealCards(nextRoundState, this.deck);
    return this.state;
  }

  /** 구사로 재경기에서 제외된 플레이어가 재참여 배팅을 하고 다시 낀다. */
  rejoinRematch(playerId: string): RejoinResult {
    const result = rejoinRematchAction(this.state, playerId);
    if (result.success) {
      this.state = result.state;
    }
    return result;
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
        specialWin: null,
        players: this.awardPot(this.state.players, [winner.id], this.state.pot),
      };
    }

    // 정확히 2명 남은 경우: 암행어사/땡잡이/구사 특수패를 우선 적용한다.
    // (특수패는 "상대방이 누구인가"에 의존하므로 2인 대결 기준으로만 정확하다.
    // 3인 이상이 남는 경우는 특수패 없이 기존 족보 비교로 처리한다.)
    if (alivePlayers.length === 2) {
      const [playerA, playerB] = alivePlayers as [Player, Player];
      const handA = playerA.hand as [SeotdaCard, SeotdaCard];
      const handB = playerB.hand as [SeotdaCard, SeotdaCard];
      const special = resolveSpecialMatchup(handA, handB);

      if (special.outcome === "rematch") {
        return markPlayersForRematch(this.state);
      }

      if (special.outcome === "special-win") {
        const winner = special.winner === "A" ? playerA : playerB;
        const results: Record<string, HandRank> = {
          [playerA.id]: calculateHandRank(handA),
          [playerB.id]: calculateHandRank(handB),
        };
        return {
          ...this.state,
          phase: "showdown",
          results,
          winners: [winner.id],
          specialWin: { kind: special.kind, winnerId: winner.id },
          players: this.awardPot(this.state.players, [winner.id], this.state.pot),
        };
      }
      // special.outcome === "normal" -> 아래 일반 족보 비교로 진행
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
      specialWin: null,
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
