import "./HandResult.css";

interface ResultEntry {
  playerName: string;
  label: string;
  isWinner: boolean;
}

interface HandResultProps {
  entries: ResultEntry[];
  potWon: number;
  onNextRound: () => void;
}

export function HandResult({ entries, potWon, onNextRound }: HandResultProps) {
  return (
    <div className="hand-result">
      <div className="hand-result__panel">
        <h2 className="hand-result__title">승부</h2>
        <ul className="hand-result__list">
          {entries.map((entry) => (
            <li
              key={entry.playerName}
              className={`hand-result__entry ${entry.isWinner ? "hand-result__entry--win" : ""}`}
            >
              <span className="hand-result__name">{entry.playerName}</span>
              <span className="hand-result__label">{entry.label}</span>
            </li>
          ))}
        </ul>
        <p className="hand-result__pot">획득 {potWon.toLocaleString()}</p>
        <button type="button" className="hand-result__next" onClick={onNextRound}>
          다음 판
        </button>
      </div>
    </div>
  );
}
