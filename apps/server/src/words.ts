// apps/server/src/words.ts

export const SPY_THEME = [
  "AGENT", "SECRET", "CODE", "MISSION", "TARGET", "LASER", "NIGHT", "SHADOW",
  "WIRE", "BOMB", "SAFE", "LOCK", "KEY", "TOKEN", "GLASS", "SOUND", "WAVE",
  "RADIO", "SIGNAL", "WATCH", "CLOCK", "TIME", "GHOST", "MASK", "HOOD"
];

export const PLACES = [
  "HOTEL", "TOKYO", "BERLIN", "LONDON", "PARIS", "ROME", "CHINA", "EGYPT",
  "SPACE", "MOON", "MARS", "EARTH", "BEACH", "PARK", "SCHOOL", "HOSPITAL",
  "BANK", "OPERA", "THEATER", "LAB", "OFFICE", "BASE", "CAMP", "TOWER",
  "BRIDGE", "STADIUM", "PORT", "SHIP", "TRAIN", "PLANE", "CAR", "TRUCK"
];

export const NATURE = [
  "TREE", "FOREST", "RIVER", "MOUNTAIN", "LAKE", "OCEAN", "FISH", "SHARK",
  "WHALE", "OCTOPUS", "CRAB", "LOBSTER", "DOG", "CAT", "LION", "TIGER",
  "BEAR", "EAGLE", "HAWK", "OWL", "BAT", "WOLF", "FOX", "SNAKE", "SPIDER",
  "WEB", "FLY", "BUG", "WORM", "ANT", "BEE", "HONEY", "ROSE", "LILY"
];

export const OBJECTS = [
  "TABLE", "CHAIR", "BED", "LAMP", "LIGHT", "FAN", "DOOR", "WINDOW", "WALL",
  "FLOOR", "ROOF", "PEN", "PENCIL", "PAPER", "BOOK", "NOTE", "CARD", "DICE",
  "GAME", "TOY", "DOLL", "BALL", "RING", "SHOE", "BOOT", "SOCK", "HAT",
  "COAT", "SHIRT", "PANTS", "DRESS", "SUIT", "TIE", "GLOVE", "GLASSES"
];

export const FOOD = [
  "APPLE", "BANANA", "ORANGE", "LEMON", "LIME", "GRAPE", "BERRY", "MELON",
  "WATER", "WINE", "BEER", "COFFEE", "TEA", "MILK", "JUICE", "SODA", "BREAD",
  "CAKE", "PIE", "COOKIE", "CANDY", "SUGAR", "SALT", "PEPPER", "SPICE",
  "MEAT", "FISH", "EGG", "CHEESE", "PIZZA", "BURGER", "FRIES", "SOUP"
];

export const ABSTRACT = [
  "LIFE", "DEATH", "LOVE", "HATE", "WAR", "PEACE", "JOY", "SAD", "LUCK",
  "FATE", "CHANCE", "HOPE", "DREAM", "MIND", "SOUL", "GOD", "KING", "QUEEN",
  "PRINCE", "KNIGHT", "WITCH", "WIZARD", "MAGIC", "SPELL", "CURSE", "POWER",
  "FORCE", "ENERGY", "HEAT", "COLD", "ICE", "FIRE", "WIND", "RAIN", "SNOW"
];

export const TECHNOLOGY = [
  "ROBOT", "COMPUTER", "PHONE", "SCREEN", "KEYBOARD", "MOUSE", "DISK", "CHIP",
  "DATA", "FILE", "WEB", "NET", "LINK", "CLICK", "APP", "CODE", "BUG",
  "VIRUS", "HACK", "TECH", "GEAR", "ENGINE", "MOTOR", "PUMP", "PIPE", "TUBE"
];

export const MISC = [
  "RED", "BLUE", "GREEN", "YELLOW", "BLACK", "WHITE", "GOLD", "SILVER", "BRONZE",
  "IRON", "STEEL", "ROCK", "STONE", "SAND", "DUST", "DIRT", "MUD", "CLAY",
  "ASH", "SMOKE", "FOG", "MIST", "STEAM", "GAS", "OIL", "WAX", "INK", "GLUE",
  "RUN", "JUMP", "WALK", "SWIM", "FLY", "DRIVE", "RIDE", "SAIL", "ROW",
  "DIVE", "HIT", "KICK", "PUNCH", "FIGHT", "PLAY", "WORK", "SLEEP", "WAKE",
  "EAT", "DRINK", "COOK", "BAKE", "WASH", "CLEAN", "CUT", "SLICE", "CHOP"
];

export const CHARACTERS = [
  "DOCTOR", "NURSE", "TEACHER", "STUDENT", "LAWYER", "JUDGE", "POLICE", "THIEF",
  "PIRATE", "NINJA", "SAMURAI", "VIKING", "COWBOY", "ALIEN", "ZOMBIE", "GHOST",
  "VAMPIRE", "MUMMY", "GIANT", "DWARF", "ELF", "ORC", "DRAGON", "UNICORN",
  "PHOENIX", "GRIFFIN", "HYDRA", "TITAN", "GODZILLA", "KONG", "HERO", "VILLAIN"
];

export const INSTRUMENTS_AND_SHAPES = [
  "PIANO", "GUITAR", "DRUM", "FLUTE", "VIOLIN", "CELLO", "BASS", "TRUMPET",
  "HORN", "BELL", "WHISTLE", "VOICE", "SONG", "MUSIC", "BAND", "ROCK", "POP",
  "JAZZ", "BLUES", "SOUL", "FUNK", "RAP", "DANCE", "BALLET", "TANGO", "WALTZ",
  "CIRCLE", "SQUARE", "LINE", "POINT", "DOT", "CROSS", "STAR", "HEART",
  "DIAMOND", "CLUB", "SPADE", "CHECK", "STRIPE", "SPOT", "STAIN", "MARK",
  "TRACE", "TRACK", "TRAIL", "PATH", "WAY", "ROAD", "STREET", "LANE"
];

// Recombine them all to maintain backward compatibility for the "Standard Mix"
export const WORD_LIST = [
  ...SPY_THEME, ...PLACES, ...NATURE, ...OBJECTS, ...FOOD, 
  ...ABSTRACT, ...TECHNOLOGY, ...MISC, ...CHARACTERS, ...INSTRUMENTS_AND_SHAPES
];

// Export mapping for the UI to choose from
export const CATEGORIZED_WORDS: Record<string, string[]> = {
  "Standard Mix": WORD_LIST,
  "Spy & Action": [...SPY_THEME, ...TECHNOLOGY],
  "Places & Nature": [...PLACES, ...NATURE],
  "Objects & Food": [...OBJECTS, ...FOOD],
  "Characters & Myths": [...CHARACTERS, ...ABSTRACT]
};
