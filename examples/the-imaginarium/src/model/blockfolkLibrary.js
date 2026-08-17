import { blockfolkAssetUrl } from './blockfolkAssetRegistry.js';

export const BLOCKFOLK_CATEGORY = Object.freeze({ id: 'blockfolk', title: 'Blockfolk', color: '#8BCB58', icon: '▦' });

function makeBlockfolkSticker(id, name, filename, width, height) {
  return Object.freeze({
    id: `sticker-blockfolk-${id}`,
    name,
    alt: `${name} Blockfolk sticker`,
    category: BLOCKFOLK_CATEGORY.id,
    kind: 'sticker',
    builtIn: true,
    get dataUrl() { return blockfolkAssetUrl(filename); },
    width,
    height
  });
}

export const BLOCKFOLK_STICKERS = Object.freeze([
  makeBlockfolkSticker('farmer-pitchfork', 'Farmer with Pitchfork', 'farmer_pitchfork.png', 342, 453),
  makeBlockfolkSticker('miner-pickaxe', 'Miner with Pickaxe', 'miner_pickaxe.png', 369, 449),
  makeBlockfolkSticker('knight-sword-shield', 'Knight with Sword and Shield', 'knight_sword_shield.png', 350, 484),
  makeBlockfolkSticker('wizard-staff', 'Wizard with Staff', 'wizard_staff.png', 353, 472),
  makeBlockfolkSticker('ranger-bow-quiver', 'Ranger with Bow and Quiver', 'ranger_bow_quiver.png', 335, 470),
  makeBlockfolkSticker('traveler-lantern', 'Traveler with Lantern', 'traveler_lantern.png', 345, 468),
  makeBlockfolkSticker('grass-dirt-block', 'Grass Block', 'grass_dirt_block.png', 273, 320),
  makeBlockfolkSticker('dirt-block', 'Dirt Block', 'dirt_block.png', 275, 320),
  makeBlockfolkSticker('stone-block', 'Stone Block', 'stone_block.png', 273, 319),
  makeBlockfolkSticker('sand-block', 'Sand Block', 'sand_block.png', 273, 320),
  makeBlockfolkSticker('snow-block', 'Snow Block', 'snow_block.png', 274, 320),
  makeBlockfolkSticker('water-block', 'Water Block', 'water_block.png', 274, 325),
  makeBlockfolkSticker('lava-block', 'Lava Block', 'lava_block.png', 275, 326),
  makeBlockfolkSticker('wood-log-block', 'Wood Log Block', 'wood_log_block.png', 274, 326),
  makeBlockfolkSticker('leaf-block', 'Leaf Block', 'leaf_block.png', 273, 325),
  makeBlockfolkSticker('brick-stone-block', 'Brick Stone Block', 'brick_stone_block.png', 273, 325),
  makeBlockfolkSticker('slime-with-droplets', 'Slime with Droplets', 'slime_with_droplets.png', 422, 365),
  makeBlockfolkSticker('wolf', 'Wolf', 'wolf.png', 465, 460),
  makeBlockfolkSticker('boar', 'Boar', 'boar.png', 475, 432),
  makeBlockfolkSticker('bat', 'Bat', 'bat.png', 492, 395),
  makeBlockfolkSticker('moss-golem', 'Moss Golem', 'moss_golem.png', 456, 477),
  makeBlockfolkSticker('red-dragon', 'Red Dragon', 'red_dragon.png', 456, 453),
  makeBlockfolkSticker('wood-door', 'Wood Door', 'wood_door.png', 236, 416),
  makeBlockfolkSticker('stone-door', 'Stone Door', 'stone_door.png', 261, 424),
  makeBlockfolkSticker('square-window', 'Square Window', 'square_window.png', 268, 363),
  makeBlockfolkSticker('round-window', 'Round Window', 'round_window.png', 305, 359),
  makeBlockfolkSticker('broadleaf-tree', 'Broadleaf Tree', 'broadleaf_tree.png', 356, 427),
  makeBlockfolkSticker('pine-tree', 'Pine Tree', 'pine_tree.png', 274, 432),
  makeBlockfolkSticker('bush', 'Bush', 'bush.png', 253, 237),
  makeBlockfolkSticker('berry-bush', 'Berry Bush', 'berry_bush.png', 366, 328)
]);

export const BLOCKFOLK_BACKGROUND = Object.freeze({
  id: 'background-blockfolk-valley',
  name: 'Blockfolk Valley',
  alt: 'Isometric grassy Blockfolk valley with trees, paths, waterfalls, and ponds',
  kind: 'background',
  builtIn: true,
  get dataUrl() { return blockfolkAssetUrl('blockfolk-valley.png'); },
  width: 1448,
  height: 1086,
  fit: 'cover',
  positionX: 0.1,
  positionY: 0.5
});
