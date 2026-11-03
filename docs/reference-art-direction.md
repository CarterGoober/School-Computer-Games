# Reference-driven scenery pass

The three user-supplied screenshots are visual references, not extractable 3D asset bundles. This pass builds original game geometry and a Blender model library to reproduce their visible environmental qualities.

1. **Autumn forest:** fine leaf silhouettes, branching tall trunks, amber and copper crowns, sunlit grass, cool slate outcrops and darker green understory. Replace solid balloon-shaped crowns with layered leaf sprays; keep gaps through the canopy.
2. **Rocky stream:** asymmetrical conifer boughs, exposed stones and gravel banks, fallen branches, pale moving water highlights and warm afternoon light.
3. **Mountain lake:** overlapping evergreen silhouettes, mixed deciduous shore vegetation, blue-green water and cooler distant ridges. Preserve the actual fixed watershed and its drivable connections.

Trees have modeled branches and individual leaf geometry. Grass uses curved modeled blades, with separate fern, shrub, boulder and cliff meshes. Near foliage uses GPU model instancing; distant foliage uses simpler 3D versions of the same models. No screenshot is pasted into the landscape. The existing world, vehicle physics, saves and shared server remain the foundation. New large rocks use shared fixed collision coordinates.
