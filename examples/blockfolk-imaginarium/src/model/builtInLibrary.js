import { Blocks, PawPrint, Smile, Sprout, UsersRound, WandSparkles } from '@lucide/icons';
import { BLOCKFOLK_CLASSIC_VALLEY_ASSET, BLOCKFOLK_VALLEY_ASSET } from './worldModel.js';
import { BLOCKFOLK_STICKERS } from './blockfolkStickerLibrary.js';

export const BUILT_IN_CATEGORIES = Object.freeze([
  { id: 'animals', title: 'Animals', color: '#f39b63', icon: PawPrint },
  { id: 'people', title: 'People', color: '#d988b9', icon: UsersRound },
  { id: 'building', title: 'Building', color: '#c58a56', icon: Blocks },
  { id: 'nature', title: 'Nature', color: '#6eb06b', icon: Sprout },
  { id: 'magic', title: 'Magic', color: '#9a78cf', icon: WandSparkles },
  { id: 'emoji', title: 'Emoji', color: '#ffd45e', icon: Smile }
]);

export const BUILT_IN_BACKGROUNDS = Object.freeze([BLOCKFOLK_VALLEY_ASSET, BLOCKFOLK_CLASSIC_VALLEY_ASSET]);
export const BUILT_IN_STICKERS = BLOCKFOLK_STICKERS;
export const BUILT_IN_ASSETS = Object.freeze([...BUILT_IN_BACKGROUNDS, ...BLOCKFOLK_STICKERS]);
export const CREATIVE_PROMPTS = Object.freeze([]);

export function findBuiltInAsset(assetId) { return BUILT_IN_ASSETS.find((asset) => asset.id === assetId) || null; }

export function validateBuiltInLibrary() {
  const ids = BUILT_IN_CATEGORIES.map((category) => category.id);
  const expected = ['animals', 'people', 'building', 'nature', 'magic', 'emoji'];
  if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('BlockFolk categories must keep their required order.');
  const expectedCounts = { animals: 2, people: 6, building: 6, nature: 12, magic: 4, emoji: 0 };
  for (const [category, count] of Object.entries(expectedCounts)) if (BUILT_IN_STICKERS.filter((sticker) => sticker.category === category).length !== count) throw new Error(`BlockFolk ${category} must contain ${count} built-in stickers.`);
  if (new Set(BUILT_IN_ASSETS.map((asset) => asset.id)).size !== BUILT_IN_ASSETS.length) throw new Error('BlockFolk built-in asset IDs must be unique.');
  if (BUILT_IN_BACKGROUNDS.length !== 2 || BUILT_IN_STICKERS.length !== 30 || BUILT_IN_ASSETS.length !== 32 || !BUILT_IN_BACKGROUNDS[0].production || BUILT_IN_BACKGROUNDS[0].debug || !BUILT_IN_BACKGROUNDS[1].classic) throw new Error('BlockFolk must contain its production Valley, Classic Valley, and exactly 30 accepted stickers.');
  return { backgrounds: 2, stickers: BUILT_IN_STICKERS.length, categories: BUILT_IN_CATEGORIES.length };
}
