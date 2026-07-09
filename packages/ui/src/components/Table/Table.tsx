import { Card } from "../Card/Card";
import { BettingPanel } from "../BettingPanel/BettingPanel";
import { HandResult } from "../HandResult/HandResult";
import { useGameEngine } from "../../hooks/useGameEngine";
import "./Table.css";

const SPECIAL_KIND_LABELS: Record<"amhaengeosa" | "ttangjabi", string> = {
  amhaengeosa: "암행어사",
  ttangjabi: "땡잡이",
};

export function Table() {
  const { state, humanId, aiId, startNewRound, act, rejoinRematch, isHumanTurn, lastError } =
    useGameEngine();

  const human = state.players.find((p) => p.id === humanId);
  const ai = state.players.find((p) => p.id === aiId);
  const showResult = state.phase === "showdown" || state.phase === "roundEnd";
  const notStarted = state.phase === "waiting";
  const isRematch = state.phase === "rematch";

  const specialWinner = state.specialWin
    ? state.players.find((p) => p.id === state.specialWin!.winnerId)
    : undefined;
  const specialNotice =
    state.specialWin && specialWinner
      ? `${specialWinner.name}이(가) ${SPECIAL_KIND_LABELS[state.specialWin.kind]}(으)로 승리!`
      : undefined;

  const resultEntries = showResult
    ? state.players.map((p) => ({
        playerName: p.name,
        label: state.results?.[p.id]?.label ?? (p.isDead ? "다이" : "승리"),
        isWinner: state.winners?.includes(p.id) ?? false,
      }))
    : [];

  return (
    <div className="table">
      <header className="table__header">
        <h1 className="table__title">섯다</h1>
        <p className="table__round">{state.roundNumber > 0 ? `제 ${state.roundNumber}판` : "대국 준비"}</p>
      </header>

      <div className="table__felt">
        {/* 상대 영역 */}
        <section className="table__player table__player--opponent">
          <div className="table__player-info">
            <span className="table__player-name">{ai?.name ?? "상대"}</span>
            <span className="table__player-chips">{(ai?.chips ?? 0).toLocaleString()}</span>
          </div>
          <div className="table__hand">
            {ai && ai.hand.length > 0 ? (
              ai.hand.map((c, i) => (
                <Card key={i} card={c} faceDown={state.phase === "betting"} />
              ))
            ) : (
              <>
                <Card faceDown size="md" />
                <Card faceDown size="md" />
              </>
            )}
          </div>
          {ai?.isDead && <span className="table__dead-tag">다이</span>}
        </section>

        {/* 중앙 팟 */}
        <div className="table__pot">
          <span className="table__pot-label">판돈</span>
          <span className="table__pot-value">{state.pot.toLocaleString()}</span>
        </div>

        {/* 내 영역 */}
        <section className="table__player table__player--human">
          <div className="table__hand">
            {human && human.hand.length > 0 ? (
              human.hand.map((c, i) => <Card key={i} card={c} size="lg" />)
            ) : (
              <>
                <Card faceDown size="lg" />
                <Card faceDown size="lg" />
              </>
            )}
          </div>
          <div className="table__player-info">
            <span className="table__player-name">{human?.name ?? "나"}</span>
            <span className="table__player-chips">{(human?.chips ?? 0).toLocaleString()}</span>
          </div>
        </section>
      </div>

      {lastError && <p className="table__error">{lastError}</p>}

      {notStarted ? (
        <div className="table__start">
          <button type="button" className="table__start-btn" onClick={startNewRound}>
            게임 시작
          </button>
        </div>
      ) : isRematch ? (
        <div className="table__rematch">
          <p className="table__rematch-msg">
            구사! 패가 무효 처리되어 재경기합니다. (판돈 {state.pot.toLocaleString()} 이월)
          </p>
          {human?.excludedFromRematch ? (
            <button
              type="button"
              className="table__start-btn"
              onClick={() => rejoinRematch(humanId)}
            >
              재참여 (판돈의 {Math.round(state.rebuyRatio * 100)}% 배팅)
            </button>
          ) : (
            <button type="button" className="table__start-btn" onClick={startNewRound}>
              재경기 시작
            </button>
          )}
        </div>
      ) : (
        <BettingPanel
          disabled={!isHumanTurn || showResult}
          lastBetAmount={state.lastBetAmount}
          chips={human?.chips ?? 0}
          onCall={() => act({ type: "call" })}
          onDie={() => act({ type: "die" })}
          onRaise={(amount) => act({ type: "raise", amount })}
        />
      )}

      {showResult && human && (
        <HandResult
          entries={resultEntries}
          potWon={state.winners?.includes(humanId) ? state.pot : 0}
          specialNotice={specialNotice}
          onNextRound={startNewRound}
        />
      )}
    </div>
  );
}
