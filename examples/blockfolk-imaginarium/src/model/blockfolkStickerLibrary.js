import { blockFolkStickerAssetUrl } from './blockfolkStickerAssetRegistry.js';

// The prior 420-world-unit default required six presses of Smaller. Smaller is
// exactly a 1 / 1.1 multiplier, so use the derived sixth-step value rather
// than an unrelated estimate. Existing saved scales are serialized per sticker
// and therefore remain unchanged.
export const BLOCKFOLK_DEFAULT_WORLD_EXTENT = 420 / (1.1 ** 6);

function makeBlockFolkSticker(id, name, category, filename, width, height) {
  return Object.freeze({
    id: `sticker-blockfolk-${id}`,
    name,
    alt: `${name} BlockFolk sticker`,
    category,
    kind: 'sticker',
    builtIn: true,
    defaultWorldExtent: BLOCKFOLK_DEFAULT_WORLD_EXTENT,
    get dataUrl() { return blockFolkStickerAssetUrl(filename); },
    width,
    height
  });
}

export const BLOCKFOLK_STICKERS = Object.freeze([
  makeBlockFolkSticker('wolf', 'Wolf', 'animals', 'wolf.png', 465, 460),
  makeBlockFolkSticker('boar', 'Boar', 'animals', 'boar.png', 475, 432),

  makeBlockFolkSticker('farmer-pitchfork', 'Farmer', 'people', 'farmer_pitchfork.png', 342, 453),
  makeBlockFolkSticker('miner-pickaxe', 'Miner', 'people', 'miner_pickaxe.png', 369, 449),
  makeBlockFolkSticker('knight-sword-shield', 'Knight', 'people', 'knight_sword_shield.png', 350, 484),
  makeBlockFolkSticker('wizard-staff', 'Wizard', 'people', 'wizard_staff.png', 353, 472),
  makeBlockFolkSticker('ranger-bow-quiver', 'Ranger', 'people', 'ranger_bow_quiver.png', 335, 470),
  makeBlockFolkSticker('traveler-lantern', 'Explorer', 'people', 'traveler_lantern.png', 345, 468),

  makeBlockFolkSticker('wood-door', 'Wooden Door', 'building', 'wood_door.png', 236, 416),
  makeBlockFolkSticker('stone-door', 'Stone Door', 'building', 'stone_door.png', 261, 424),
  makeBlockFolkSticker('square-window', 'Square Window', 'building', 'square_window.png', 268, 363),
  makeBlockFolkSticker('round-window', 'Round Window', 'building', 'round_window.png', 305, 359),
  makeBlockFolkSticker('wood-log-block', 'Log Block', 'building', 'wood_log_block.png', 274, 326),
  makeBlockFolkSticker('brick-stone-block', 'Brick Block', 'building', 'brick_stone_block.png', 273, 325),

  makeBlockFolkSticker('broadleaf-tree', 'Oak Tree', 'nature', 'broadleaf_tree.png', 356, 427),
  makeBlockFolkSticker('pine-tree', 'Pine Tree', 'nature', 'pine_tree.png', 274, 432),
  makeBlockFolkSticker('bush', 'Shrub', 'nature', 'bush.png', 253, 237),
  makeBlockFolkSticker('berry-bush', 'Berry Bush', 'nature', 'berry_bush.png', 366, 328),
  makeBlockFolkSticker('grass-dirt-block', 'Grass Block', 'nature', 'grass_dirt_block.png', 273, 320),
  makeBlockFolkSticker('dirt-block', 'Dirt Block', 'nature', 'dirt_block.png', 275, 320),
  makeBlockFolkSticker('stone-block', 'Stone Block', 'nature', 'stone_block.png', 273, 319),
  makeBlockFolkSticker('sand-block', 'Sand Block', 'nature', 'sand_block.png', 273, 320),
  makeBlockFolkSticker('snow-block', 'Snow Block', 'nature', 'snow_block.png', 274, 320),
  makeBlockFolkSticker('water-block', 'Water Block', 'nature', 'water_block.png', 274, 325),
  makeBlockFolkSticker('lava-block', 'Lava Block', 'nature', 'lava_block.png', 275, 326),
  makeBlockFolkSticker('leaf-block', 'Leaves Block', 'nature', 'leaf_block.png', 273, 325),

  makeBlockFolkSticker('slime-with-droplets', 'Slime', 'magic', 'slime_with_droplets.png', 422, 365),
  makeBlockFolkSticker('bat', 'Bat', 'magic', 'bat.png', 492, 395),
  makeBlockFolkSticker('moss-golem', 'Golem', 'magic', 'moss_golem.png', 456, 477),
  makeBlockFolkSticker('red-dragon', 'Dragon', 'magic', 'red_dragon.png', 456, 453)
]);
