// Rybna Wyspa: Narew fish species and rarity tiers (gameplay data; visuals live in src/models/fish.js).

export const RARITIES = [
  { id: 'common', name: 'Pospolita', color: '#6b7785' },
  { id: 'uncommon', name: 'Niepospolita', color: '#4f8a55' },
  { id: 'rare', name: 'Rzadka', color: '#3a6ea8' },
  { id: 'epic', name: 'Epicka', color: '#7c55a6' },
  { id: 'legendary', name: 'Legendarna', color: '#b8841c' },
  { id: 'mythic', name: 'Mityczna', color: '#ad3f76' },
  { id: 'secret', name: 'Sekretna', color: '#24857c' },
];

const S = (id, name, latin, rarity, len, kg, price, b = {}) => ({
  id, name, latin, rarity, len, kg, price,
  flop: b.flop ?? 1, rate: b.rate ?? 1, slip: b.slip ?? 0, decay: b.decay ?? 1, bounce: b.bounce ?? 0.05,
  special: b.special || null, slots: b.slots || (len < 0.45 ? 1 : len < 0.8 ? 2 : len < 1.5 ? 3 : len < 2.6 ? 5 : 99),
  info: b.info || '',
});

export const SPECIES = [
  S('ukleja', 'Ukleja', 'Alburnus alburnus', 0, 0.22, 0.03, 2.1, { rate: 1.6, flop: 0.8, info: 'Srebrna drobnica, skacze bez przerwy.' }),
  S('ploc', 'Płoć', 'Rutilus rutilus', 0, 0.3, 0.25, 3.2, { info: 'Czerwone oczy, najpospolitsza ryba Narwi.' }),
  S('kielb', 'Kiełb', 'Gobio gobio', 0, 0.2, 0.04, 2.5, { flop: 0.6, info: 'Mały denny rybek z wąsikami.' }),
  S('jazgarz', 'Jazgarz', 'Gymnocephalus cernua', 0, 0.2, 0.06, 2.8, { slip: 0.3, info: 'Kolczasty i śliski krewniak okonia.' }),
  S('okon', 'Okoń', 'Perca fluviatilis', 0, 0.32, 0.3, 4.6, { info: 'Pręgowany drapieżnik z kolcem na grzbiecie.' }),
  S('krap', 'Krąp', 'Blicca bjoerkna', 0, 0.3, 0.3, 3.9, { info: 'Płaski, srebrny, wielkie oko.' }),

  S('leszcz', 'Leszcz', 'Abramis brama', 1, 0.55, 1.8, 12, { flop: 0.7, slip: 0.2, info: 'Wysoki i płaski jak talerz, ślizga się.' }),
  S('wzdrega', 'Wzdręga', 'Scardinius erythrophthalmus', 1, 0.32, 0.35, 10, { info: 'Złocista z jaskrawymi płetwami.' }),
  S('karas', 'Karaś', 'Carassius carassius', 1, 0.3, 0.4, 11, { decay: 0.5, info: 'Twardziel: psuje się dwa razy wolniej.' }),
  S('jelec', 'Jelec', 'Leuciscus leuciscus', 1, 0.28, 0.2, 9, { rate: 1.4, info: 'Smukły, szybki, ciągle podskakuje.' }),
  S('klen', 'Kleń', 'Squalius cephalus', 1, 0.48, 1.2, 16, { flop: 1.2, info: 'Gruby łeb, łuski jak siatka.' }),
  S('lin', 'Lin', 'Tinca tinca', 1, 0.42, 1, 18, { slip: 0.5, decay: 0.7, info: 'Oślizgły zielony lekarz stawów.' }),
  S('piskorz', 'Piskorz', 'Misgurnus fossilis', 1, 0.3, 0.08, 22, { slip: 0.6, rate: 2.2, flop: 0.6, special: 'wriggle', info: 'Wije się jak węgorzyk, ma 10 wąsików.' }),

  S('jaz', 'Jaź', 'Leuciscus idus', 2, 0.52, 1.6, 45, { flop: 1.2, info: 'Krępy, złotawy, z czerwonawymi płetwami.' }),
  S('karp', 'Karp', 'Cyprinus carpio', 2, 0.7, 4, 70, { flop: 1.4, info: 'Wielkie łuski i cztery wąsy.' }),
  S('bolen', 'Boleń', 'Leuciscus aspius', 2, 0.7, 2.5, 60, { flop: 1.8, info: 'Drapieżnik z wielką paszczą, daleko skacze.' }),
  S('brzana', 'Brzana', 'Barbus barbus', 2, 0.65, 2, 55, { flop: 1.3, info: 'Płaski brzuch, cztery grube wąsy.' }),
  S('certa', 'Certa', 'Vimba vimba', 2, 0.42, 0.6, 40, { info: 'Wędrowniczka z nosem nad pyskiem.' }),
  S('amur', 'Amur', 'Ctenopharyngodon idella', 2, 0.95, 7, 110, { flop: 2, info: 'Wielka torpeda, potrafi wyskoczyć wysoko.' }),

  S('sandacz', 'Sandacz', 'Sander lucioperca', 3, 0.75, 3, 320, { flop: 1.3, info: 'Szklane oczy i kły. Duma Zalewu Zegrzyńskiego.' }),
  S('szczupak', 'Szczupak', 'Esox lucius', 3, 0.95, 5, 420, { flop: 2.2, info: 'Dziób jak kaczka, skacze najdalej.' }),
  S('mietus', 'Miętus', 'Lota lota', 3, 0.6, 1.2, 380, { slip: 0.5, flop: 0.6, rate: 0.6, info: 'Jedyny słodkowodny dorsz, marmurkowy.' }),
  S('wegorz', 'Węgorz', 'Anguilla anguilla', 3, 0.95, 1.5, 650, { slip: 0.85, rate: 2, flop: 0.9, special: 'wriggle', info: 'Śliski jak mydło, zsuwa się z taśm.' }),

  S('troc', 'Troć wędrowna', 'Salmo trutta trutta', 4, 0.85, 5, 2600, { flop: 2.4, info: 'Srebrna wędrowniczka z czarnymi iksami.' }),
  S('pstrag', 'Pstrąg potokowy', 'Salmo trutta fario', 4, 0.55, 1, 2100, { flop: 2.1, info: 'Czerwone kropki w białych obwódkach.' }),
  S('sum', 'Sum', 'Silurus glanis', 4, 1.8, 25, 5200, { flop: 0.8, rate: 0.6, info: 'Król Narwi. Wąsy jak bicze, waży jak worek cementu.' }),

  S('losos', 'Łosoś atlantycki', 'Salmo salar', 5, 1, 8, 24000, { flop: 2.6, info: 'Wrócił do Narwi po stu latach.' }),
  S('jesiotr', 'Jesiotr ostronosy', 'Acipenser oxyrinchus', 5, 2.3, 60, 52000, { flop: 0.5, rate: 0.5, slip: 0.3, info: 'Pancerny pradawny olbrzym. Wraca do polskich rzek.' }),

  S('rakieta', 'Rakieta GSP', '', 6, 0.8, 3, 260000, { special: 'rocket', flop: 0.6, info: 'Gzowo Space Program. Co jakiś czas odpala silnik.' }),
  S('ognista', 'Ognista', '', 6, 0.6, 2, 330000, { special: 'fire', rate: 1.4, info: 'Ryba z płomieni logo Gzowo Labs. Lodu nie znosi.' }),
  S('wydrukowana', 'Wydrukowana', '', 6, 0.5, 0.8, 280000, { special: 'printed', flop: 0, bounce: 0.45, decay: 0, info: 'Z PLA, prosto z drukarki. Nie psuje się i nie skacze.' }),
  S('gmicro', 'G-Micro', '', 6, 0.55, 1.5, 410000, { special: 'glitch', info: 'Sieć neuronowa w kształcie ryby. 117M parametrów łusek.' }),
  S('zloty_sum', 'Złoty Sum z Gzowa', '', 6, 2, 30, 750000, { flop: 0.7, rate: 0.5, info: 'Legenda działki. Podobno widziany przy pomoście.' }),
  S('potwor', 'Potwór z Narwi', '', 6, 3.4, 250, 1200000, { flop: 0.5, rate: 0.35, info: 'Zajmuje cały stos. Lepiej nie pytać, co je.' }),
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s, i) => [s.id, Object.assign(s, { idx: i })]));
