import "./BettingPanel.css";

interface BettingPanelProps {
  disabled: boolean;
  lastBetAmount: number;
  chips: number;
  onCall: () => void;
  onDie: () => void;
  onRaise: (amount: number) => void;
}

export function BettingPanel({
  disabled,
  lastBetAmount,
  chips,
  onCall,
  onDie,
  onRaise,
}: BettingPanelProps) {
  const minRaise = lastBetAmount * 2;
  // 칩이 직전 베팅액보다 적어도 가진 만큼 올인으로 콜 가능
  const isAllInCall = chips > 0 && chips < lastBetAmount;
  const canCall = !disabled && chips > 0;
  const canRaise = !disabled && chips >= minRaise;
  const callAmount = Math.min(chips, lastBetAmount);

  return (
    <div className="betting-panel">
      <button
        type="button"
        className="betting-panel__btn betting-panel__btn--die"
        disabled={disabled}
        onClick={onDie}
      >
        다이
      </button>
      <button
        type="button"
        className="betting-panel__btn betting-panel__btn--call"
        disabled={!canCall}
        onClick={onCall}
      >
        {isAllInCall ? "올인" : "콜"}{" "}
        <span className="betting-panel__amount">{callAmount.toLocaleString()}</span>
      </button>
      <button
        type="button"
        className="betting-panel__btn betting-panel__btn--raise"
        disabled={!canRaise}
        onClick={() => onRaise(minRaise)}
      >
        레이즈 <span className="betting-panel__amount">{minRaise.toLocaleString()}</span>
      </button>
    </div>
  );
}
