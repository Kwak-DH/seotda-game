import { Card } from "../Card/Card";
import { BettingPanel } from "../BettingPanel/BettingPanel";
import { HandResult } from "../HandResult/HandResult";
import { useGameEngine } from "../../hooks/useGameEngine";
import "./Table.css";

export function Table() {
  const { state, humanId, aiId, startNewRound, act, isHumanTurn, lastError } = useGameEngine();

  const human = state.players.find((p) => p.id === humanId);
  const ai = state.players.find((p) => p.id === aiId);
  const showResult = state.phase === "showdown" || state.phase === "roundEnd";
  const notStarted = state.phase === "waiting";

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
          onNextRound={startNewRound}
        />
      )}
    </div>
  );
}
