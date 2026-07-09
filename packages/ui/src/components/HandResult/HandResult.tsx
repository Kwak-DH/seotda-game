import "./HandResult.css";

interface ResultEntry {
  playerName: string;
  label: string;
  isWinner: boolean;
}

interface HandResultProps {
  entries: ResultEntry[];
  potWon: number;
  /** 암행어사/땡잡이 등 특수패로 승부가 갈렸을 때 보여줄 안내 문구 */
  specialNotice?: string;
  onNextRound: () => void;
}

export function HandResult({ entries, potWon, specialNotice, onNextRound }: HandResultProps) {
  return (
    <div className="hand-result">
      <div className="hand-result__panel">
        <h2 className="hand-result__title">승부</h2>
        {specialNotice && <p className="hand-result__special">{specialNotice}</p>}
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
