/**
 * 화투(花札) 카드 정의
 *
 * 이 프로젝트의 섯다는 1월~10월, 각 월당 2장(variant A/B)씩 총 20장을 사용하는
 * 변형 규칙을 따른다. 11월, 12월 패는 존재하지 않는다.
 *
 * 광패는 1월(광), 3월(광), 8월(광) 세 장뿐이다.
 * 그 외 variant(홍단/열끗/초단/청단/홑껍데기)는 기본 족보(땡/끗수 등) 계산에는
 * 영향을 주지 않고, 특수패(암행어사/땡잡이/구사) 판정에만 쓰인다.
 */

/** 화투 월 (1~10) */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 카드 종류. 월별로 정확히 2장(variant A/B)이 존재한다. */
export type CardVariant =
  | "gwang"        // 광 (1, 3, 8월만 존재)
  | "hongdan"      // 홍단 (1, 2, 3월)
  | "yeolkkeut"    // 열끗 (2, 4, 5, 6, 7, 8, 9, 10월)
  | "chodan"       // 초단 (4, 5월)
  | "cheongdan"    // 청단 (6, 9, 10월)
  | "hotgeopdegi"; // 홑껍데기 (7월)

/**
 * 섯다용 카드 한 장.
 * isGwang: 광패 여부 (variant === "gwang"과 동일하지만 기존 코드 호환을 위해 유지)
 */
export interface SeotdaCard {
  /** 월 (1~10), 곧 이 카드의 기본 끗수 */
  month: Month;
  /** 카드 종류 */
  variant: CardVariant;
  /** 광패 여부 */
  isGwang: boolean;
  /** 카드 식별용 id (예: "1-gwang", "1-hongdan") */
  id: string;
  /** 화면 표시용 이름 */
  label: string;
}

interface CardSpec {
  variant: CardVariant;
  /** 화투 그림 설명 (화면 표시용 이름 구성에 사용) */
  motif: string;
}

/**
 * 월별 2장(variant A, variant B) 스펙.
 * 사용자가 확정한 20장 표에 따른다.
 */
const MONTH_CARD_SPECS: Record<Month, readonly [CardSpec, CardSpec]> = {
  1: [
    { variant: "gwang", motif: "송학 + 태양" },
    { variant: "hongdan", motif: "송학 + 붉은 띠" },
  ],
  2: [
    { variant: "yeolkkeut", motif: "매화 + 꾀꼬리" },
    { variant: "hongdan", motif: "매화 + 붉은 띠" },
  ],
  3: [
    { variant: "gwang", motif: "벚꽃 + 휘장" },
    { variant: "hongdan", motif: "벚꽃 + 붉은 띠" },
  ],
  4: [
    { variant: "yeolkkeut", motif: "등나무 + 두견새" },
    { variant: "chodan", motif: "흑싸리 + 띠" },
  ],
  5: [
    { variant: "yeolkkeut", motif: "창포 + 다리" },
    { variant: "chodan", motif: "난초 + 띠" },
  ],
  6: [
    { variant: "yeolkkeut", motif: "모란 + 나비" },
    { variant: "cheongdan", motif: "모란 + 파란 띠" },
  ],
  7: [
    { variant: "yeolkkeut", motif: "싸리 + 멧돼지" },
    { variant: "hotgeopdegi", motif: "싸리 + 띠" },
  ],
  8: [
    { variant: "gwang", motif: "보름달 + 기러기" },
    { variant: "yeolkkeut", motif: "억새 + 기러기" },
  ],
  9: [
    { variant: "yeolkkeut", motif: "국화 + 술잔" },
    { variant: "cheongdan", motif: "국화 + 파란 띠" },
  ],
  10: [
    { variant: "yeolkkeut", motif: "단풍 + 사슴" },
    { variant: "cheongdan", motif: "단풍 + 파란 띠" },
  ],
};

const VARIANT_LABELS: Record<CardVariant, string> = {
  gwang: "광",
  hongdan: "홍단",
  yeolkkeut: "열끗",
  chodan: "초단",
  cheongdan: "청단",
  hotgeopdegi: "홑껍데기",
};

/**
 * 20장 덱 생성 (1~10월, 월별 2장).
 */
export function createStandardDeck(): SeotdaCard[] {
  const months: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const cards: SeotdaCard[] = [];

  for (const month of months) {
    for (const spec of MONTH_CARD_SPECS[month]) {
      cards.push({
        month,
        variant: spec.variant,
        isGwang: spec.variant === "gwang",
        id: `${month}-${spec.variant}`,
        label: `${month}월 ${spec.motif} (${VARIANT_LABELS[spec.variant]})`,
      } satisfies SeotdaCard);
    }
  }

  return cards;
}
