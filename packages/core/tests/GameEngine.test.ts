import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/game/GameEngine.js";
import { createInitialGameState, createInitialPlayer } from "../src/game/GameState.js";

/** 결정론적 rng: 항상 고정된 시퀀스를 반환하여 셔플 결과를 예측 가능하게 함 */
function fixedRng(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

describe("GameEngine - 기본 흐름", () => {
  it("새 판을 시작하면 모든 플레이어에게 2장씩 배분된다", () => {
    const players = [
      createInitialPlayer("p1", "플레이어1", 10000),
      createInitialPlayer("p2", "플레이어2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(42));

    const state = engine.startNewRound(fixedRng(42));

    expect(state.phase).toBe("betting");
    expect(state.players[0]!.hand).toHaveLength(2);
    expect(state.players[1]!.hand).toHaveLength(2);
    expect(state.roundNumber).toBe(1);
  });

  it("두 플레이어가 서로 다른 카드를 받는다 (중복 없음)", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(7));
    const state = engine.startNewRound(fixedRng(7));

    const allCardIds = [
      ...state.players[0]!.hand.map((c) => c.id),
      ...state.players[1]!.hand.map((c) => c.id),
    ];
    const uniqueIds = new Set(allCardIds);
    expect(uniqueIds.size).toBe(4); // 4장 모두 달라야 함
  });
});

describe("GameEngine - 베팅 흐름", () => {
  it("한 명이 다이하면 남은 한 명이 팟을 모두 가져간다 (족보 비교 없이)", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(1));
    engine.startNewRound(fixedRng(1));

    // p1이 콜, p2가 다이
    const beforeChips = engine.getState().players.find((p) => p.id === "p2")!.chips;
    engine.bet("p1", { type: "call" });
    engine.bet("p2", { type: "die" });

    const finalState = engine.getState();
    expect(finalState.phase).toBe("roundEnd");
    expect(finalState.winners).toEqual(["p1"]);
    // p2는 다이했으므로 칩 변화 없음 (베팅 안 했으므로)
    expect(finalState.players.find((p) => p.id === "p2")!.chips).toBe(beforeChips);
  });

  it("칩이 직전 베팅액보다 적으면 콜이 올인으로 처리된다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 50), // baseBet(100)보다 적음
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(3));
    engine.startNewRound(fixedRng(3));

    const result = engine.bet("p1", { type: "call" });
    expect(result.success).toBe(true);
    const p1 = engine.getState().players.find((p) => p.id === "p1")!;
    expect(p1.chips).toBe(0); // 가진 50 전부 베팅
    expect(p1.totalBet).toBe(50);
    expect(p1.isAllIn).toBe(true);
  });

  it("레이즈는 칩이 부족하면 실패하고, 콜(올인)로 폴백해야 한다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 50),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(3));
    engine.startNewRound(fixedRng(3));

    const raiseResult = engine.bet("p1", { type: "raise", amount: 200 });
    expect(raiseResult.success).toBe(false);
    expect(raiseResult.error).toContain("칩이 부족");
  });

  it("올인한 플레이어가 있어도 베팅 라운드가 정상 종료된다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 50),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(3));
    engine.startNewRound(fixedRng(3));

    engine.bet("p1", { type: "call" }); // 올인 (50)
    const result = engine.bet("p2", { type: "call" }); // 100 콜 (올인한 p1과는 무관하게 정산)

    expect(result.success).toBe(true);
    const final = engine.getState();
    expect(final.phase === "showdown" || final.phase === "roundEnd").toBe(true);
  });

  it("본인 차례가 아니면 베팅할 수 없다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(5));
    engine.startNewRound(fixedRng(5));

    // 첫 차례는 p1 (currentPlayerIndex=0)이므로 p2가 먼저 시도하면 실패
    const result = engine.bet("p2", { type: "call" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("차례가 아닙니다");
  });

  it("레이즈는 최소 직전 베팅의 2배 이상이어야 한다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(9));
    engine.startNewRound(fixedRng(9));

    // baseBet=100이므로 최소 레이즈는 200
    const result = engine.bet("p1", { type: "raise", amount: 150 });
    expect(result.success).toBe(false);
    expect(result.error).toContain("레이즈는 최소");
  });

  it("정상적인 레이즈-콜 흐름 후 팟이 승자에게 지급된다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(11));
    engine.startNewRound(fixedRng(11));

    const totalChipsBefore =
      engine.getState().players[0]!.chips + engine.getState().players[1]!.chips;

    engine.bet("p1", { type: "raise", amount: 200 });
    engine.bet("p2", { type: "call" });

    const finalState = engine.getState();
    expect(finalState.phase).toBe("showdown");
    expect(finalState.winners).not.toBeNull();
    expect(finalState.winners!.length).toBeGreaterThanOrEqual(1);

    // 칩 총합은 보존되어야 함 (판돈이 사라지거나 생기지 않음)
    const totalChipsAfter =
      finalState.players[0]!.chips + finalState.players[1]!.chips;
    expect(totalChipsAfter).toBe(totalChipsBefore);
  });

  it("콜 이후 상대가 레이즈하면, 다시 콜할 때는 부족분만 낸다 (직전 베팅액 전체를 또 내지 않음)", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(21));
    engine.startNewRound(fixedRng(21));

    engine.bet("p1", { type: "call" }); // p1 totalBet: 0 -> 100
    engine.bet("p2", { type: "raise", amount: 200 }); // p2 totalBet: 0 -> 200
    engine.bet("p1", { type: "call" }); // p1은 100만 더 내면 됨 (100 -> 200)

    const state = engine.getState();
    const p1 = state.players.find((p) => p.id === "p1")!;
    const p2 = state.players.find((p) => p.id === "p2")!;
    expect(p1.totalBet).toBe(200);
    expect(p2.totalBet).toBe(200);
    expect(["showdown", "roundEnd", "rematch"]).toContain(state.phase);
  });

  it("직전 판이 홀수 번의 베팅 액션(콜-레이즈-콜)으로 끝나도 다음 판은 첫 플레이어부터 시작한다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 10000),
      createInitialPlayer("p2", "P2", 10000),
    ];
    const initialState = createInitialGameState(players, 100);
    const engine = new GameEngine(initialState, fixedRng(13));
    engine.startNewRound(fixedRng(13));

    // p1 콜(1) -> p2 레이즈(2) -> p1 콜(3): 총 3번의 액션으로 라운드가 종료된다.
    // 수정 전에는 이 경우 currentPlayerIndex가 p2(index 1)에 남아, 다음 판이
    // p2 차례로 시작되어 인간 플레이어 UI가 영구히 멈추는 버그가 있었다.
    engine.bet("p1", { type: "call" });
    engine.bet("p2", { type: "raise", amount: 200 });
    const finalActionResult = engine.bet("p1", { type: "call" });
    expect(finalActionResult.success).toBe(true);
    expect(["showdown", "roundEnd", "rematch"]).toContain(engine.getState().phase);

    const nextRoundState = engine.startNewRound(fixedRng(17));
    expect(nextRoundState.phase).toBe("betting");
    expect(nextRoundState.currentPlayerIndex).toBe(0);
  });
});
