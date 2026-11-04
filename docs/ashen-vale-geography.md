# Ashen Vale: the connected sixteen kilometre watershed

The playable world is a fixed 16 × 16 km landscape (x −8000…8000, z −5000…11000), four times the former geographic area. `WORLD_ID` remains `ashen-vale-watershed-2`: saves and discovery indices continue to refer to the same shared map. There is no session seed or regenerated lobby map. `height.bounds` exposes the playable limits to the common physics engine.

The former seven roads and 35 discoveries retain their indices. Forest (0,0), beach (−1550,500), and the precise existing ridge spawn (2896.218546481859,5234.362144915763) remain unchanged. The original terrain function is retained in the old rectangle, with limited strips for three new approaches, three optional crawl spurs, and the explicit Crown traverse repair described below. All other original road centre samples retain their elevations; the Crown traverse intentionally changes height while retaining its original XY route. The original five lakes, physical scenery and GLB models remain in use. Waymarks choose a side clear of intersecting roads so a new junction cannot put an existing sign through the driving line.

## Authored geography and roads

Copperwood, Fir Reach, Lantern Pass, the White Crown, Windfold, Redstone, Stillwater and Southwind remain the core. Eight new districts surround them:

- **Blackfir Wildwood:** mixed autumn birch/oak and dark fir around Loch Bracken, a 2.1 km broad lake with an irregular shoreline and a complete shore circuit.
- **Hartsfall Divide:** forested western mountains, timber trade remains, a sawyard and a watch tower above the trees.
- **Bellweather Highlands:** open saddles, the Lake of Bells, roadside stone rings and a former bell house.
- **The Northward Crown:** three collidable alpine summits, a graded traverse, a refuge and survey observatory.
- **Blueglass Massif:** granite mountains and northern summits reaching about 1.7 km, a lower tarn, cliff road, quarry and high survey stations.
- **Ochre Canyon:** a southern cut through rounded ochre mesas, connected rim roads, a mine frame and exposed overlooks.
- **Larksong Prairie:** broad grassy southern hills, a long cross-country road, a grain windmill and sheltered camps.
- **Juniper Coast:** dry eastern conifers, pale stone foothills and the drovers road.

| Appended road index | Route | Length |
| --- | --- | ---: |
| 7 | Loch Bracken shore circuit | 12.84 km |
| 8 | Blackfir and northwestern divide | 14.45 km |
| 9 | Southwind long road | 13.54 km |
| 10 | Eastern drovers road | 12.78 km |
| 11 | Granite saddle traverse | 16.54 km |
| 12 | Blueglass high road | 7.77 km |
| 13 | Northern bell road | 8.14 km |
| 14 | Ochre canyon rim | 6.91 km |

The additions provide **92.964 km of connected road**, bringing the complete authored network to **133.103 km**. Shared junction elevations are solved across the appended road graph. New routes use a balanced cut/fill profile with a 24% maximum centreline gradient; the validated lowland approaches retain their 18% profile and original junction surfaces. A continuous 64 m displacement field forms broad valleys and saddles over 400–1800 m around the new routes, rather than restoring the natural mountain within a narrow road shoulder. Physics and streamed terrain sample the same shaped height function. The field preserves remote mountain relief and fades away from fixed lake catchments. The steepest sampled actual new road heightfield gradient is 31.1934% at the western core approach. Mountains, canyon and road benches are part of the collision heightfield.

The original **Crown traverse (road 3)** had ungraded slopes exceeding 60%, which stalled the physical wagon on the Cloudrest ascent. Its existing 570 XY spline samples now carry a 26% maximum centre grade, with the original valley junction elevations fixed at (650,3600) and (−300,4350). The 16 m wide level bench retains its 40 m final surface blend. Broader shoulder shaping distributes the crest cut over less than 800 m, so the road sits within a natural-looking saddle rather than a deep slot. The centre heights of the other six original roads remain unchanged; 5393 protected core samples beyond the Crown and crawl repair corridors also remain unchanged. The winter survey cabin formerly occupied the road centre. Its visible hut and matching solid collider now sit 16 m to the side, while discovery index 9 and its (1780,4680) coordinates remain fixed.

The optional Copperwood, Redstone and Lantern rock spurs retain their original positive granite shelves. Their underlying floors have narrow level cross sections, blend back into the terrain within 10 m and protect all main-road ground within 6 m, with joins blended from 6–12 m. Adjacent floor segments blend continuously around corners. The three trail XY paths, old journal indices, spawns and all original road centre heights remain fixed.

Thirty-two original discoveries append indices 35–66, for 67 total. Their approaches are within 125 m of a connected route. New clusters include timber lookout towers, standing stones, a charcoal kiln, sawyard, quarry, wind mine, windmill and observatories as well as cabins, ruins, camps and cairns. Solid structures have matching collision descriptors. New lake catchments use dry banks above their fixed water planes; shoreline tests exclude disconnected flooded rings. The complete map has 16 named regions and eight lakes.

## Rendering and streaming

The renderer and world stream share `W.graphicsPresets`; `renderer.setQuality(index)` is idempotent. Original near trees crossfade into matching low polygon 3D models at stable coordinates. A second forest transition thins intermediate woods into representative distant groves. World-space dithering spreads both transitions across a distance band; the former hard 650 m tree cutoff is removed.

| Preset | Pixel ratio cap | Terrain horizon | Forest range | Expensive 128 m cells |
| --- | ---: | --- | ---: | ---: |
| Low | 0.60 | local coarse terrain, 3.8 km target | 0.95 km | 9 |
| Balanced | 0.85 | local coarse terrain, 5.8 km target | 1.8 km | 9 |
| High | 1.25 | whole finite world; 8.2 km target | 2.9 km | 21 |
| PC Ultra | 1.70 | whole finite world; 10.5 km target | 4.2 km | 25 |

Near terrain uses 2 m height samples. Intermediate terrain uses 512 m tiles with 32 m samples, water and two forest bands. Seventy-two 2048 m horizon tiles use 128 m samples and remain beneath nearby replacements in High/PC Ultra. One fixed exterior ground apron closes outward views beyond the playable map edges; it adds no destinations or playable area. The apron contains 2176 triangles and extends beyond the camera clip distance. The near and middle layers remain present above it.

A GPU-ready world-space coverage texture, supplemented by stencil coverage, gives completed fine ground priority over middle ground and the horizon, while preserving normal depth testing within each layer. Water uses corresponding coverage masks. This prevents coarse ridge triangles from protruding through completed road benches and prevents duplicate transparent water layers. A cell becomes visible only when all its geometry groups have reached the GPU. Terrain coverage remains present while finer cells load. Matched-coordinate skirts close mixed-resolution seams.

Construction, normals, colors and packed transfer buffers run in the stream worker. GPU uploads are paced at up to four groups per frame within a four-millisecond CPU budget, with complete cell swaps. The ready-cell coverage texture prevents coarse silhouettes from covering vehicles or finer ground. Nearby intermediate forest is requested before distant tiles; an outer preload margin provides the next terrain/forest ring before it is needed. Planning is bounded: a 500 m grid sweep across the map observed at most 78/140/275/422 tiles for Low/Balanced/High/Ultra, with 9/9/21/25 expensive near cells. A near terrain cell has fewer than 11,000 generated faces including its scenery; a horizon tile has fewer than 1,800.

High/Ultra use restrained atmospheric haze instead of a short fog wall; distant terrain coverage is real geometry. Hardware enables soft sun shadows, up to 2048² maps, and increased ground texture anisotropy. Software rendering defaults to Low and disables shadow maps; selecting another preset remains explicit. These settings do not establish a frame rate guarantee on physical hardware.

## Verification and inspection points

Run `node --test over-the-hill/test-world-expansion.cjs over-the-hill/test-world-streaming.cjs` for bounds, stable spawns/discovery indices, connected added road length, dry approaches, grades, lake banks, terrain/forest coverage, budgets, worker transfers and the bounded horizon apron.

Run `node over-the-hill/test-world-drives.cjs` for actual cannon-es drives through four 600 m sections of roads 7, 8, 11 and 14. First gear uses real 120 Hz tyre/suspension simulation, collidable scenery and input steps of 1/30 s. The observed total was 2415 m, maximum lateral error 0.36 m, maximum physical pitch 0.312 radians, and at least 99.9% of ticks with two or more wheel contacts. This validates representative core-junction, forest, granite and canyon sections; it does not claim every metre of the 133 km network was physically driven.

Run `node --test over-the-hill/test-world-road3.cjs` for the full original Crown traverse, fixed XY coordinates and endpoint elevations, unchanged other legacy road heights, unchanged terrain outside the repaired corridor, and the matching roadside cabin placement. This check uses the same physical wagon and original driving controls as the legacy route suite. The complete road passed 565/570 target points (the same five-point finish margin as the original suite), with 4.02 m maximum lateral error, 0.324 radians maximum pitch and 99.963% of ticks retaining at least two wheel contacts. Its sampled physical centre grade is 26.000%.

Run `node --test over-the-hill/test-world-valleys.cjs over-the-hill/test-world-rock-grading.cjs` for scenic shoulder heights, open skyline directions, bounded underlying crawl grades, unchanged granite shelves and protected road/terrain samples. At Eagles roost, the measured road is 1161 m high with a 1.10 m rise 20 m sideways; at the weather crown it is 1480 m with a 0.52 m sideways rise. These checks prevent kilometre-deep road cuts returning immediately beside a scenic stop.

Useful art/coverage inspection locations: Bracken boathouse (−4970,1400), Hartsfall station (−5130,4200), Eagles roost (6920,5100), Ochre watch (4400,−3725), and the weather crown (−2000,10325). Looking outward from the weather crown checks the exterior horizon closure. Hardware GPU performance and physical Chromebook behavior require device measurements; software-browser inspection establishes appearance and functional loading only.
