# Runda 4: krytyka Rybnej Wyspy

## 1. Werdykt
**NIE.** Ryby i papierowy UI sięgają porządnego indie, ale teren z losowo barwionych trójkątów, drzewa z ikosfer, płaskie światło i puste kadry (a, c, g) wyglądają jak dopracowany prototyp.

## 2. Oceny 1-100
- **Wyspa i teren: 40.** Płaski dysk z trójkątów 2-3 m, sąsiednie skaczą od #576D2A do #8A8A4B; ścieżka to postrzępiony pas trójkątów (a, c); zero rzeźby.
- **Woda, niebo i światło: 48.** Woda w (a) poprawna, ale chmury szare jak kamień (#949999, b, d), światło neutralne bez AO, latarnie nie świecą (f, g), deszcz to kilka grubych patyków (f).
- **Ryby (modele): 64.** Gatunki rozpoznawalne (prążki okonia, tarczki jesiotra, wąsy suma), ale oczy-naklejki w kilku stylach, brak pyska i pokryw skrzelowych, papierowe płetwy, mityczny łosoś wygląda jak pospolita certa.
- **Roślinność i dekoracje: 44.** Brzoza to lizaki z ikosfer z zielonymi soplami (b), wierzby to parasole z prostymi prętami i pniem #0F1C22 (d), kwiaty jak grzybki (b), dalszy brzeg to równy szpaler.
- **Postać i ręce: 40.** Ręce FPP (#A0816A) mają kolor pomostu (#A47F60), palce jak grabie, stos lewituje warstwami z przerwami (d); awatar z szyją-ołówkiem i butami-klockami, warianty to podmiana koloru.
- **Bloki, maszyny i taśmy: 50.** Taśmy i lej czytelne (a), ale maszyny to gołe pudła, nie widać procesu ani ruchu.
- **Budynki i znaki: 55.** Sylwetka sklepu i markiza dobre, SKUP RYB ciepło oświetlony (f), ale lada to trzy khaki pudła, wnętrze puste, dym to szare kule (b).
- **HUD i UI: 62.** Spójny motyw licencji, ale hotbar ucięty dolną krawędzią, pieczątka nachodzi na "solo", nagroda w banerze mikroskopijna (f), sklep to arkusz procentów (e).
- **Kompozycja i czytelność kadru: 45.** W (a) farma to ~8% kadru, pierwszy plan to pusta trawa z cieniami drzew spoza ujęcia i uciętą brzozą; w (c) ryba ma ~80 px, karta zasłania jej głowę; (g) to 70% pustki.
- **Spójność stylu i klimat: 57.** Narew, most, trzcina i polskie szyldy budują klimat, ale gładkie ryby kontra szumiący teren, zielony obrysowany "+20,38 zł" obcy papierowemu UI (f).

## 3. AI slop: 55/100
Tells: korony z ikosfer, mozaika losowych odcieni, jeden szablon ryby z podmienionym kolorem, oczy-naklejki, dym z kul, awatary różne tylko kolorem, szpaler identycznych drzew, domyślne światło three.js, opisy sklepu jak zrzut danych. Bronią się: łacińskie nazwy gatunków, Narew z mostem, papierowy UI.

## 4. Największa luka w każdej kategorii
- **Teren:** (a, c) losowe odcienie dużych trójkątów; 3 strefy kolorów z miękkim przejściem, drobniejsza siatka, pofałdowanie.
- **Woda, niebo, światło:** (b, d) kamienne chmury, płaskie światło; ciepłe słońce, chłodny cień, AO, białe chmury.
- **Ryby:** (fish1/2, d) oczy-naklejki, brak pyska; jedno oko w oczodole, pysk i pokrywa skrzelowa u każdego.
- **Roślinność:** (b, d) brzozy-lizaki, wierzby z prętami; kępy na widocznych gałęziach, witki zakrzywione.
- **Postać i ręce:** (d) drewniane ręce-grabie pod lewitującym stosem; skóra, zgięte palce, stykające się ryby.
- **Maszyny:** (a, f) gołe pudła; unikalna sylwetka i ruchoma część na maszynę.
- **Budynki:** (b) lada z pudeł, kule dymu; deski, ryby na lodzie, półprzezroczysty dym.
- **HUD i UI:** (e) ściana tekstu i 6 zablokowanych kart; kolorowe paski rzadkości, 2 najbliższe odblokowania.
- **Kompozycja:** (a) mała farma w morzu trawy; kamera niżej i bliżej, farma na ~40% szerokości.
- **Spójność:** (f) zielony tekst przychodu; pieczątka w stylu UI.

## 5. Jedna największa luka całości
Podłoże wyspy. Zajmuje 50-70% kadrów a, b, c, d, f i jest mozaiką losowo barwionych dużych trójkątów pod płaskim światłem. Zaprojektowany teren (strefy kolorów, drobna siatka, rzeźba, AO) podniesie każdy kadr naraz.

## 6. Lista poprawek (wg wpływu)
1. **Teren:** krawędź trójkąta 0,6-0,8 m, wariacja per face najwyżej ±3% jasności; trawnik #7FA046, ścieżka #A88A5E z przejściem na 2 rzędach wierzchołków, wilgotny brzeg #6B6A48 w pasie 1,5 m; simplex 0,4-1,0 m, skala 15 m; ścieżka 1,8 m wzdłuż splajnu.
2. **Światło:** DirectionalLight #FFE2B0, HemisphereLight #CFE3F5 / #4E5E33, stosunek 3:1; N8AO promień 1,5 m; ACES, exposure 1,05; bloom od progu 0,85.
3. **Chmury:** wierzch #FFFFFF, spód #B8C3D2 (vertex color wg normal.y), większe i rzadsze.
4. **Drzewa:** brzoza 30-50 kęp 0,4-0,7 m na 3 poziomach gałęzi, bez sopli; witki wierzby jako zakrzywione wstęgi z 6 segmentów, długość ±40%, kołysanie w vertex shaderze, pień #5A4A3A; dalszy brzeg 2-3 rzędy, skala 0,7-1,3; kwiaty z płatków.
5. **Ręce i stos:** skóra #E2A98A, palce zgięte 60°; offset Y = grubość ryby, yaw ±12°, roll ±8°.
6. **Ryby:** źrenica 55% promienia, pierścień w kolorze gatunku, oko wpuszczone 2 mm; szczelina pyska, łuk pokrywy; promienie płetw vertex colorem; legendarne i mityczne z tęczowym fresnelem.
7. **Maszyny:** fazowanie 3 cm, nity, ciemniejsze dolne 20%; obracające się rolki, otwarta oświetlona szopa, lej zasypowy; ryby widoczne na taśmach.
8. **Budynek sklepu:** front lady z 6 desek, ryby na lodzie, PointLight #FFB870 w środku; dym 10 sprite'ów, alpha 0,35→0, skala 0,5→2 m; puste wysięgniki usunąć albo powiesić latarnie.
9. **Kadr menu (a):** pitch 30-35°, farma w dolnej tercji, rzeka po przekątnej, zero uciętych obiektów; usunąć kolizję latarni z ławką (b, f).
10. **HUD:** hotbar w całości z marginesem 20 px, 6-9 slotów, STOS na linii bazowej hotbara; pieczątka z dala od "solo"; nagroda w banerze 2x większa.
11. **Sklep (UI):** paski rzadkości w kolorach z kart modeli; 2 zablokowane zamiast 6; ikony 1,5x; kolor rzadkości na karcie ryby (c).
12. **Pogoda:** deszcz 2-3 tys. cienkich smug (alpha 0,3), kręgi na wodzie, mokre powierzchnie ciemniejsze o 15%; latarnia z PointLight i halo we mgle; odbicia w (g) rozmyte, kontrast -40%.
