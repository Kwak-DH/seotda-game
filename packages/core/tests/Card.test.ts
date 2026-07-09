import { describe, it, expect } from "vitest";
import { createStandardDeck } from "../src/card/Card.js";

describe("createStandardDeck", () => {
  it("총 20장을 생성한다", () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(20);
  });

  it("모든 카드의 id가 유일하다", () => {
    const deck = createStandardDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(20);
  });

  it("1월~10월까지 각 월마다 정확히 2장씩 존재한다", () => {
    const deck = createStandardDeck();
    for (let month = 1; month <= 10; month++) {
      const cardsOfMonth = deck.filter((c) => c.month === month);
      expect(cardsOfMonth).toHaveLength(2);
    }
  });

  it("11월, 12월 카드는 존재하지 않는다", () => {
    const deck = createStandardDeck();
    const months = deck.map((c) => c.month);
    expect(months).not.toContain(11);
    expect(months).not.toContain(12);
  });

  it("광패는 1, 3, 8월 세 장뿐이다", () => {
    const deck = createStandardDeck();
    const gwangCards = deck.filter((c) => c.isGwang);
    expect(gwangCards).toHaveLength(3);
    expect(gwangCards.map((c) => c.month).sort()).toEqual([1, 3, 8]);
    expect(gwangCards.every((c) => c.variant === "gwang")).toBe(true);
  });

  it("2, 4, 5, 6, 7, 9, 10월에는 광패가 없다", () => {
    const deck = createStandardDeck();
    const nonGwangMonths = [2, 4, 5, 6, 7, 9, 10];
    for (const month of nonGwangMonths) {
      const cardsOfMonth = deck.filter((c) => c.month === month);
      expect(cardsOfMonth.every((c) => !c.isGwang)).toBe(true);
    }
  });

  it("4월 열끗(두견새)과 7월 열끗(멧돼지)이 각각 정확히 1장씩 존재한다 (암행어사 판정용)", () => {
    const deck = createStandardDeck();
    const fourYeolkkeut = deck.filter((c) => c.month === 4 && c.variant === "yeolkkeut");
    const sevenYeolkkeut = deck.filter((c) => c.month === 7 && c.variant === "yeolkkeut");
    expect(fourYeolkkeut).toHaveLength(1);
    expect(sevenYeolkkeut).toHaveLength(1);
  });

  it("9월 열끗(술잔)이 정확히 1장 존재한다 (멍텅구리구사 판정용)", () => {
    const deck = createStandardDeck();
    const nineYeolkkeut = deck.filter((c) => c.month === 9 && c.variant === "yeolkkeut");
    expect(nineYeolkkeut).toHaveLength(1);
  });

  it("isGwang은 variant === 'gwang'과 항상 일치한다", () => {
    const deck = createStandardDeck();
    for (const card of deck) {
      expect(card.isGwang).toBe(card.variant === "gwang");
    }
  });
});
