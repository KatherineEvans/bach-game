// Photos live in ../../Horses so the originals stay the single source of truth.
// (Several are actually WebP/JPEG behind a .png name — browsers sniff the bytes,
// and Vite just copies them through, so it doesn't matter.)
import achilles from '../../Horses/Achilles.png'
import altivo from '../../Horses/Altivo.png'
import angus from '../../Horses/Angus.png'
import artax from '../../Horses/Artax.png'
import blackbeauty from '../../Horses/BlackBeauty.png'
import bojack from '../../Horses/BoJackHorseman.png'
import bullseye from '../../Horses/Bullseye.png'
import froufrou from '../../Horses/FrouFrou.png'
import khan from '../../Horses/Khan.png'
import maximus from '../../Horses/Maximus.png'
import pegasus from '../../Horses/Pegasus.png'
import phillipe from '../../Horses/Phillipe.png'
import pokey from '../../Horses/Pokey.png'
import samson from '../../Horses/Samson.png'
import shadowfax from '../../Horses/Shadowfax.png'
import spirit from '../../Horses/Spirit.png'

export const HORSES = {
  spirit:      { name: 'Spirit',          sub: 'Spirit: Stallion of the Cimarron', img: spirit },
  maximus:     { name: 'Maximus',         sub: 'Tangled',                          img: maximus },
  pegasus:     { name: 'Pegasus',         sub: 'Hercules',                         img: pegasus },
  samson:      { name: 'Samson',          sub: 'Sleeping Beauty',                  img: samson },
  khan:        { name: 'Khan',            sub: 'Mulan',                            img: khan },
  achilles:    { name: 'Achilles',        sub: 'The Hunchback of Notre Dame',      img: achilles },
  artax:       { name: 'Artax',           sub: 'The NeverEnding Story',            img: artax },
  altivo:      { name: 'Altivo',          sub: 'The Road to El Dorado',            img: altivo },
  angus:       { name: 'Angus',           sub: 'Brave',                            img: angus },
  bullseye:    { name: 'Bullseye',        sub: 'Toy Story',                        img: bullseye },
  froufrou:    { name: 'Frou-Frou',       sub: 'The Aristocats',                   img: froufrou },
  phillipe:    { name: 'Philippe',        sub: 'Beauty and the Beast',             img: phillipe },
  bojack:      { name: 'BoJack Horseman', sub: 'BoJack Horseman',                  img: bojack },
  pokey:       { name: 'Pokey',           sub: 'Gumby',                            img: pokey },
  shadowfax:   { name: 'Shadowfax',       sub: 'The Lord of the Rings',            img: shadowfax },
  blackbeauty: { name: 'Black Beauty',    sub: 'Black Beauty',                     img: blackbeauty },
}

export const HORSE_KEYS = Object.keys(HORSES)

export const SEED = [
  ['maximus', 'samson'],
  ['khan', 'phillipe'],
  ['pegasus', 'artax'],
  ['shadowfax', 'spirit'],
  ['bullseye', 'froufrou'],
  ['altivo', 'angus'],
  ['bojack', 'pokey'],
  ['blackbeauty', 'achilles'],
]

export const ROUND_META = [
  { name: 'Round of 16', sub: 'The Open Field',   hint: 'Tap a horse to send them through.' },
  { name: 'Elite 8',     sub: 'Fan Favorites',    hint: 'The field narrows. Choose wisely.' },
  { name: 'Final 4',     sub: 'Barn Burners',     hint: "Two spots left in the winner's circle." },
  { name: 'The Final',   sub: "Winner's Circle",  hint: 'Crown the Hottest Horse.' },
]
