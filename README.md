# gta6-01-v3

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/rezimx-btc/gta6-01-v3/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/rezimx-btc/gta6-01-v3/reward.svg)](https://make.fun/bounty/gta6-01)

## SOLMAR LIVE — Streets of Gold

An original 3D open-world crime game in a sun-soaked fictional city. Rae Vega starts as a
courier with a pistol and a grudge, and rises through twelve missions in five acts — from
First Delivery to Kingpin's Gambit — to become Kingpin of Solmar.

**The city:** five districts (The Hills, Downtown, Old Port, Barrio Sol, Marina Bay)
with a beach and a sea, rendered in 3D with Three.js (vendored, offline). Traffic follows
the road grid, pedestrians stroll the sidewalks and scatter when shots ring out, and the
sun sets the whole city in gold.

**The life:** steal any car and drive it (E to enter, E to step out), outrun patrol cars,
foot cops and the police helicopter as the wanted level climbs from 0 to 5 stars, take
taxi fares and package runs between jobs, fight rival crews, buy ammo, health and armour
at the shops, and switch the radio between three stations.

**The hook — SOLMAR LIVE:** every heist is streamed live to the whole city. Viewers grow
with the drama, donations trickle in, and when the hype gets too hot, someone in the chat
snitches — leaking Rae's position to the cops and spiking the heat. On the final job the
chat snitches even sooner. The stream is a mechanic, not a label: it changes how the law
finds you.

**The systems:** wanted heat that cools when the law loses sight of you (unless the
helicopter is overhead), busted and flatlined screens, a HUD with cash, rank, health,
armour, ammo, wanted stars, objective, speed, radio and a live minimap, a start screen
over the living city, and a localStorage save. Every name, character, place and story
beat is original — nothing from any commercial game.

## Controls

- **WASD / arrows** — walk and drive (Shift to run)
- **E** — enter a car, step out, or buy at a shop when on foot near one
- **F / click** — shoot (on foot)
- **1 / 2 / 3 / R** — radio stations SOL FM, Barrio Beats, Gold Talk (R cycles)
- **P / Esc** — pause
- **M** — mute

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The screenshots are staged by the game itself:
`?shot=chase`, `?shot=drive`, `?shot=mission`, `?shot=heli` (each with `&seed=7`).
