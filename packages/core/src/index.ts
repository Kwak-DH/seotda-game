// Card
export {
  createStandardDeck,
  type Month,
  type CardVariant,
  type SeotdaCard,
} from "./card/Card.js";
export { Deck } from "./card/Deck.js";

// Rules
export {
  calculateHandRank,
  compareHandRank,
  type HandType,
  type HandRank,
} from "./rules/HandRank.js";
export { determineWinners, type RankedPlayer } from "./rules/HandComparator.js";
export {
  identifySpecialHand,
  resolveSpecialMatchup,
  type SpecialHandKind,
  type SpecialMatchupOutcome,
} from "./rules/SpecialHand.js";

// Game
export {
  createInitialPlayer,
  createInitialGameState,
  type Player,
  type GameState,
  type GamePhase,
  type SpecialWinInfo,
} from "./game/GameState.js";
export { GameEngine } from "./game/GameEngine.js";
export { applyBetAction, isBettingRoundOver, type BetAction, type BetResult } from "./game/actions/Bet.js";
export { dealCards, createShuffledDeckForRound } from "./game/actions/Deal.js";
export {
  markPlayersForRematch,
  rejoinRematch,
  dealRematchCards,
  type RejoinResult,
} from "./game/actions/Rematch.js";

// AI
export { decideBasicAiAction, type BasicAiOptions } from "./ai/BasicAI.js";
