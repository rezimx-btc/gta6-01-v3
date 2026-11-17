// Shops: three storefronts that sell survival. Walk up to one and press E — the same key
// that steals cars, so the loop checks the shop first when Rae is on foot and empty-handed.
// A shop only sells what it stocks, and only when Rae can pay for it.

import { SHOPS } from './config.js';

/** The prompt the HUD shows when a shop is in reach. */
export function shopPrompt(shop) {
  return `${shop.name} — ${shop.blurb} (press E)`;
}

/** The shop Rae is standing in front of, or null. */
export function nearestShop(state) {
  const player = state.player;
  if (!player.onFoot) return null;
  for (let i = 0; i < SHOPS.length; i += 1) {
    const shop = SHOPS[i];
    if (Math.hypot(player.x - shop.x, player.y - shop.y) < 85) return shop;
  }
  return null;
}

/**
 * Buy from a shop: ammo, a full heal, or a full set of armour. Returns the banner line,
 * or null when the sale cannot happen (broke, or already full). Cash only — no credit in Solmar.
 */
export function buyShop(state, shop) {
  const player = state.player;
  if (player.cash < shop.price) return 'Not enough cash — the shop keeps its goods.';
  if (shop.sell === 'ammo' && player.ammo >= 120) return 'Ammo already full — save your money.';
  if (shop.sell === 'health' && player.health >= 100) return 'Already fighting fit — save your money.';
  if (shop.sell === 'armor' && player.armor >= 100) return 'Armour already full — save your money.';
  player.cash -= shop.price;
  if (shop.sell === 'ammo') player.ammo = Math.min(120, player.ammo + shop.amount);
  else if (shop.sell === 'health') player.health = 100;
  else if (shop.sell === 'armor') player.armor = 100;
  return `Bought at ${shop.name} — ${shop.blurb}`;
}
