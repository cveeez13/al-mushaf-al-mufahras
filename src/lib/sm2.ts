/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak.
 *
 * Quality grades:
 *   0 — Complete blackout, no recall
 *   1 — Wrong answer, but recognized after reveal
 *   2 — Wrong answer, but easy to recall after reveal
 *   3 — Correct with significant difficulty
 *   4 — Correct with some hesitation
 *   5 — Perfect recall
 */

export interface SM2Card {
  verse_key: string;
  surah: number;
  ayah: number;
  text: string;
  topic_color: string;
  // SM-2 state
  easiness: number;      // E-Factor, starts at 2.5
  interval: number;      // days until next review
  repetitions: number;   // consecutive correct answers
  next_review: string;   // ISO date string
  last_review: string;   // ISO date string
  // Stats
  total_reviews: number;
  correct_reviews: number;
  created_at: string;
}

export interface SM2Result {
  easiness: number;
  interval: number;
  repetitions: number;
  next_review: string;
}

/**
 * Apply SM-2 algorithm to compute the next review schedule.
 */
export function sm2(card: SM2Card, quality: number): SM2Result {
  // Clamp quality to 0-5
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let { easiness, interval, repetitions } = card;

  // Update easiness factor
  easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  if (q < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Correct
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
  }

  // Calculate next review date
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + interval);

  return {
    easiness: Math.round(easiness * 100) / 100,
    interval,
    repetitions,
    next_review: next.toISOString().split('T')[0],
  };
}

/**
 * Check if a card is due for review today.
 */
export function isDue(card: SM2Card): boolean {
  const today = new Date().toISOString().split('T')[0];
  return card.next_review <= today;
}

/**
 * Sort cards: due first (oldest first), then by easiness (hardest first).
 */
export function sortByPriority(cards: SM2Card[]): SM2Card[] {
  const today = new Date().toISOString().split('T')[0];
  return [...cards].sort((a, b) => {
    const aDue = a.next_review <= today;
    const bDue = b.next_review <= today;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    if (aDue && bDue) {
      // Both due — oldest review first
      if (a.next_review !== b.next_review) return a.next_review < b.next_review ? -1 : 1;
      // Then hardest first
      return a.easiness - b.easiness;
    }
    // Neither due — soonest next
    return a.next_review < b.next_review ? -1 : 1;
  });
}

/**
 * Create a new SM2 card from a verse.
 */
export function createCard(verse: {
  verse_key: string;
  surah: number;
  ayah: number;
  text: string;
  topic_color: string;
}): SM2Card {
  const today = new Date().toISOString().split('T')[0];
  return {
    ...verse,
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: today,
    last_review: '',
    total_reviews: 0,
    correct_reviews: 0,
    created_at: today,
  };
}
