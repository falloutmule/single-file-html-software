const graphemeSegmenter = typeof Intl?.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const pictographicPattern = /\p{Extended_Pictographic}/u;
const flagPattern = /^\p{Regional_Indicator}{2}$/u;
const keycapPattern = /^[#*0-9]\uFE0F?\u20E3$/u;

export function splitGraphemes(value) {
  const source = String(value ?? '');
  return graphemeSegmenter ? [...graphemeSegmenter.segment(source)].map((entry) => entry.segment) : (source ? [source] : []);
}

export function isNativeEmojiSequence(value) {
  if (typeof value !== 'string' || !value || value.trim() !== value) return false;
  const graphemes = splitGraphemes(value);
  if (graphemes.length !== 1 || graphemes[0] !== value) return false;
  return pictographicPattern.test(value) || flagPattern.test(value) || keycapPattern.test(value);
}

export function validateNativeEmojiSequence(value) {
  if (!isNativeEmojiSequence(value)) throw new Error('Enter one emoji from your keyboard, not a written word.');
  return value;
}
