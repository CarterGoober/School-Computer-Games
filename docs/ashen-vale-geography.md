# Ashen Vale: fixed watershed, edition 2

The playable watershed is 8 km east–west and 8 km north–south (x −4000…4000, z −2000…6000). Its terrain, vegetation candidates, routes and structures have stable world coordinates. No login seed exists. The original trailhead is (0,0), facing north. Returning drivers retain saved positions.

## Geography before geometry

The northern divide has three overlapping mountain masses. Broad saddles between them carry the northern road; the eastern mass is tallest and snowy. A descending river follows the western foot of that range south to a broad lake. The western rain-shadow plateau opens into a canyon; the eastern wet foothills carry dense conifers. Low southern land is open meadow. The central sheltered valley supports golden deciduous woods. Boundaries blend by elevation and distance rather than tile identity.

The main expedition loop runs north from the trailhead, through Copperwood and Fir Reach, across the Lantern Pass, west through snow country to the highlands, then down the canyon and lake shore. A southern loop crosses the meadows and rejoins the east forest. A cross-valley shortcut connects the canyon approach and Fir Reach. Roads are authored splines, approximately 30 km total; off-road terrain remains continuous throughout the basin. Regional structures and rest stops are authored, while deterministic ground cover dresses their surroundings.

## Rendering contract

128 m spatial cells contain a continuous shared-coordinate terrain mesh. Near cells use 8 m samples; distant cells use 32 m samples and skirts. Near foliage and structure batches load independently from terrain. The client retains bounded spatial caches and uploads only changed batches. Terrain color and smooth gradient lighting are evaluated in world coordinates. All vegetation collision candidates use the same fixed coordinate hash on server and client.

The 64 km² figure is geographic bounds, not a claim that every hectare has authored detail. Scenic routes and landmark clusters are the deliberate content spine; wilderness between them uses deterministic dressing. Performance on physical school Chromebooks still requires device testing.
