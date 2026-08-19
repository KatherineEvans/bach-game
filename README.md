# The Hottest Horse Invitational 🐴

A Vue 3 bracket app for settling, once and for all, which horse is hottest.
Every vote is recorded in `localStorage`, so picks survive a refresh and the
all-time standings build up across brackets.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

To build and check the production bundle:

```bash
npm run build
npm run preview
```

`npm run build` writes to `dist/`. It needs to be *served* (that's what
`preview` does) — Chrome blocks ES modules loaded over `file://`, so
double-clicking `dist/index.html` won't work. Any static host will.

## How the voting works

- **Round of 16 → Elite 8 → Final 4 → The Final.** Tap a horse to send them
  through. Rounds unlock as the previous one fills in, and changing a pick
  tears down whatever that branch had already decided. Finishing a round
  never moves you off it — advancing is always the **Next** button (or a
  round tab), so you can review and revise picks first.
- **Champion** screen crowns the winner. **Run it back** banks the finished
  bracket into the Hall of Fame and deals a fresh one.
- **Hall of Fame** is the all-time record: wins, matchups, win rate, and
  trophies for each horse, plus a list of past champions.

Standings are *derived*, never incremented — they're computed from the
archived brackets plus whatever is decided in the live one. So changing your
mind mid-bracket moves the vote instead of double-counting it.

## localStorage keys

| Key | Contents |
| --- | --- |
| `hottest-horses:bracket:v1` | The in-progress bracket: rounds, champion, current view |
| `hottest-horses:runs:v1` | Every completed bracket: champion, timestamp, picks |

A saved bracket that doesn't match the expected shape is discarded on load
rather than crashing the app, so it's safe to change the seed and reload.

"Erase all recorded votes" clears both keys.

## Adding or swapping horses

Photos live in `Horses/` and are the single source of truth — nothing is
duplicated into `src/`. To change the field, edit `src/data/horses.js`:
import the image, add an entry to `HORSES`, and put the key in `SEED`.
`SEED` is 8 pairs; a different size needs a power of two.

(Several files in `Horses/` are WebP or JPEG behind a `.png` name. Browsers
sniff the actual bytes, so it renders fine either way.)

## Layout

```
src/
  main.js                     app entry
  App.vue                     masthead, view switching, footer actions
  style.css                   all styling (design carried over from the original mockup)
  data/horses.js              horses, photo imports, seeding, round names
  composables/
    useStorage.js             a ref that mirrors itself into localStorage
    useTournament.js          bracket state, pick logic, derived standings
  components/
    RoundTabs.vue             round navigation
    RoundView.vue             one round's matches
    MatchCard.vue             a single head-to-head
    HorseCard.vue             one horse, pickable or not
    BracketRecap.vue          collapsible "bracket so far"
    ChampionView.vue          winner's circle
    HallOfFame.vue            all-time standings
    ConfettiBurst.vue         confetti (respects prefers-reduced-motion)
```

`Horses/hottest-horse-bracket.html` is the original single-file mockup, kept
for reference.
