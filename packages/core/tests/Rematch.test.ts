import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/game/GameEngine.js";
import {
  createInitialGameState,
  createInitialPlayer,
  type GameState,
} from "../src/game/GameState.js";
import {
  markPlayersForRematch,
  rejoinRematch,
  dealRematchCards,
} from "../src/game/actions/Rematch.js";
import { Deck } from "../src/card/Deck.js";
import type { SeotdaCard, Month, CardVariant } from "../src/card/Card.js";

function card(month: Month, variant: CardVariant): SeotdaCard {
  return {
    month,
    variant,
    isGwang: variant === "gwang",
    id: `${month}-${variant}`,
    label: "",
  };
}

/** p1/p2 두 명이 지정된 손패를 들고 바로 showdown에 도달하는 상태를 만든다. */
function buildTwoPlayerBettingState(
  handA: [SeotdaCard, SeotdaCard],
  handB: [SeotdaCard, SeotdaCard],
  pot = 0
): GameState {
  const players = [
    createInitialPlayer("p1", "P1", 10000),
    createInitialPlayer("p2", "P2", 10000),
  ];
  const base = createInitialGameState(players, 100);
  return {
    ...base,
    phase: "betting",
    pot,
    players: [
      { ...players[0]!, hand: handA },
      { ...players[1]!, hand: handB },
    ],
  };
}

describe("GameEngine - 구사 재경기 통합 흐름", () => {
  it("구사가 발동하면 phase가 rematch로 바뀌고 팟은 그대로 유지된다", () => {
    const gusaHand: [SeotdaCard, SeotdaCard] = [card(4, "chodan"), card(9, "cheongdan")];
    const weakHand: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")]; // 7끗

    const state = buildTwoPlayerBettingState(gusaHand, weakHand, 500);
    const engine = new GameEngine(state);

    engine.bet("p1", { type: "check" });
    engine.bet("p2", { type: "check" });

    const finalState = engine.getState();
    expect(finalState.phase).toBe("rematch");
    expect(finalState.pot).toBe(500);
    expect(finalState.winners).toBeNull();
    expect(finalState.specialWin).toBeNull();
  });

  it("rematch 이후 startNewRound를 호출하면 팟을 리셋하지 않고 새로 딜한다", () => {
    const gusaHand: [SeotdaCard, SeotdaCard] = [card(4, "chodan"), card(9, "cheongdan")];
    const weakHand: [SeotdaCard, SeotdaCard] = [card(2, "yeolkkeut"), card(5, "yeolkkeut")];

    const state = buildTwoPlayerBettingState(gusaHand, weakHand, 500);
    const engine = new GameEngine(state);
    engine.bet("p1", { type: "check" });
    engine.bet("p2", { type: "check" });
    expect(engine.getState().phase).toBe("rematch");

    const rematchState = engine.startNewRound(() => 0.42);
    expect(rematchState.phase).toBe("betting");
    expect(rematchState.pot).toBe(500); // 이월, 리셋되지 않음
    expect(rematchState.players[0]!.hand).toHaveLength(2);
    expect(rematchState.players[1]!.hand).toHaveLength(2);
  });

  it("암행어사가 상대의 18광땡을 이기면 팟 전체를 가져간다", () => {
    const amhaengeosaHand: [SeotdaCard, SeotdaCard] = [
      card(4, "yeolkkeut"),
      card(7, "yeolkkeut"),
    ];
    const gwang18Hand: [SeotdaCard, SeotdaCard] = [card(1, "gwang"), card(8, "gwang")];

    const state = buildTwoPlayerBettingState(amhaengeosaHand, gwang18Hand, 1000);
    const engine = new GameEngine(state);
    engine.bet("p1", { type: "check" });
    engine.bet("p2", { type: "check" });

    const finalState = engine.getState();
    expect(finalState.phase).toBe("showdown");
    expect(finalState.winners).toEqual(["p1"]);
    expect(finalState.players.find((p) => p.id === "p1")!.chips).toBe(10000 + 1000);
    expect(finalState.players.find((p) => p.id === "p2")!.chips).toBe(10000);
    expect(finalState.specialWin).toEqual({ kind: "amhaengeosa", winnerId: "p1" });
  });

  it("암행어사라도 상대가 38광땡이면 정상 비교로 진다", () => {
    const amhaengeosaHand: [SeotdaCard, SeotdaCard] = [
      card(4, "yeolkkeut"),
      card(7, "yeolkkeut"),
    ];
    const gwang38Hand: [SeotdaCard, SeotdaCard] = [card(3, "gwang"), card(8, "gwang")];

    const state = buildTwoPlayerBettingState(amhaengeosaHand, gwang38Hand, 1000);
    const engine = new GameEngine(state);
    engine.bet("p1", { type: "check" });
    engine.bet("p2", { type: "check" });

    const finalState = engine.getState();
    expect(finalState.winners).toEqual(["p2"]);
    expect(finalState.specialWin).toBeNull();
  });

  it("땡잡이가 상대의 5땡을 이기면 팟 전체를 가져간다", () => {
    const ttangjabiHand: [SeotdaCard, SeotdaCard] = [card(3, "gwang"), card(7, "yeolkkeut")];
    const fiveTtang: [SeotdaCard, SeotdaCard] = [card(5, "yeolkkeut"), card(5, "chodan")];

    const state = buildTwoPlayerBettingState(ttangjabiHand, fiveTtang, 800);
    const engine = new GameEngine(state);
    engine.bet("p1", { type: "check" });
    engine.bet("p2", { type: "check" });

    const finalState = engine.getState();
    expect(finalState.winners).toEqual(["p1"]);
    expect(finalState.specialWin).toEqual({ kind: "ttangjabi", winnerId: "p1" });
  });
});

describe("Rematch 액션 - 다이한 플레이어 제외/재참여 (일반화된 N인 대응)", () => {
  it("markPlayersForRematch는 다이했던 플레이어만 excludedFromRematch로 표시한다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 5000),
      createInitialPlayer("p2", "P2", 5000),
      createInitialPlayer("p3", "P3", 5000),
    ];
    const base = createInitialGameState(players, 100);
    const state: GameState = {
      ...base,
      pot: 900,
      players: [
        { ...players[0]!, isDead: false },
        { ...players[1]!, isDead: true }, // 이번 판에 다이함
        { ...players[2]!, isDead: false },
      ],
    };

    const result = markPlayersForRematch(state);

    expect(result.phase).toBe("rematch");
    expect(result.players.find((p) => p.id === "p1")!.excludedFromRematch).toBe(false);
    expect(result.players.find((p) => p.id === "p2")!.excludedFromRematch).toBe(true);
    expect(result.players.find((p) => p.id === "p3")!.excludedFromRematch).toBe(false);
  });

  it("rejoinRematch는 팟의 rebuyRatio만큼 배팅해야 재참여할 수 있다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 5000),
      createInitialPlayer("p2", "P2", 5000),
    ];
    const base = createInitialGameState(players, 100, 0.5);
    const state: GameState = {
      ...base,
      phase: "rematch",
      pot: 1000,
      players: [
        { ...players[0]!, excludedFromRematch: false },
        { ...players[1]!, excludedFromRematch: true },
      ],
    };

    const result = rejoinRematch(state, "p2");

    expect(result.success).toBe(true);
    expect(result.state.pot).toBe(1500); // 1000 + (1000 * 0.5)
    const p2 = result.state.players.find((p) => p.id === "p2")!;
    expect(p2.chips).toBe(5000 - 500);
    expect(p2.excludedFromRematch).toBe(false);
  });

  it("재참여 대상이 아닌 플레이어는 rejoinRematch를 호출할 수 없다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 5000),
      createInitialPlayer("p2", "P2", 5000),
    ];
    const base = createInitialGameState(players, 100);
    const state: GameState = {
      ...base,
      phase: "rematch",
      pot: 1000,
      players: [
        { ...players[0]!, excludedFromRematch: false },
        { ...players[1]!, excludedFromRematch: false },
      ],
    };

    const result = rejoinRematch(state, "p1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("재참여가 필요한");
  });

  it("칩이 부족하면 rejoinRematch가 실패한다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 100),
      createInitialPlayer("p2", "P2", 5000),
    ];
    const base = createInitialGameState(players, 100, 0.5);
    const state: GameState = {
      ...base,
      phase: "rematch",
      pot: 1000, // rebuy = 500 > p1 chips(100)
      players: [
        { ...players[0]!, excludedFromRematch: true },
        { ...players[1]!, excludedFromRematch: false },
      ],
    };

    const result = rejoinRematch(state, "p1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("칩이 부족");
  });

  it("dealRematchCards는 excludedFromRematch인 플레이어에게 카드를 주지 않고 다이 상태로 둔다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 5000),
      createInitialPlayer("p2", "P2", 5000),
    ];
    const base = createInitialGameState(players, 100);
    const state: GameState = {
      ...base,
      pot: 500,
      players: [
        { ...players[0]!, excludedFromRematch: false },
        { ...players[1]!, excludedFromRematch: true },
      ],
    };

    const deck = Deck.createShuffled(() => 0.1);
    const result = dealRematchCards(state, deck);

    expect(result.pot).toBe(500); // 리셋되지 않음
    const p1 = result.players.find((p) => p.id === "p1")!;
    const p2 = result.players.find((p) => p.id === "p2")!;
    expect(p1.hand).toHaveLength(2);
    expect(p1.isDead).toBe(false);
    expect(p2.hand).toHaveLength(0);
    expect(p2.isDead).toBe(true);
  });

  it("dealRematchCards는 currentPlayerIndex를 살아있는(제외되지 않은) 첫 플레이어로 되돌린다", () => {
    const players = [
      createInitialPlayer("p1", "P1", 5000),
      createInitialPlayer("p2", "P2", 5000),
      createInitialPlayer("p3", "P3", 5000),
    ];
    const base = createInitialGameState(players, 100);
    const state: GameState = {
      ...base,
      pot: 900,
      currentPlayerIndex: 1, // 직전 판의 마지막 액션 위치가 남아있는 상황을 재현
      players: [
        { ...players[0]!, excludedFromRematch: true }, // p1은 제외됨
        { ...players[1]!, excludedFromRematch: false },
        { ...players[2]!, excludedFromRematch: false },
      ],
    };

    const deck = Deck.createShuffled(() => 0.1);
    const result = dealRematchCards(state, deck);

    // p1은 제외되어 다이 상태이므로, 살아있는 첫 플레이어인 p2(index 1)부터 시작해야 한다.
    expect(result.currentPlayerIndex).toBe(1);
  });
});
