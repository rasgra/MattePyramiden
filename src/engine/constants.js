// ================= Config constants =================
// Room/mini-game tuning knobs, pulled out on their own so difficulty- or
// slot-related numbers all live in one obvious place.
export var MINIGAME_SLOTS = [4, 9];      // 0-indexed — chambers 5 and 10 are always a mini-game
export var MINIGAME_TYPES = ['nim', 'mastermind', 'guess', 'minesweeper'];
// Each room kind gets its own accent color and small icon (shown on the
// parchment's top edge and next to the room name) purely so chambers read
// as visually distinct at a glance — a plain worksheet still looks like a
// worksheet, but a mini-game or the finale now announce themselves before
// you even read the prompt.
export var MINIGAME_ACCENTS = { nim:'#9c6b2f', mastermind:'#6b3f8a', guess:'#2f8a7a', minesweeper:'#8a3f2f' };
export var MINIGAME_ICONS = { nim:'🧱', mastermind:'🎯', guess:'🔢', minesweeper:'🧟' };
export var COMBO_ACCENT = '#c9a227';
export var COMBO_ICON = '🏺';
export var DRILL_ICON = '📜';
export var TOTAL_ROOMS = 12;
export var SET_SIZE = 10;        // exercises per drill chamber
export var TOPIC_MEMORY = 4;     // a topic can't repeat within this many drill chambers
// A worksheet/trial chamber used to allow retrying a row indefinitely — no
// limit stopped a player from brute-force-guessing their way to a correct
// answer. The 3rd wrong submission in a chamber (across any rows, not just
// distinct ones) now ends the attempt early and sends the player back a
// chamber, same as running out of rows with too few correct.
export var MAX_WRONG_ANSWERS = 3;

// The hourglass no longer times individual chambers — it times the whole
// climb's breathable air, a fixed budget of AIR_SECONDS_PER_ROOM for each
// of the TOTAL_ROOMS chambers, spent however the player likes (quick in one
// chamber banks time for a slower one elsewhere). Only the Overseer's Tally
// (estimation) room keeps a hard per-room deadline of its own, forcing a
// quick, rounded answer rather than a careful exact one — see room-plan's
// sibling, room-lifecycle.js's loadRoom().
export var AIR_SECONDS_PER_ROOM = 240; // 4 minutes
export var ESTIMATION_ROOM_SECONDS = 240; // 4 minutes, fixed regardless of level
// The original's own room-rules screens (Subtraktions-rummet, Överslags-rummet)
// state "för att klättra uppåt krävs alla rätt" — all 10 correct, no partial credit.

export var NIM_PILE_COUNT = 3;
export var MM_CODE_LEN = 3;
export var MM_MAX_GUESSES = 15;
export var GUESS_MAX_TRIES = 10;
export var MS_SIZE = 10;

// Map row sizes from the apex down, summing to TOTAL_ROOMS — never narrower
// than the row above, so the layout itself reads as a pyramid silhouette.
export var MAP_ROWS = [1, 2, 3, 3, 3];
