import { compareHandRank, type HandRank } from "./HandRank.js";

export interface RankedPlayer {
  playerId: string;
  rank: HandRank;
}

/**
 * 여러 플레이어의 족보를 비교하여 승자(들)를 가린다.
 * 동률(무승부)이 있을 경우 배열에 여러 명이 포함될 수 있다 (예: 알리 vs 알리).
 */
export function determineWinners(players: readonly RankedPlayer[]): RankedPlayer[] {
  if (players.length === 0) {
    throw new Error("비교할 플레이어가 없습니다.");
  }

  let best: RankedPlayer[] = [players[0]!];
  for (let i = 1; i < players.length; i++) {
    const candidate = players[i]!;
    const cmp = compareHandRank(candidate.rank, best[0]!.rank);
    if (cmp > 0) {
      best = [candidate];
    } else if (cmp === 0) {
      best.push(candidate);
    }
  }
  return best;
}
