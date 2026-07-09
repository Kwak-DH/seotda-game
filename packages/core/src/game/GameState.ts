import type { SeotdaCard } from "../card/Card.js";
import type { HandRank } from "../rules/HandRank.js";
import type { SpecialHandKind } from "../rules/SpecialHand.js";

/** 플레이어 한 명의 상태 */
export interface Player {
  id: string;
  name: string;
  /** 보유 칩(자금) */
  chips: number;
  /** 손패 (2장, 배분 전에는 빈 배열) */
  hand: SeotdaCard[];
  /** 이번 판에 죽었는지(다이) 여부 */
  isDead: boolean;
  /** 이번 판에 이번 베팅 라운드에서 낸 총 금액 */
  totalBet: number;
  /** 칩을 모두 소진하여 더 이상 베팅할 수 없는 상태(올인) */
  isAllIn: boolean;
  /** 이번 베팅 라운드에서 최소 한 번 행동(콜/다이/레이즈/체크)했는지 여부 */
  hasActed: boolean;
  /**
   * 구사(무효화)로 인한 재경기에서 제외된 상태.
   * 무효화된 판에서 다이했던 플레이어가 여기 해당하며, 재참여하려면
   * rebuyRatio만큼 팟에 추가로 배팅해야 한다 (rejoinRematch 참고).
   */
  excludedFromRematch: boolean;
}

/** 암행어사/땡잡이 특수패로 승부가 갈렸을 때의 판정 정보 */
export interface SpecialWinInfo {
  kind: Extract<SpecialHandKind, "amhaengeosa" | "ttangjabi">;
  winnerId: string;
}

/** 게임 진행 단계 */
export type GamePhase =
  | "waiting"     // 게임 시작 전
  | "dealing"     // 패 분배 중
  | "betting"     // 베팅 라운드 진행 중
  | "showdown"    // 승부 판정
  | "roundEnd"    // 판 종료
  | "rematch";    // 구사(무효화)로 인해 재경기 대기 중

export interface GameState {
  phase: GamePhase;
  players: Player[];
  /** 현재 베팅 차례인 플레이어 인덱스 */
  currentPlayerIndex: number;
  /** 판돈 (팟) */
  pot: number;
  /** 기본 베팅 단위 */
  baseBet: number;
  /** 직전 베팅액 (레이즈 시 기준값) */
  lastBetAmount: number;
  /** 몇 번째 판인지 */
  roundNumber: number;
  /** showdown 이후 각 플레이어의 족보 결과 */
  results: Record<string, HandRank> | null;
  /** 이번 판의 승자 playerId 목록 (동률 가능) */
  winners: string[] | null;
  /**
   * 암행어사/땡잡이 특수패로 승부가 갈렸다면 그 정보(어떤 특수패로, 누가 이겼는지).
   * 일반 족보 비교로 끝난 판이거나 아직 승부가 나지 않았으면 null.
   */
  specialWin: SpecialWinInfo | null;
  /**
   * 구사 재경기 재참여 배팅 비율 (팟 대비).
   * 예: 0.5면 현재 팟의 절반을 내야 재경기에 재참여할 수 있다.
   */
  rebuyRatio: number;
}

export function createInitialPlayer(id: string, name: string, chips: number): Player {
  return {
    id,
    name,
    chips,
    hand: [],
    isDead: false,
    totalBet: 0,
    isAllIn: false,
    hasActed: false,
    excludedFromRematch: false,
  };
}

export function createInitialGameState(
  players: Player[],
  baseBet: number,
  rebuyRatio = 0.5
): GameState {
  return {
    phase: "waiting",
    players,
    currentPlayerIndex: 0,
    pot: 0,
    baseBet,
    lastBetAmount: baseBet,
    roundNumber: 0,
    results: null,
    winners: null,
    specialWin: null,
    rebuyRatio,
  };
}
