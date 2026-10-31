## 1. Werdykt
**NIE.** Świat to generyczna tropikalna wysepka z nieofazowanych prymitywów w domyślnym świetle, bez śladu Narwi, a maszyny, postać i pogoda są na poziomie placeholderów.

## 2. Oceny 1-100
- **Wyspa i teren: 38.** Z góry poprawny atol, z FPP płaska płyta wielkich trójkątów.
- **Woda, niebo i światło: 32.** Woda bez odblasku i piany, światło bez gradingu, deszcz i noc nie działają.
- **Ryby (modele): 52.** Gatunki rozpoznawalne, ale jeden szablon ciała, papierowe płetwy, oczy-kropki.
- **Roślinność i dekoracje: 36.** Drzewa-lizaki z darmowej paczki, rzadki losowy rozsiew.
- **Postać i ręce: 28.** Manekin z klocków, sztywny chód, dłonie nie trzymają ryb.
- **Bloki, maszyny i taśmy: 24.** Rdzeń tycoona to pudła bez fazy, mechaniki i własnych sylwetek.
- **Budynki i znaki: 40.** Stragan ujdzie, detale to placeholdery, znaki nieczytelne.
- **HUD i UI: 55.** Spójny motyw karty wędkarskiej; za mały tekst, za dużo kart, błędy layoutu.
- **Kompozycja i czytelność kadru: 38.** Ryba ginie w kadrze, FPP to głównie pusta trawa.
- **Spójność stylu i klimat: 30.** Vintage papier, zabawkowe prymitywy i tropikalny low-poly naraz.

## 3. AI slop: 68
Wysepka z tutoriala three.js (limonkowy dysk, turkusowa aureola, morskie iglice) zamiast rzeki; drzewa z ikosfer; pudła bez fazy; jeden szablon ryby na 34 gatunki i jeden „klocek na podstawce” na 8 spawnerów; równy losowy rozsiew; efekty minimum (deszcz to kilkanaście kresek, noc to granatowy filtr, cząsteczki to białe kule); papier z maszynopisem i pieczątką jako modny szablon. Autorstwo widać tylko w treści: łacińskie nazwy, ryby-żarty.

## 4. Największa luka w każdej kategorii
- **Wyspa i teren:** f.png prawy dół: jeden trójkąt terenu na pół kadru z twardym skokiem jasności; potrzebna gęstsza siatka, wdeptane ścieżki i błotnisty brzeg.
- **Woda, niebo i światło:** g.png: „pełnia” bez księżyca, odblasku i lampy, a cyjanowe obwódki iglic świecą jak nieoświetlone; f.png: deszcz pod błękitnym niebem.
- **Ryby:** mityczny Łosoś wygląda jak legendarna Troć i pospolita Ukleja; rzadkość musi być widoczna w modelu, nie w etykiecie.
- **Roślinność i dekoracje:** deco.png: „willow” to brokuł; a.png: pojedyncze patyki trzcin i grzybienie daleko od brzegu zamiast gęstego pasa przy wodzie.
- **Postać i ręce:** d.png: rozcapierzone palce-listewki pod przenikającymi się rybami z białą kulą; avatar.png (chód 3/4): bark wystaje nad tułów, nogi bez kolan.
- **Bloki, maszyny i taśmy:** c.png: taśma to granatowa skrzynia bez nóg, rolek i napędu; e.png: każdy spawner to klocek na szarej podstawce.
- **Budynki i znaki:** b.png: ryba-szyld bez mocowania, napis bez marginesu, kolorowe kostki na ladzie; a.png: lej skupu wygląda jak trampolina.
- **HUD i UI:** e.png: trzeci rząd ucięty bez przewijania, ceny w czterech formatach (50,00/420/2 600/14,0 tys.), opisy zablokowanych kart niewidoczne.
- **Kompozycja i czytelność kadru:** c.png: hover na 40-pikselowej rybie, karta ID przykrywa drugą, brak obrysu obiektu pod kursorem.
- **Spójność stylu i klimat:** a.png: ocean z iglicami zamiast Narwi; przygaszone UI (krem, atrament) gryzie się z granatem, żółcią i limonką świata.

## 5. Jedna największa luka całości
Świat nie ma dyrekcji artystycznej: to domyślna tropikalna wysepka, nie Narew. Otoczyć wyspę rzeką z widocznym drugim brzegiem (olsze, wierzby, trzciny, oliwkowa woda) i przemalować 3D na paletę papierowego UI pod ustawionym światłem. Podnosi pięć kategorii naraz i daje brakujący hak marketingowy.

## 6. Lista poprawek
1. **Narew zamiast oceanu:** usuń iglice i horyzont morski; drugi brzeg jako wał 2-5 m w 150-300 m z olszami, wierzbami i trzcinami; woda #3D5A4E→#6F8C6B, nurt jako przesuwane pasma piany.
2. **Światło:** `ACESFilmicToneMapping`, exposure ~0.9; słońce #FFE3BC, hemisphere #B9D3E6/#5E5638 na ~1/4 jego mocy; trawa #7DC13C→#8FA84E; `Fog` w kolorze horyzontu 150-600 m; AO w kolorach wierzchołków.
3. **Taśma:** na kozłach 0.5 m nad ziemią, rolki co 0.25 m na końcach, guma #2C2E30 zamiast granatu (widać cienie ryb), burty ocynk #A7AFB4 z fazą 0.02 m, napęd na końcu, bez naklejonych prostokątów.
4. **Spawnery:** żeliwna pompa z dźwignią nad korytem, więcierz z malejących torusów, klatka z pływakami, sieć na tyczkach, sonar z talerzem na maszcie, tama jako zastawka; czarne sylwetki w 64 px muszą się różnić.
5. **Ryby:** skala ×1.6 względem taśmy, oczy ×2 z białym pierścieniem, losowa jasność ścian do ±4%, obrys na hover; od Rzadkiej wzwyż unikalny element sylwetki, połysk (metalness ~0.3, PMREM nieba) i poświata rzadkości.
6. **Noc:** księżyc (sprite ~3° z halo) i jego ścieżka na wodzie, światło #A9BCFF, okna sklepu emissive #FFB347, 3× PointLight #FFB06A bez cieni (pomost, sklep, lej), świetliki w trzcinach.
7. **Deszcz:** niebo #7F8B96→#B7BFC6, bez słońca, chmury #9AA2AA, światło ×0.35, mgła 40-220 m, ~4000 instancjonowanych kresek pod kątem 12°, kręgi na wodzie, teren ciemniejszy o 18%.
8. **Ręce i awatar:** palce zgięte 35-50° z kciukiem; stos z offsetem o grubość ryby i obrotem ±8°, bez przenikania; białe kule→krople; kolana, łokcie, pivot w barku, oczy z białkiem, wędka na plecach.
9. **Sklep i znaki:** tablica szersza o 15%, ryba na wsporniku, skrzynki z lodem zamiast kostek, lampa zamiast żółtego kwadratu, drogowskaz 2× większy, lej skupu jako stożek na nogach.
10. **Roślinność:** wierzba głowiasta (pień r 0.4 m, 25-40 witek) i płacząca z kurtyną pasków; trzciny w kępach 80-200 źdźbeł na linii wody; grzybienie tylko w zatoczkach.
11. **Teren:** siatka ≤2 m w strefie gry, różnica jasności sąsiednich ścian ≤6%, równa gęstość źdźbeł (b.png: lewa połowa goła), ścieżki zagłębione 5 cm, brzeg #7A6A4F z mokrym pasem.
12. **HUD:** tekst ≥15 px przy 1080p, karta wędkarska scalona z „Co teraz?”, jeden format cen, pasek przewijania w sklepie, kontrast zablokowanych ≥4.5:1, HUD ukryty pod modalem, puste sloty równe pełnym.
