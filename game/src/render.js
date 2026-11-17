// Render: the whole visible city, drawn every frame with Three.js. A top-down follow
// camera with a soft shadow, day-night light that cycles over eight minutes, and a world
// of boxes: roads, sand, sea, buildings with lit windows and rooftop clutter, cars with
// headlights, pedestrians, palms, the player, police, a helicopter searchlight, pickups,
// and the mission markers that guide the eye. The HUD and the minimap are DOM, not WebGL.

import * as THREE from '../vendor/three.module.min.js';
import { ROADS, SHOPS, WORLD } from './config.js';
import { heliHeight } from './helicopter.js';
import { currentMarker, currentObjective, rankOf } from './missions.js';
import { playerKmh } from './player.js';
import { stationName } from './radio.js';

/** Build the renderer, scene, camera, lights, and the static world in one go. */
export function createRenderer(gameEl, state) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  gameEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d9);
  scene.fog = new THREE.Fog(0x87b5d9, 1200, 3800);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 6000);
  camera.position.set(state.player.x, 520, state.player.y + 420);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.position.set(500, 900, 300);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -900;
  sun.shadow.camera.right = 900;
  sun.shadow.camera.top = 900;
  sun.shadow.camera.bottom = -900;
  sun.shadow.camera.far = 3000;
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xbfd4e6, 0.7);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x3d4a35, 0.5);
  scene.add(hemi);

  buildGround(scene, state);
  buildBuildings(scene, state);
  buildPalms(scene, state);
  buildShops(scene, state);
  buildSea(scene, state);

  const dynamic = new THREE.Group();
  scene.add(dynamic);
  return { renderer, scene, camera, sun, ambient, hemi, dynamic };
}

/** The ground: dark tarmac roads on grass, plus the sand and the sea beyond. */
function buildGround(scene, state) {
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, WORLD.height),
    new THREE.MeshLambertMaterial({ color: 0x5d7a4a }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(WORLD.width / 2, -0.5, WORLD.height / 2);
  grass.receiveShadow = true;
  scene.add(grass);
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2e33 });
  for (const vx of ROADS.vertical) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROADS.width, WORLD.height), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(vx, 0, WORLD.height / 2);
    road.receiveShadow = true;
    scene.add(road);
  }
  for (const hy of ROADS.horizontal) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, ROADS.width), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(WORLD.width / 2, 0, hy);
    road.receiveShadow = true;
    scene.add(road);
  }
}

/**
 * The buildings: each one a box with a coloured facade, a darker roof slab, a small
 * parapet trim, and rooftop clutter — air-conditioning units, vents and, on the tallest
 * towers, a blinking beacon. From any angle the roof reads as a roof, not a flat slab.
 */
function buildBuildings(scene, state) {
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const trimGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitGeo = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x3a3a40 });
  const acMat = new THREE.MeshLambertMaterial({ color: 0x8a8f94 });
  const ventMat = new THREE.MeshLambertMaterial({ color: 0x5a5f66 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const litWindows = [];
  for (let i = 0; i < state.city.buildings.length; i += 1) {
    const b = state.city.buildings[i];
    const color = b.color;
    if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color }));
    // The city's tall is a 2D draw height: times four it reads as a real tower in 3D.
    const h = b.tall * 4;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const mesh = new THREE.Mesh(boxGeo, mats.get(color));
    mesh.scale.set(b.width, h, b.height);
    mesh.position.set(cx, h / 2, cy);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    // A parapet trim rings the roof edge, a darker slab caps it, and the clutter sits on
    // top: AC units and vents, scaled to the building, plus a beacon on the tallest.
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.scale.set(b.width + 6, 4, b.height + 6);
    trim.position.set(cx, h + 2, cy);
    scene.add(trim);
    const slab = new THREE.Mesh(boxGeo, roofMat);
    slab.scale.set(b.width - 8, 3, b.height - 8);
    slab.position.set(cx, h + 4.5, cy);
    scene.add(slab);
    const seed = i * 7919 + 13;
    const units = 1 + ((seed * 7) % 3);
    for (let u = 0; u < units; u += 1) {
      const ux = cx + ((seed * 13 + u * 29) % Math.max(20, b.width - 30)) - b.width / 2 + 15;
      const uz = cy + ((seed * 17 + u * 23) % Math.max(20, b.height - 30)) - b.height / 2 + 15;
      const unit = new THREE.Mesh(unitGeo, u % 2 === 0 ? acMat : ventMat);
      unit.scale.set(14, 10, 14);
      unit.position.set(ux, h + 11, uz);
      scene.add(unit);
    }
    if (h > 160) {
      const beacon = new THREE.Mesh(unitGeo, beaconMat);
      beacon.scale.set(6, 10, 6);
      beacon.position.set(cx, h + 12, cy);
      scene.add(beacon);
    }
    // Windows: small bright planes on the facade, lit at night.
    const floors = Math.max(1, Math.floor(h / 22));
    for (let f = 0; f < floors; f += 1) {
      for (let w = 0; w < 3; w += 1) {
        if ((seed * 31 + f * 7 + w * 11) % 5 !== 0) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 10), windowMat);
        win.position.set(cx - b.width / 2 + 16 + w * (b.width / 3.2), 18 + f * 22, cy + b.height / 2 + 0.6);
        litWindows.push(win);
        scene.add(win);
      }
    }
  }
  scene.userData.litWindows = litWindows;
}

/** Palms along the beach and the marina promenade. */
function buildPalms(scene, state) {
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8a4a });
  const palms = state.city.decorations.filter((d) => d.kind === 'palm');
  for (let i = 0; i < palms.length; i += 1) {
    const palm = palms[i];
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 46, 6), trunkMat);
    trunk.position.set(palm.x, 23, palm.y);
    trunk.castShadow = true;
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(26, 22, 7), leafMat);
    leaves.position.set(palm.x, 54, palm.y);
    scene.add(leaves);
  }
}

/** Shop markers: a glowing awning and a floating sign above each storefront. */
function buildShops(scene, state) {
  const signMat = new THREE.MeshBasicMaterial({ color: 0xffd24a });
  for (let i = 0; i < SHOPS.length; i += 1) {
    const shop = SHOPS[i];
    const awning = new THREE.Mesh(new THREE.BoxGeometry(90, 8, 60), new THREE.MeshLambertMaterial({ color: 0xc23b3b }));
    awning.position.set(shop.x, 26, shop.y);
    scene.add(awning);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(70, 14, 4), signMat);
    sign.position.set(shop.x, 48, shop.y);
    scene.add(sign);
  }
}

/** The sea: a flat blue plane beyond the beach, and a pale sand strip in front of it. */
function buildSea(scene, state) {
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, 220),
    new THREE.MeshLambertMaterial({ color: 0xd9c48a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WORLD.width / 2, 0.4, WORLD.height - 110);
  sand.receiveShadow = true;
  scene.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, 700),
    new THREE.MeshLambertMaterial({ color: 0x2f7fb8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(WORLD.width / 2, 0.2, WORLD.height + 350);
  scene.add(sea);
}

/** The moving pieces, rebuilt every frame: cars, people, markers, effects. */
function buildDynamicMeshes(state, dynamic) {
  dynamic.clear();
  const carGeo = new THREE.BoxGeometry(1, 1, 1);
  const carMats = new Map();
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    const kind = { sedan: { length: 62, width: 28 }, taxi: { length: 62, width: 28 }, sport: { length: 66, width: 28 }, truck: { length: 100, width: 32 }, van: { length: 78, width: 30 }, police: { length: 64, width: 28 } }[car.kind];
    if (!carMats.has(car.color)) carMats.set(car.color, new THREE.MeshLambertMaterial({ color: car.color }));
    const mesh = new THREE.Mesh(carGeo, carMats.get(car.color));
    mesh.scale.set(kind.length, 16, kind.width);
    mesh.position.set(car.x, 9, car.y);
    mesh.rotation.y = -car.angle;
    mesh.castShadow = true;
    dynamic.add(mesh);
    if (car.wrecked) {
      const smoke = new THREE.Mesh(
        new THREE.ConeGeometry(14, 30, 6),
        new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.5 }),
      );
      smoke.position.set(car.x, 32, car.y);
      dynamic.add(smoke);
    }
  }
  const pedGeo = new THREE.CapsuleGeometry(9, 16, 3, 6);
  const pedMats = new Map();
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    if (!pedMats.has(ped.color)) pedMats.set(ped.color, new THREE.MeshLambertMaterial({ color: ped.color }));
    const mesh = new THREE.Mesh(pedGeo, pedMats.get(ped.color));
    mesh.position.set(ped.x, 16, ped.y);
    mesh.rotation.y = -ped.angle;
    mesh.castShadow = true;
    dynamic.add(mesh);
  }
  const player = state.player;
  const pMesh = new THREE.Mesh(new THREE.CapsuleGeometry(11, 18, 3, 8), new THREE.MeshLambertMaterial({ color: 0xff5a7a }));
  pMesh.position.set(player.x, 18, player.y);
  pMesh.rotation.y = -player.angle;
  pMesh.castShadow = true;
  dynamic.add(pMesh);
  for (let i = 0; i < state.police.foot.length; i += 1) {
    const cop = state.police.foot[i];
    const mesh = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: 0x2a4a8a }));
    mesh.position.set(cop.x, 16, cop.y);
    mesh.rotation.y = -cop.angle;
    dynamic.add(mesh);
  }
  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    const mesh = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: 0x8a2a2a }));
    mesh.position.set(enemy.x, 16, enemy.y);
    mesh.rotation.y = -enemy.angle;
    dynamic.add(mesh);
  }
}

/** The rest of the moving pieces: the helicopter and its searchlight, pickups, bullets, and the mission markers. */
function buildDynamicExtras(state, dynamic) {
  const player = state.player;
  for (let i = 0; i < state.police.helis.length; i += 1) {
    const heli = state.police.helis[i];
    if (!heli.active) continue;
    const body = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 20), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    body.position.set(heli.x, heliHeight(), heli.y);
    dynamic.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(90, 2, 4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.set(heli.x, heliHeight() + 10, heli.y);
    rotor.rotation.y = heli.rotor;
    dynamic.add(rotor);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(70, heliHeight(), 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.set(heli.x, heliHeight() / 2, heli.y);
    dynamic.add(cone);
  }
  for (let i = 0; i < state.pickups.length; i += 1) {
    const p = state.pickups[i];
    const color = p.kind === 'health' ? 0x3fd68a : (p.kind === 'ammo' ? 0xffd24a : 0x2fd68a);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshLambertMaterial({ color }));
    mesh.position.set(p.x, 10 + Math.sin(p.t * 4) * 4, p.y);
    mesh.rotation.y = p.t;
    dynamic.add(mesh);
  }
  for (let i = 0; i < state.bullets.length; i += 1) {
    const b = state.bullets[i];
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe14a }));
    mesh.position.set(b.x, 12, b.y);
    dynamic.add(mesh);
  }
  const marker = currentMarker(state);
  if (marker !== null) {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 26, 300, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(marker.x, 150, marker.y);
    dynamic.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(26, 40, 24), new THREE.MeshBasicMaterial({ color: 0xffd24a, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(marker.x, 2, marker.y);
    dynamic.add(ring);
  }
  if (state.missions.taxi.active) {
    const t = state.missions.taxi;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 20, 240, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2fd68a, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(t.x, 120, t.y);
    dynamic.add(beam);
  }
  if (state.missions.delivery.active) {
    const d = state.missions.delivery;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 20, 240, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x2f9fd6, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(d.x, 120, d.y);
    dynamic.add(beam);
  }
  if (state.missions.escort !== null && !state.missions.escort.wrecked) {
    const e = state.missions.escort;
    const ring = new THREE.Mesh(new THREE.RingGeometry(30, 44, 24), new THREE.MeshBasicMaterial({ color: 0xffd24a, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(e.x, 2, e.y);
    dynamic.add(ring);
  }
  const dest = currentMarker(state);
  if (dest !== null) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 60), new THREE.MeshBasicMaterial({ color: 0xffd24a }));
    line.position.set(player.x + (dest.x - player.x) * 0.15, 4, player.y + (dest.y - player.y) * 0.15);
    line.rotation.y = -Math.atan2(dest.y - player.y, dest.x - player.x);
    dynamic.add(line);
  }
}

/** Draw one frame: move the camera and the sun, rebuild the moving pieces, render. */
export function drawFrame(view, state) {
  const { renderer, scene, camera, sun, ambient, hemi } = view;
  const player = state.player;
  const cam = state.camera;
  const targetX = player.x;
  const targetY = player.y;
  const lerp = 1 - Math.pow(0.001, 1 / 60);
  cam.x += (targetX - cam.x) * lerp;
  cam.y += (targetY - cam.y) * lerp;
  camera.position.set(cam.x, 470, cam.y + 370);
  camera.lookAt(cam.x, 0, cam.y);

  // Day and night cycle over eight minutes: the sun circles, the sky and the windows follow.
  const cycle = (state.time % 480) / 480;
  const day = Math.sin(cycle * Math.PI * 2);
  const sunAngle = cycle * Math.PI * 2;
  sun.position.set(cam.x + Math.cos(sunAngle) * 800, 400 + Math.max(0, day) * 600, cam.y + Math.sin(sunAngle) * 800);
  sun.intensity = 0.25 + Math.max(0, day) * 1.5;
  ambient.intensity = 0.35 + Math.max(0, day) * 0.4;
  hemi.intensity = 0.25 + Math.max(0, day) * 0.35;
  const night = Math.max(0, -day);
  scene.background.setRGB(0.53 - night * 0.4, 0.71 - night * 0.55, 0.85 - night * 0.6);
  scene.fog.color.copy(scene.background);
  const lit = scene.userData.litWindows ?? [];
  for (let i = 0; i < lit.length; i += 1) lit[i].visible = night > 0.4;

  buildDynamicMeshes(state, view.dynamic);
  buildDynamicExtras(state, view.dynamic);
  renderer.render(scene, camera);
}

/** The HUD: health, armour, ammo, cash, wanted stars, speed, mission, stream, radio. */
export function updateHud(state) {
  const player = state.player;
  const el = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const node = el(id);
    if (node) node.textContent = value;
  };
  setText('hud-health', `♥ ${Math.ceil(player.health)}`);
  setText('hud-armor', `🛡 ${Math.ceil(player.armor)}`);
  setText('hud-ammo', `🔫 ${player.ammo}`);
  setText('hud-cash', `$${player.cash.toLocaleString('en-US')}`);
  setText('hud-wanted', player.wanted > 0 ? '★'.repeat(player.wanted) + '☆'.repeat(5 - player.wanted) : '☆☆☆☆☆');
  setText('hud-speed', `${playerKmh(state)} km/h`);
  setText('hud-rank', rankOf(state));
  setText('hud-objective', currentObjective(state));
  setText('hud-radio', stationName(state));
  const stream = state.stream;
  setText('hud-viewers', stream.live ? `🔴 LIVE ${stream.viewers.toLocaleString('en-US')} viewers` : '⚫ OFF AIR');
  setText('hud-hype', stream.live ? `HYPE ${Math.round(stream.hype)}%` : '');
  const chat = el('hud-chat');
  if (chat) {
    const lines = stream.chat.map((c) => `<div class="chat-${c.kind}">${escapeHtml(c.text)}</div>`).join('');
    if (chat.dataset.rendered !== lines) {
      chat.innerHTML = lines;
      chat.dataset.rendered = lines;
    }
  }
  const banner = el('hud-banner');
  if (banner) {
    const m = state.missions;
    if (m.bannerT > 0) {
      banner.textContent = m.banner;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  }
  const toast = el('hud-toast');
  if (toast) {
    if (state.toastT > 0) {
      toast.textContent = state.toast;
      toast.style.display = 'block';
    } else {
      toast.style.display = 'none';
    }
  }
  const end = el('hud-end');
  if (end) {
    if (player.dead) {
      end.textContent = 'WASTED — press R to restart';
      end.style.display = 'block';
    } else if (player.busted) {
      end.textContent = 'BUSTED — press R to restart';
      end.style.display = 'block';
    } else if (state.missions.storyDone) {
      end.textContent = 'KINGPIN — story complete. Free roam, Solmar is yours.';
      end.style.display = 'block';
    } else {
      end.style.display = 'none';
    }
  }
}

/** Escape chat text before it reaches the DOM — the chat is ours, but the habit is cheap. */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The minimap: the whole city at 190 pixels, with Rae, the marker, the cops and the sea. */
export function updateMinimap(state) {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const sx = w / WORLD.width;
  const sy = h / WORLD.height;
  ctx.fillStyle = '#24351f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(0, h - 12, w, 12);
  ctx.fillStyle = '#5d7a4a';
  ctx.fillRect(0, 0, w, h - 12);
  ctx.fillStyle = '#2e2e33';
  for (const vx of ROADS.vertical) ctx.fillRect(vx * sx - 2, 0, 4, h);
  for (const hy of ROADS.horizontal) ctx.fillRect(0, hy * sy - 2, w, 4);
  ctx.fillStyle = '#8a8f94';
  for (let i = 0; i < state.city.buildings.length; i += 1) {
    const b = state.city.buildings[i];
    ctx.fillRect(b.cx * sx - 2, b.cy * sy - 2, 4, 4);
  }
  const marker = currentMarker(state);
  if (marker !== null) {
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.arc(marker.x * sx, marker.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff4444';
  for (let i = 0; i < state.cars.length; i += 1) {
    const car = state.cars[i];
    if (car.driver === 'police' && !car.wrecked) {
      ctx.beginPath();
      ctx.arc(car.x * sx, car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ff5a7a';
  ctx.beginPath();
  ctx.arc(state.player.x * sx, state.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
}

/** Keep the canvas the size of the window. */
export function resizeRenderer(view) {
  view.renderer.setSize(window.innerWidth, window.innerHeight);
  view.camera.aspect = window.innerWidth / window.innerHeight;
  view.camera.updateProjectionMatrix();
}

/** The frame loop: advance the game, then draw it. */
export function animate(view, state, update) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(state, dt);
    drawFrame(view, state);
    updateHud(state);
    updateMinimap(state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** Convert a screen point (CSS pixels) to a point on the ground plane, for mouse aim. */
export function screenToWorld(view, px, py) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, view.camera);
  const origin = raycaster.ray.origin;
  const dir = raycaster.ray.direction;
  if (Math.abs(dir.y) < 0.0001) return null;
  const t = -origin.y / dir.y;
  if (t < 0) return null;
  return { x: origin.x + dir.x * t, y: origin.z + dir.z * t };
}
