import { createStandardDeck, type SeotdaCard } from "./Card.js";

/**
 * 카드 덱을 관리하는 클래스.
 * 셔플, 카드 뽑기 기능을 제공한다.
 */
export class Deck {
  private cards: SeotdaCard[];

  constructor(cards?: SeotdaCard[]) {
    this.cards = cards ?? createStandardDeck();
  }

  /** 표준 20장 덱을 새로 만들어 셔플까지 완료한 Deck 반환 */
  static createShuffled(rng: () => number = Math.random): Deck {
    const deck = new Deck(createStandardDeck());
    deck.shuffle(rng);
    return deck;
  }

  /** Fisher-Yates 셔플. rng를 주입 가능하게 하여 테스트 시 결정론적 셔플 가능 */
  shuffle(rng: () => number = Math.random): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = this.cards[i]!;
      this.cards[i] = this.cards[j]!;
      this.cards[j] = temp;
    }
  }

  /** 맨 위에서 카드 한 장 뽑기 (덱에서 제거됨) */
  draw(): SeotdaCard {
    const card = this.cards.pop();
    if (!card) {
      throw new Error("덱에 카드가 남아있지 않습니다.");
    }
    return card;
  }

  /** 남은 카드 수 */
  get remaining(): number {
    return this.cards.length;
  }

  /** 남은 카드 목록 (읽기 전용 스냅샷) */
  peekAll(): readonly SeotdaCard[] {
    return [...this.cards];
  }
}
