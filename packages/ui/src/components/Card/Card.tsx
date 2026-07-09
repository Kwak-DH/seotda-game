import type { SeotdaCard } from "@seotda/core";
import "./Card.css";

interface CardProps {
  card?: SeotdaCard;
  /** 뒷면(숨김) 상태로 표시할지 여부 */
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Card({ card, faceDown = false, size = "md" }: CardProps) {
  if (faceDown || !card) {
    return (
      <div className={`hwatu-card hwatu-card--back hwatu-card--${size}`} aria-label="뒷면 카드">
        <div className="hwatu-card__back-pattern" />
      </div>
    );
  }

  return (
    <div
      className={`hwatu-card hwatu-card--${size} ${card.isGwang ? "hwatu-card--gwang" : ""}`}
      aria-label={card.label}
    >
      <span className="hwatu-card__month">{card.month}</span>
      <span className="hwatu-card__label">{card.label.replace(/^\d+월\s*/, "")}</span>
      {card.isGwang && <span className="hwatu-card__gwang-mark">光</span>}
    </div>
  );
}
