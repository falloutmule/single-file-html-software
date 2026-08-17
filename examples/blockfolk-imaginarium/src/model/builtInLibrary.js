import { Blocks, PawPrint, Smile, Sprout, UsersRound, WandSparkles } from '@lucide/icons';
import { DEBUG_WORLD_ASSET } from './worldModel.js';

export const BUILT_IN_CATEGORIES = Object.freeze([
  { id: 'animals', title: 'Animals', color: '#f39b63', icon: PawPrint },
  { id: 'people', title: 'People', color: '#d988b9', icon: UsersRound },
  { id: 'building', title: 'Building', color: '#c58a56', icon: Blocks },
  { id: 'nature', title: 'Nature', color: '#6eb06b', icon: Sprout },
  { id: 'magic', title: 'Magic', color: '#9a78cf', icon: WandSparkles },
  { id: 'emoji', title: 'Emoji', color: '#ffd45e', icon: Smile }
]);

export const BUILT_IN_BACKGROUNDS = Object.freeze([DEBUG_WORLD_ASSET]);
export const BUILT_IN_STICKERS = Object.freeze([]);
export const BUILT_IN_ASSETS = Object.freeze([DEBUG_WORLD_ASSET]);
export const CREATIVE_PROMPTS = Object.freeze([]);

export function findBuiltInAsset(assetId) { return assetId === DEBUG_WORLD_ASSET.id ? DEBUG_WORLD_ASSET : null; }

export function validateBuiltInLibrary() {
  const ids = BUILT_IN_CATEGORIES.map((category) => category.id);
  const expected = ['animals', 'people', 'building', 'nature', 'magic', 'emoji'];
  if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('BlockFolk categories must keep their required order.');
  if (BUILT_IN_BACKGROUNDS.length !== 1 || BUILT_IN_STICKERS.length || BUILT_IN_ASSETS.length !== 1 || !BUILT_IN_BACKGROUNDS[0].debug) throw new Error('The world foundation must contain one debug world and no production stickers.');
  return { backgrounds: 1, stickers: 0, categories: BUILT_IN_CATEGORIES.length };
}
