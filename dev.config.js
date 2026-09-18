// Local-only developer helper for Pyramid Reckoning.
//
// This file is not part of the published Claude Artifact (which has no
// such file to load), so this feature only exists when running index.html
// from this repo — e.g. via `make dev` or by opening the file directly.
//
// Set enabled to true and reload the page to show a "DEV MODE" bar at the
// top with a room picker (and an optional "force this mini-game" picker
// for chambers 5/10), so you can jump straight to any chamber to test it
// instead of playing through the whole pyramid each time.
window.PYRAMID_DEV_CONFIG = {
  enabled: false
};
