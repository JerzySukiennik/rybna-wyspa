# Rybna Wyspa: krytyka, runda 3

## 1. Werdykt
**NIE.** Płaskie, wyprane światło, rozmazany teren, puste kadry i ręce z kartonu nie utrzymają żadnego ujęcia w trailerze na Steamie.

## 2. Oceny 1-100
- **Wyspa i teren: 40.** Płaski placek z rozmytymi brązowymi plamami zamiast ścieżek i białą „lukrową” obwódką brzegu (a); z bliska gładki gradient z rozsypanymi trójkątami (c).
- **Woda, niebo i światło: 47.** Daleka woda się broni (a), bliska to miętowa galareta bez odbić (g); światło płaskie, szaroniebieskie; latarnia w mgle nie świeci (g), w deszczu nic nie oświetla (f).
- **Ryby (modele): 64.** 34 gatunki rozróżnialne, ale jeden szablon: identyczne sześciokątne oko, piłokształtna granica grzbiet/brzuch (okoń, leszcz), tekturowe płetwy; w grze płoć prawie biała (c).
- **Roślinność i dekoracje: 44.** Liście z pogniecionych brył w dwóch gryzących się zieleniach (a), kwiaty jak grzybki w rzędach (b), białe trójkąty w trawie jak śmieci (c), kolby pałki wiszą w powietrzu jak muchy (d).
- **Postać i ręce: 32.** Dłonie FPP to płaskie łopaty z palcami-deskami, ryby lewitują nad nimi z przerwami (d); awatar na poziomie Robloxa, bez szyi, oczy z pikseli.
- **Bloki, maszyny i taśmy: 45.** Pompa, taśmy i lej czytelne, ale maszyna to szara rama z czarnym oknem i płaską niebieską płytą (f); brak kodu kolorów i ruchomych części.
- **Budynki i znaki: 50.** Sklep z markizą ma charakter, ale to pudła w jednym brązie z czystym fontem UI na szyldzie (b); ławka z trzech klocków (f).
- **HUD i UI: 60.** Styl licencji spójny, ale HUD zjada ~15% ekranu, 6 pustych slotów, generyczne ikonki liniowe, dolny rząd sklepu wchodzi pod stopkę (e).
- **Kompozycja i czytelność kadru: 36.** Farma to ~2% kadru menu (a), latarnia przecina kadr od góry do dołu (b), czarny cień drogowskazu przykrywa rybę (c), w f i g pół kadru to pustka.
- **Spójność stylu i klimat: 54.** Lokalny smak (Narew, łacińskie nazwy, most, ryba-rakieta GSP) jest autorski, ale rozmazany teren gryzie się z fasetowymi modelami, nastrój wyprany.

## 3. AI slop: 56
Sygnały: generyczne ikonki liniowe (dłoń, słońce, chmura) na „papierowym” UI; trio krojów skondensowany + szeryf + maszynopis na kropkowanym papierze, przerywane ramki wszędzie, okrągła pieczątka; losowy szum faset na każdym modelu; równo rozstawione cętki i paski; drzewa z kul; prosty szpaler drzew na drugim brzegu; neonowy „obwód” na G-Micro. Za autorstwem: konkretne miejsce i polska fauna.

## 4. Największa luka w każdej kategorii
- **Wyspa i teren:** biała obwódka (a); ma być skarpa 30-50 cm z ciemnym mokrym piaskiem.
- **Woda, niebo i światło:** martwa latarnia nad gładką wodą (g); latarnia z poświatą, falki, odbicie pomostu.
- **Ryby (modele):** piłokształtna granica kolorów; płynny gradient grzbiet-brzuch.
- **Roślinność i dekoracje:** kwiaty-grzybki (b); gwiazdki z 5 płatków w losowych kępach.
- **Postać i ręce:** dłonie-łopaty (d); węższe, zgięte palce, ryby leżą na dłoniach.
- **Bloki, maszyny i taśmy:** szara rama bez funkcji (f); sylwetka mówi, co robi (lód, rynna z wodą).
- **Budynki i znaki:** gładkie brązowe pudła (b); deski w 2-3 tonach, gruby okap, malowany szyld.
- **HUD i UI:** ucięty dolny rząd i białe zablokowane miniatury (e); siatka w panelu, miniatury jako ciemne sylwetki.
- **Kompozycja i czytelność kadru:** pusta wyspa w menu (a); kamera bliżej, farma na 30-40% kadru.
- **Spójność stylu i klimat:** gładki teren przy fasetowych obiektach; teren też fasetowy, z twardymi kolorami.

## 5. Jedna największa luka całości
Światło i grading: wszystkie 7 kadrów jest płaskich i wypranych, ryby bieleją, teren wygląda jak rozmazana farba. Autorski rig (ciepłe niskie słońce, chłodny fill, AO, kolorowa mgła, bloom latarni) podniósłby każdy kadr naraz.

## 6. Lista poprawek
1. **Światło:** DirectionalLight #ffe0b0 ~2,8, wysokość 25-35°; HemisphereLight #a9c6e8/#56663a ~0,6; cienie ~40% ciemniejsze, nie czarne (c); N8AO promień ~1 m; AgX, ekspozycja ~1,1; +15% saturacji; bloom tylko na emisji.
2. **Teren:** wysokość 0,3-2 m i 2-3 pagórki; skarpa z paskiem #7d6a4e zamiast białego pierścienia; ścieżki jako ostre pasy błota z poszarpaną krawędzią; 3-4 tony trawy w skali 2-4 m; flatShading.
3. **Menu:** kamera ~40 m, pochylenie ~30°, farma 30-40% kadru; rekwizyty (skrzynki, sieci, łódź, dym z komina).
4. **Ręce FPP:** szerokość ×0,6, palce 2-3 segmenty zgięte o 30-50°, kciuki nad stosem, skóra #dcae86 z cieniem #b07f5f, mankiet; ryby stykają się z dłońmi i sobą, obrót ±8°, płetwy bez przenikania.
5. **Ryby:** niższy envMapIntensity i metalness; gradient grzbiet-brzuch w kolorach wierzchołków zamiast progu na ścianach; płetwy opacity ~0,85 z jaśniejszą krawędzią; oko per gatunek.
6. **HUD:** kartę zwinąć do paska poziomu, podpowiedzi znikające po ~6 s; puste sloty ukryć; ikony stemplowe zamiast liniowych; sklep: siatka w panelu, tło blur(6px) brightness(0.7).
7. **Roślinność:** kwiaty 5-6 płatków na łodydze ~1 cm, kępy Poissona; bez białych trójkątów; źdźbła #3f6a2a do #9bbf5a; łodygi pałki min. 2 px z 10 m; jedna paleta liści; drugi brzeg w nierównych kępach.
8. **Maszyny:** kolor per kategoria (transport żółto-czarny pas, chłodzenie lodowy błękit, maszyny zielona stal), fazy, nity, rolki, animowane strzałki na taśmach.
9. **Budynki:** deski z fugą w 2-3 tonach, okap 8-10 cm, ramy okien; szyldy #e6d9bc z nierównymi literami i przetarciami; ławka z listew.
10. **Pogoda:** smugi deszczu 0,3-0,5 m, opacity ~0,35, gęściej; rozbryzgi i kręgi na wodzie; mokra ziemia (roughness w dół, albedo -15%); ciepła mgła, niska warstwa nad wodą; PointLight #ffb35c ~8 m w latarniach (limit 4-6).
11. **Niebo:** tarcza słońca, poświata horyzontu; chmury z 5-8 spłaszczonych brył, spód #c8c6d6, większe i rzadsze zamiast szarych cygar (d).
12. **Awatar:** szyja, brwi, większe oczy, zwężana wędka z kołowrotkiem, palce.
