import { useCallback, useRef, useState } from "react";
import {
  GameEngine,
  createInitialGameState,
  createInitialPlayer,
  decideBasicAiAction,
  type BetAction,
  type GameState,
} from "@seotda/core";

const HUMAN_ID = "human";
const AI_ID = "ai";
const BASE_BET = 100;
const STARTING_CHIPS = 10000;

export interface UseGameEngineResult {
  state: GameState;
  humanId: string;
  aiId: string;
  /** 새 판을 시작한다. phase가 "rematch"였다면 팟을 이월해 재경기를 딜한다. */
  startNewRound: () => void;
  /** 사람 플레이어의 베팅 액션 실행 */
  act: (action: BetAction) => { success: boolean; error?: string };
  /** 구사 재경기에서 제외된 플레이어가 재참여 배팅을 하고 다시 낀다 */
  rejoinRematch: (playerId: string) => { success: boolean; error?: string };
  /** 지금 사람 차례인지 여부 */
  isHumanTurn: boolean;
  /** 마지막 액션 에러 메시지 (있으면) */
  lastError: string | null;
}

/**
 * @seotda/core의 GameEngine을 React 컴포넌트에서 사용할 수 있도록 감싸는 훅.
 * AI 턴은 사람 액션 직후 자동으로 처리된다.
 */
export function useGameEngine(): UseGameEngineResult {
  const engineRef = useRef<GameEngine | null>(null);
  const [state, setState] = useState<GameState>(() => {
    const players = [
      createInitialPlayer(HUMAN_ID, "나", STARTING_CHIPS),
      createInitialPlayer(AI_ID, "상대", STARTING_CHIPS),
    ];
    const initial = createInitialGameState(players, BASE_BET);
    engineRef.current = new GameEngine(initial);
    return initial;
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const runAiTurnIfNeeded = useCallback((engine: GameEngine) => {
    let current = engine.getState();
    // AI 차례가 계속되는 한(레이즈에 대한 재판단 등) 반복 처리
    while (
      current.phase === "betting" &&
      current.players[current.currentPlayerIndex]?.id === AI_ID
    ) {
      const aiPlayer = current.players[current.currentPlayerIndex]!;
      const [c1, c2] = aiPlayer.hand;
      if (!c1 || !c2) break;
      const action = decideBasicAiAction([c1, c2], current.lastBetAmount);
      let result = engine.bet(AI_ID, action);
      if (!result.success && action.type === "raise") {
        // 칩이 부족해 레이즈가 막히면 콜(올인)로 폴백
        result = engine.bet(AI_ID, { type: "call" });
      }
      if (!result.success) {
        // 그래도 실패하면(콜조차 불가) 안전장치로 다이 처리
        engine.bet(AI_ID, { type: "die" });
      }
      current = engine.getState();
    }
    setState(current);
  }, []);

  /**
   * 기존 엔진 인스턴스를 그대로 이어받아 새 판을 딜한다.
   * (여기서 새 GameEngine/GameState를 새로 만들면 phase/pot/excludedFromRematch가
   * 초기화되어 구사 재경기 이월이 깨지므로, 반드시 같은 엔진에서 startNewRound를 호출해야 한다.)
   */
  const startNewRound = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const newState = engine.startNewRound();
    setLastError(null);
    setState(newState);
  }, []);

  const act = useCallback(
    (action: BetAction) => {
      const engine = engineRef.current;
      if (!engine) return { success: false, error: "엔진이 초기화되지 않았습니다." };
      const result = engine.bet(HUMAN_ID, action);
      if (!result.success) {
        setLastError(result.error ?? "알 수 없는 오류");
        return result;
      }
      setLastError(null);
      runAiTurnIfNeeded(engine);
      return result;
    },
    [runAiTurnIfNeeded]
  );

  const rejoinRematch = useCallback((playerId: string) => {
    const engine = engineRef.current;
    if (!engine) return { success: false, error: "엔진이 초기화되지 않았습니다." };
    const result = engine.rejoinRematch(playerId);
    if (!result.success) {
      setLastError(result.error ?? "알 수 없는 오류");
      return result;
    }
    setLastError(null);
    setState(result.state);
    return result;
  }, []);

  const isHumanTurn =
    state.phase === "betting" && state.players[state.currentPlayerIndex]?.id === HUMAN_ID;

  return {
    state,
    humanId: HUMAN_ID,
    aiId: AI_ID,
    startNewRound,
    act,
    rejoinRematch,
    isHumanTurn,
    lastError,
  };
}
