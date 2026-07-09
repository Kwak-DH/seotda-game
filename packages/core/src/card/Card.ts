/**
 * 화투(花札) 카드 정의
 *
 * 이 프로젝트의 섯다는 1월~10월(월별 1장, 총 10장)만 사용하는 변형 규칙을 따른다.
 * 11월, 12월 패는 존재하지 않는다.
 *
 * 광패는 1, 3, 8월 세 장뿐이다.
 */

/** 화투 월 (1~10) */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * 섯다용 카드 한 장.
 * isGwang: 광패 여부 (1, 3, 8월만 광)
 */
export interface SeotdaCard {
  /** 월 (1~10), 곧 이 카드의 기본 끗수 */
  month: Month;
  /** 광패 여부 */
  isGwang: boolean;
  /** 카드 식별용 id (예: "1-gwang", "2-hong") */
  id: string;
  /** 화면 표시용 이름 */
  label: string;
}

/**
 * 10장 덱 생성.
 * 광월(1,3,8)은 광패를, 나머지 월(2,4,5,6,7,9,10)은 대표 홑끗패를 사용한다.
 * 실제 화투 그림과 무관하게 "월 끗수 + 광 여부"만 게임 로직에 필요하므로
 * label만 붙여 구분한다.
 */
const GWANG_MONTHS: readonly Month[] = [1, 3, 8];

const MONTH_NAMES: Record<Month, string> = {
  1: "1월 송학",
  2: "2월 매조",
  3: "3월 벚꽃",
  4: "4월 흑싸리",
  5: "5월 난초",
  6: "6월 모란",
  7: "7월 홍싸리",
  8: "8월 공산",
  9: "9월 국화",
  10: "10월 단풍",
};

export function createStandardDeck(): SeotdaCard[] {
  const months: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return months.map((month) => {
    const isGwang = GWANG_MONTHS.includes(month);
    return {
      month,
      isGwang,
      id: `${month}-${isGwang ? "gwang" : "pil"}`,
      label: `${MONTH_NAMES[month]}${isGwang ? " (광)" : ""}`,
    } satisfies SeotdaCard;
  });
}
