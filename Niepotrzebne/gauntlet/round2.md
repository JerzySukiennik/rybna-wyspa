# Rybna Wyspa, runda 2

## 1. Werdykt

**NIE.** Poza autorskim UI świat 3D to płasko oświetlony, pusty, generyczny low-poly z błędami widocznymi gołym okiem (zasłonięty szyld, czarny skup nocą, eliptyczny księżyc, rozsypany stos ryb), czyli przeciętne indie.

## 2. Oceny 1-100

- **Wyspa i teren: 42.** Płaski placek jednolitej limonkowej trawy, rozmyta ścieżka, pionowa skarpa zamiast brzegu (a), trawa z góry jak konfetti (c).
- **Woda, niebo i światło: 45.** Rzeka w a się broni, ale dzień płaski i zamglony (środek a: 51-194 z 255), odbicia schodkowe (f), deszcz prawie niewidoczny, noc wadliwa (g).
- **Ryby (modele): 64.** 34 gatunki z czytelnymi wzorami (okoń, szczupak, jesiotr), lecz jeden szablon korpusu, płetwy-karty, oczy-kropki.
- **Roślinność i dekoracje: 44.** Wierzby jak meduzy, brzozy jak pasiaste słupki, olchy-lizaki w równych rzędach.
- **Postać i ręce: 40.** Ciemna twarz z niewidocznymi oczami, wędka jak antena; dłonie FPP to łopaty, stos się rozjeżdża (d).
- **Bloki, maszyny i taśmy: 52.** Pompa ma charakter, przenośnik czytelny, ale fabryczny i powtarzalny; lej jak brodzik.
- **Budynki i znaki: 46.** Pudełka w płaskich kolorach, puste wnętrza, zasłonięty szyld, napisy fontem HUD-u.
- **HUD i UI: 65.** Spójny papier, granat i teal, ale ucięta pieczątka, 6 z 9 slotów pustych, ucięty rząd sklepu.
- **Kompozycja i czytelność kadru: 42.** Dolne 40% b, c, f to pusta trawa; stos w d zasłania środek kadru; skup w g to czarna plama.
- **Spójność stylu i klimat: 54.** Narew, most, pompa i polskie gatunki dają klimat, ale świat wygląda jak kit, a style renderu się mieszają.

## 3. AI slop 1-100

**55.** Ponad 20 z 34 ryb to jeden korpus z inną farbą i tym samym zygzakiem fasetek; drzewa-lizaki i kule-krzaki jak z darmowej paczki; równy szpaler drzew na drugim brzegu, ten sam silnik na każdej nodze taśmy; kolory rzadkości z MMO; nieprzejrzane efekty (DOF w a, przepalony specular w d, eliptyczny księżyc i pikselowe gwiazdy w g). W dół ciągną: UI i lokalne odniesienia.

## 4. Największa luka w każdej kategorii

- **Wyspa i teren:** grunt (a, b, f) to jednolite ~#7DA048 z równym konfetti trójkątów; ma mieć 3-4 tony w plamach, kępy trawy i łagodny, błotnisty brzeg.
- **Woda, niebo i światło:** deszcz w f to tylko szare niebo: trawa nasycona jak w słońcu (S 0,39 vs 0,38), smug prawie brak, rzeka bez kręgów.
- **Ryby (modele):** ukleja, jelec, boleń, certa, łosoś i troć to ten sam srebrny kształt; każdy gatunek potrzebuje własnej głowy, pyska i sylwetki.
- **Roślinność i dekoracje:** wierzby płaczące (a, d, f) to kopuła z szerokimi wstążkami; mają mieć łukowate konary i gęste, wąskie witki.
- **Postać i ręce:** w d dwie ryby leżą na dłoniach, trzecia, dwa razy większa, wisi nad nimi w powietrzu, czwarta to ditherowany duch; stos ma być zwarty, w dłoniach z kciukami.
- **Bloki, maszyny i taśmy:** przenośnik (c, f) ma silnik na każdej nodze i ucięty koniec; brak bębna końcowego, zsypu do leja, mokrej taśmy.
- **Budynki i znaki:** w b markiza zasłania dół liter „SKLEP RYBACKI”, wnętrze to pusta beżowa ściana, szczupak wisi w powietrzu.
- **HUD i UI:** w e stopka ucina drugi rząd kart (brak przycisków), ikony ~60 px na kartach ~230 px, „Co 3.8 s” obok „co 4,5 s”.
- **Kompozycja i czytelność kadru:** ryba w c ma ~60 px i bez cienia ginie w trawie; potrzebny blob shadow i obrys.
- **Spójność stylu i klimat:** paleta UI nie istnieje w limonkowo-szarym świecie; fasetowe chmury obok rozmytego szumu (f), DOF w a, bloom w d.

## 5. Jedna największa luka całości

Światło i kolor. Każdy kadr wygląda jak domyślna scena three.js: zamglony dzień, cień tylko ~25% ciemniejszy od słońca (b: Y 0,41 vs 0,56), brak AO, limonkowy grunt, noc bez wypełnienia (ściany skupu RGB 0,1,3). Jeden pass światła i gradingu podniesie wszystkie kadry naraz.

## 6. Lista poprawek

1. **Światło:** ciepły key #FFE2B8 na 35-40°, słabszy hemisphere (#BFD3F0/#55603A), cień 45-55% ciemniejszy od słońca; SSAO o promieniu ~1 m; mgła ×0,5 w kolorze horyzontu.
2. **Grunt:** vertex color z szumu (#6E8A45, #7E9850, #5D7740, plamy 6-10 m); trawa w kępach po 5-15 źdźbeł; 2-3% kwiatków; błoto 1-2 m przy wodzie; wgłębiona ścieżka z krawędzią.
3. **Stos (d):** ryby ciasno na dłoniach, stos ≤35% wysokości ekranu, bez dither-ducha (nadmiar tylko w liczniku), roughness ≥0,5 przeciw przepaleniom.
4. **Deszcz (f):** grunt ×0,75 jasności, ×0,7 nasycenia, roughness 0,35; 2-3 tys. smug 0,5 m, opacity 0,4; kręgi na wodzie, kałuże.
5. **Noc (g):** księżyc jako okrągły sprite zwrócony do kamery; gwiazdy jako points 1-3 px z wariacją jasności; wypełnienie ≥0,15 w #2A3A5E; smuga księżyca na wodzie.
6. **Wierzby i brzozy:** 4-6 łukowatych konarów, 60-100 witek szer. 4-6 cm w 3 długościach; brzozy z nieregularnymi kreskami zamiast równych pasów.
7. **Ryby:** pysk i długość głowy per gatunek, pokrywa skrzelowa, oko 1,5× z tęczówką, segmentowane płetwy; fresnel w kolorze rzadkości od Rzadkiej; węgorz z ostrym ogonem; blob shadow na ziemi.
8. **Sklep i skup:** szyld 30-40 cm nad markizą; markiza z ząbkami i grubością; we wnętrzu sieci, waga, wiadra, cennik; deski ±8% jasności; szczupak na łańcuszku.
9. **Wyspa (a):** 1-3 m rzeźby i łagodny spadek do wody zamiast skarpy; przezroczysta płycizna z dnem zamiast mlecznego jadeitu; usunąć brązowe ostrosłupy przy pomoście.
10. **UI:** pieczątka w całości na karcie; puste sloty niższe lub ukryte; sklep z przewijaniem, ikony 120 px, kłódka; przecinek dziesiętny, bez sierot „2%”.
11. **Menu (a):** w tle pracująca farma (taśmy, ryby w powietrzu, awatary), logo, bez DOF na wyspie, większe fasetowe chmury.
12. **Awatar i taśma:** głowa +15-20%, jaśniejsza twarz z oczami, wędka z kołowrotkiem; taśma z bębnem końcowym, osłonami i jednym napędem na segment.
