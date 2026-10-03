/**
 * The shapes of a TypeSafe System One call (docs.typesafe.ai/api): a map of
 * typed questions about one state, and one typed answer per question. Shared
 * by the Node client (scripts/jev) and the page's bridge client.
 */
export type Question =
  | { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } };
export type Questions = Record<string, Question>;

export interface ChoiceAnswer { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> }
export interface ScoreAnswer { type: 'score'; score: number; confidence: number; probabilities: Record<string, number>; legend: Record<string, string> }
export interface NoulAnswer { type: 'noul'; noul: number }
export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

/** One decision: the answers, and what it cost in wall time and tokens. `error` when no answer came back. */
export interface Verdict {
  answers: Record<string, Answer>;
  latencyMs: number;
  inputTokens: number;
  costUsd: number;
  model?: string;
  error?: string;
}

/** Anything that answers typed questions about a state: Jev, the page's bridge to it, or a stand-in in tests. */
export interface Decider {
  decide(state: unknown, questions: Questions): Promise<Verdict>;
}

/** The chosen option of a Choice answer, or `fallback` when the question was not asked or not answered. */
export function chosen(verdict: Verdict | undefined, id: string, fallback: string): string {
  const answer = verdict?.answers[id];
  return answer?.type === 'choice' ? answer.choice : fallback;
}

/** A Noul answer's value, or `fallback`. */
export function noul(verdict: Verdict | undefined, id: string, fallback: number): number {
  const answer = verdict?.answers[id];
  return answer?.type === 'noul' ? answer.noul : fallback;
}

/** `go@0.93` for a choice, `0.41` for a noul: the log's short form of every answer. */
export function compactAnswers(verdict: Verdict): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, answer] of Object.entries(verdict.answers)) {
    out[id] = answer.type === 'noul' ? answer.noul.toFixed(2)
      : answer.type === 'choice' ? `${answer.choice}@${answer.confidence.toFixed(2)}`
        : `${answer.score.toFixed(2)}@${answer.confidence.toFixed(2)}`;
  }
  return out;
}
