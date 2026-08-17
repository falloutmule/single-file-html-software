import { MessageCircle, PartyPopper, PawPrint, Shapes, Smile, Trees, UsersRound } from '@lucide/icons';

export const BUILT_IN_CATEGORIES = Object.freeze([
  { id: 'animals', title: 'Animals', color: '#f39b63', icon: PawPrint },
  { id: 'people', title: 'People', color: '#d988b9', icon: UsersRound },
  { id: 'things', title: 'Things', color: '#6cb8d9', icon: Shapes },
  { id: 'nature', title: 'Nature', color: '#6eb06b', icon: Trees },
  { id: 'silly', title: 'Silly', color: '#9a78cf', icon: PartyPopper },
  { id: 'words', title: 'Words', color: '#ef6f75', icon: MessageCircle },
  { id: 'emoji', title: 'Emoji', color: '#ffd45e', icon: Smile }
]);

export const BUILT_IN_BACKGROUNDS = Object.freeze([]);
export const BUILT_IN_STICKERS = Object.freeze([]);
export const BUILT_IN_ASSETS = Object.freeze([]);
export const CREATIVE_PROMPTS = Object.freeze([]);

export function findBuiltInAsset() { return null; }

export function validateBuiltInLibrary() {
  const ids = BUILT_IN_CATEGORIES.map((category) => category.id);
  const expected = ['animals', 'people', 'things', 'nature', 'silly', 'words', 'emoji'];
  if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('BlockFolk categories must keep their required order.');
  if (BUILT_IN_BACKGROUNDS.length || BUILT_IN_STICKERS.length || BUILT_IN_ASSETS.length) throw new Error('The pre-art built-in catalog must stay empty.');
  return { backgrounds: 0, stickers: 0, categories: BUILT_IN_CATEGORIES.length };
}
