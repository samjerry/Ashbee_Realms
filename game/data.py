import random

START_LOCATIONS = [
    # wilderness
    "Dark Thicket", "Whispering Grove", "Shaded Glade", "Twilight Marsh",
    "Stone Circle", "Briar Patch", "Frozen Pond", "Rolling Hills",
    "Ashen Clearing", "Wildflower Meadow", "Lonely Oak", "Stormbluff Cliffs",
    "Howling Plateau", "Fallen Log Crossing", "Hunting Grounds", "Serpent’s Brook",
    "Withered Grove", "Starlit Ridge", "Boggy Mire", "Sunken Trail",

# underground
    "Crystal Cavern", "Fungal Hollow", "Abandoned Catacombs", "Echoing Grotto",
    "Dripping Tunnels", "Buried Temple", "Stalactite Chamber", "Chasm Edge",
    "Sunken Crypt", "Lava Fissure", "Forgotten Ossuary", "Serpent’s Den",
    "Blackwater Caves", "Collapsed Shaft", "Winding Burrows", "Silent Tomb",

# settlements / ruins
    "Ruined Chapel", "Crumbling Fortress", "Forsaken Hamlet", "Watch Post",
    "Shattered Monastery", "Sealed Gate", "Ancient Library", "Deserted Camp",
    "Cursed Battlefield", "Half-Sunk Tower", "Overgrown Courtyard", "Abandoned Market",
    "Haunted Manor", "Fallen Barracks", "Broken Aqueduct", "Silent Docks",
    "Derelict Mill", "Lost Amphitheater", "Sunken Village", "Wrecked Caravan"
]
BASE_MAX_HP = 12

EVENTS = [
    # === PATH & NAVIGATION EVENTS ===
    {"text": "You find a fork in the path.", "choices": ["left", "right"]},
    {"text": "A narrow bridge crosses a stream.", "choices": ["cross", "search"]},
    {"text": "You discover a path leading to a new area!", "choices": ["travel", "stay"]},
    {"text": "You reach a dead end with crumbling walls.", "choices": ["climb", "return"]},
    {"text": "A rope dangles down into a dark pit.", "choices": ["descend", "ignore"]},
    {"text": "You find ancient stone steps leading up.", "choices": ["ascend", "examine"]},
    {"text": "The path splits three ways before you.", "choices": ["left", "center", "right"]},
    {"text": "A hidden door is slightly ajar in the wall.", "choices": ["enter", "pass"]},

    # === SOCIAL & ENCOUNTER EVENTS ===
    {"text": "A merchant waves you over.", "choices": ["trade", "move"]},
    {"text": "An injured traveler asks for help.", "choices": ["help", "ignore"]},
    {"text": "An old hermit offers to tell your fortune.", "choices": ["listen", "decline"]},
    {"text": "A group of pilgrims invite you to join their fire.", "choices": ["join", "politely_decline"]},
    {"text": "A suspicious figure watches you from the shadows.", "choices": ["approach", "avoid"]},
    {"text": "A crying child sits alone by the roadside.", "choices": ["comfort", "continue"]},
    {"text": "A bard offers to perform in exchange for coin.", "choices": ["pay", "refuse"]},

    # === INVESTIGATION & DISCOVERY EVENTS ===
    {"text": "You hear rustling bushes.", "choices": ["investigate", "hide"]},
    {"text": "Strange markings are carved into a tree.", "choices": ["study", "ignore"]},
    {"text": "You spot something glinting in the undergrowth.", "choices": ["search", "continue"]},
    {"text": "An ancient statue stands weathered and worn.", "choices": ["examine", "rest"]},
    {"text": "You find a mysterious locked chest.", "choices": ["force", "leave"]},
    {"text": "A strange mushroom circle surrounds a clearing.", "choices": ["enter", "walk_around"]},
    {"text": "You discover fresh tracks leading off the path.", "choices": ["follow", "avoid"]},
    {"text": "An old campfire still smolders with warm embers.", "choices": ["rest", "investigate"]},

    # === DANGEROUS & RISKY EVENTS ===
    {"text": "You hear growling from nearby caves.", "choices": ["investigate", "flee"]},
    {"text": "Dark storm clouds gather ominously overhead.", "choices": ["seek_shelter", "press_on"]},
    {"text": "You notice you're being followed.", "choices": ["confront", "evade"]},
    {"text": "A rickety rope bridge sways over a deep chasm.", "choices": ["cross", "find_another_way"]},
    {"text": "Strange whispers echo from an old well.", "choices": ["peer_down", "move_away"]},
    {"text": "The ground feels unstable beneath your feet.", "choices": ["tread_carefully", "run"]},

    # === MYSTICAL & MAGICAL EVENTS ===
    {"text": "An ancient sphinx blocks your path and poses a riddle!", "choices": ["riddle"]},
    {"text": "A shimmering portal appears before you.", "choices": ["enter", "observe"]},
    {"text": "You feel a strong magical presence nearby.", "choices": ["investigate", "retreat"]},
    {"text": "A crystal formation hums with arcane energy.", "choices": ["touch", "admire"]},
    {"text": "Ghostly figures seem to beckon you forward.", "choices": ["follow", "ignore"]},
    {"text": "Ancient runes glow faintly on a standing stone.", "choices": ["touch", "study"]},
    {"text": "A magical mist swirls around your feet.", "choices": ["breathe_deeply", "hold_breath"]},

    # === ENVIRONMENTAL & ATMOSPHERE EVENTS ===
    {"text": "You come upon a peaceful garden in full bloom.", "choices": ["rest", "continue"]},
    {"text": "A beautiful vista opens up before you.", "choices": ["admire", "press_on"]},
    {"text": "You find a clear spring with pure water.", "choices": ["drink", "fill_waterskin"]},
    {"text": "An owl hoots softly from a nearby tree.", "choices": ["listen", "ignore"]},
    {"text": "Fireflies dance in the evening air around you.", "choices": ["watch", "continue"]},
    {"text": "You hear the distant sound of running water.", "choices": ["follow_sound", "ignore"]},
    {"text": "A gentle breeze carries the scent of flowers.", "choices": ["follow_scent", "continue"]},

    # === STRANGE & UNUSUAL EVENTS ===
    {"text": "You find a single boot sitting in the middle of the path.", "choices": ["examine", "ignore"]},
    {"text": "A perfectly circular hole appears in the ground.", "choices": ["investigate", "avoid"]},
    {"text": "All the birds suddenly stop singing at once.", "choices": ["listen", "hurry_away"]},
    {"text": "Your shadow seems to move independently.", "choices": ["watch", "ignore"]},
    {"text": "You smell something cooking but see no smoke.", "choices": ["search", "continue"]},
    {"text": "A message is scratched into the bark of a tree.", "choices": ["read", "ignore"]},
    {"text": "You find a chess game set up with no players.", "choices": ["play", "observe"]},

    # === MORAL CHOICE EVENTS ===
    {"text": "You find a wounded animal trapped in thorns.", "choices": ["help", "leave"]},
    {"text": "An expensive-looking purse lies abandoned.", "choices": ["take", "leave"]},
    {"text": "You overhear bandits planning an ambush ahead.", "choices": ["warn_travelers", "avoid"]},
    {"text": "A starving beggar asks for food.", "choices": ["share", "refuse"]},
    {"text": "You find evidence of a crime long past.", "choices": ["investigate", "ignore"]},
]

RIDDLERS = [
    "Wise Owl", "Talking Deer", "Mushroom Elder", "Brook Turtle", "Riddle Hare", "Whispering Ferns", "Berry Nymph",
    "Echoing Skull", "Grave Whisperer", "Forgotten Librarian", "Ancestor Spirit", "Candle Ghost", "Dreaming Child Spirit", "Stone Caretaker", "Stone Scribe",
    "Talking Statue", "Runestone Idol", "Oracle Mirror", "Clockwork Owl", "Whistling Jar", "Wandering Book",
    "Starlight Wisp", "Moonbeam Hare", "Starling Spirit", "Crystal Orb", "Constellation Sprite", "Astral Cat", "Timekeeper Sprite", "Comet Spirit",
    "Village Storyteller", "Wandering Bard", "Masked Fool", "Pilgrim Sage", "Old Farmer", "Lantern-Bearer Child", "Blind Poet", "Wandering Cobbler"

]

BOOK_LETTER_ENTRIES = [
    {"name": "Older Than Stone, Hungrier Than Night", "theme": "abyssal", "content": "B̸͝e̵͂n̷͘e̷͑a̴͂t̷͝h̴̓ t̶̍h̷̛e̶͆s̸͠ȇ̵ s̴͝i̴͑g̵͘i̴̚l̴̍s̷̈́ s̶͗t̵͌ì̶r̸̐s̴̋ a̷͌ h̴͊ù̷n̶̎g̴͝e̶͒r̴̽ o̶̚l̷̄d̵͆e̸͂r̴͝ t̵͑h̸̾a̵͛n̷̏ s̶͊t̶̀o̵̓n̷͠e̸͑. T̴͠h̵̽e̶͗ l̶̄e̷͝t̶̒t̶͘e̶̐r̷͒s̶͠ ẁ̸ȓ̵ȉ̴t̷͝h̴̽ė̷ w̶͝h̶̚e̸͆n̶̕ w̶͊a̶̓t̴͌c̷̏h̶͘e̵͛d̷̏, ẗ̵́w̵̛i̶͌s̴͗t̶͠i̵͘n̴̒g̶͘ i̷͊n̵̅t̴̐o̶͋ s̷̕h̶͆a̴̿p̷̈́e̵͘s̶̿ ń̷o̵͝ t̶̓o̵͑n̶̓g̷̈́ù̴e̵̍ s̴̍h̷͝o̶͌u̵̅l̵̑d̵͠ u̸͌t̸͗t̶͘e̴̋ȑ̶. I̷͌n̸͝ t̸͒h̸̽e̶̓i̴͂r̵̐ m̶͝o̸͛v̵͝ë̵́m̴͘e̴͂n̷̕t̶̔ y̷͊ő̵u̸͌r̶̽ n̶͑ä̶́m̷̓e̴̐ i̵̽s̸͆ s̸̈́p̶͐o̵̕k̷̈́e̶͠ń̶—̷̽n̷̐o̵͘ẗ̸́ a̶͛l̶͝ő̷u̶͝d̵̔, b̸͂ǘ̵t̷͆ w̶͐i̶̔t̴̓h̵͒i̶͠n̶͗ t̶͆h̵̕ē̷ h̷̎o̵͑l̶͆l̸͊o̷͝w̴͠ s̵̈́p̷͊a̴͗c̶̏e̸͝s̴͝ o̸͠f̶́ y̷͘ȏ̵u̴͘r̶̿ m̷̓i̵͝n̴͠d̴̍—̶͑b̵̛y̸͌ a̴͊ m̵͠o̶͑u̷̍t̵͋h̷̒ y̷̚o̵͘u̸̇ c̸͝a̴͝n̵̽n̴̿ó̷t̷͝ s̵͊ë̷́ë̵́, y̷̋e̵͊t̶͗ f̷͛e̷͋e̷̓l̵̀ b̴͋r̴͝é̶a̸̔t̴̛h̵̓ì̶n̵͝g̷̕ e̴̋v̶͆e̶͆r̷̋ ć̷l̴̽ơ̴s̷̄è̵r̶͒."}
]

RIDDLES = {
    # === WEAPONS & ARMOR ===
    "From fire I’m forged, in war I am worn, I guard the brave and shame the forlorn.": "armor",
    "Carried by knights, in legends I’m named, Through honor or blood, my edge is famed.": "sword",
    "With no feathers of my own, through the air I glide, I carry no breath, yet I take men’s lives.": "arrow",
    "I carry no edge, I carry no spear, Yet warriors hold me to conquer fear.": "shield",
    "I am drawn without art, I am loosed without word, My silence is deadly, my music unheard.": "bow",
    "I am hidden with ease, yet deadly in fight, A flick of my edge turns day into night.": "dagger",
    "I sit on the crown, I gleam in the sun, I turn aside strikes, till battle is done.": "helmet",
    "I am longer than sword, yet simple to wield, The oldest of weapons brought into the field.": "spear",
    
    # === MAGIC & SPELLS ===
    "Born of the mind, yet shaping the real, I bind and I break, I curse and I heal.": "spell",
    "I am lost when you cast, I return when you rest, Without me, your magic will fail every test.": "mana",
    "I live in the word, the rune, and the sign, With power eternal, both cruel and divine.": "magic",
    "I wear no crown, yet command the sky, With staff in my hand, the stars I defy.": "wizard",
    "Neither spell nor word, yet magic I bear, A treasure of legends beyond all compare.": "artifact",
    "Carved into runes, in sigil or chant, I give common things a power they grant.": "enchantment",
    "I can heal, I can harm, I can grant you the night,I am magic made liquid, in plain mortal sight.": "potion",
    "I am carved in stone, in wood, or in bone, A symbol of power that stands on its own.": "rune",
    
    # === FANTASY CREATURES ===
    "My wings blot the sun, my breath is flame, Kingdoms fall trembling at my name.": "dragon",
    "I raise up my voice, I run with the pack, Together we hunt, together attack.": "wolf",
    "Neither breath nor heartbeat moves me again, Yet onward I walk in the land of men.": "zombie",
    "No shadow I cast, no sun can I bear, By night I hunt with a cold, dark stare.": "vampire",
    "My ears are long, my laughter is mean, Teeth dagger-sharp, my skin filthy and green.": "goblin",
    "Neither mortal nor god, but bound to the earth, In beauty and grace, I measure my worth.": "elf",
    "My march is of bones, my song is of death, No life in my chest, no warmth in my breath.": "skeleton",
    "Neither bone nor blood, yet I walk the night, A shadow of sorrow, unseen in the light.": "ghost",
    "I carry no rider, yet gallop with might, I am my own steed in the heart of the fight.": "centaur",
    "One mirror may save you, one shield may defend, But meet my eyes bare, and your tale finds its end.": "medusa",
    
    # === RPG MECHANICS ===
    "I am the proof of battles won, The record kept of deeds well done.": "experience",
    "I mark your ascent, a measure of might, Each step that you climb brings new strength to fight.": "level",
    "I am tracked but unseen, a red river’s flow, When empty, the grave is the place you will go.": "health",
    "I keep what you find, from common to rare, An unseen companion that’s always there.": "inventory",
    "I am coin and crown, I am greed and pay, Heroes will seek me by night and by day.": "gold",
    
    # === MEDIEVAL LIFE ===
    "Neither peasant nor king, yet honored I stand, The sword of the realm, the guard of the land.": "knight",
    "I shape without sword, I fight without war, Yet blades and bright armor come forth from my door.": "blacksmith",
    "By herb and by crystal, by essence and flame, I fashion strange brews no two are the same.": "alchemist",
    "Neither knight nor mage, yet feared all the same, For silence and cunning are part of my game.": "rogue",
    "My words are of light, my touch can restore, The fallen may rise when I pray once more.": "cleric",
    "I carry a tome, my voice is my blade, By secrets and symbols my power is made.": "mage",
    "I wander with lute, with tale and with rhyme, A keeper of stories through battle and time.": "bard",
    "I walk with the wolf, I hunt with the hawk, The wild is my home, the forest my walk.": "ranger",
    
    # === ELEMENTS & NATURE ===
    "I dance without feet, I roar without breath, I bring both warm life and merciless death.": "fire",
    "I bite without teeth, I cut without blade, I silence the river, I still what once played.": "ice",
    "My voice shakes the earth, my spear splits the night, The storm is my cradle, the sky is my might.": "lightning",
    "My treasures are hidden, my riches concealed, To those who would dig, my secrets revealed.": "earth",
    "I slip through all fingers, yet wear down all stone, Forever in motion, yet never my own.": "water",
    "I sing through the mountain, I shriek through the plain, I come without warning, and then I vanish again.": "wind",
    "No wall can contain me, no chain can confine, Yet banished I am by the sun’s steady shine.": "darkness",
    "I write every color, I paint every hue, Through prism or raindrop I scatter anew.": "light",
    
    # === CLASSIC RIDDLES ADAPTED ===
    "I have cities but no houses, forests but no trees, water but no fish. What am I?": "map",
    "I can be cracked, I can be made, I can be told, I can be played.": "joke",
    "I am empty in form, yet feared in the ground, For those who step wrongly will soon tumble down.": "hole",
    "I burn without hatred, I fade without fight, I banish the shadows and carry the light.": "candle",
    "I grow as I’m spoken, I shrink when I’m true, A shadow of stories that twists as it flew.": "rumor",
    
    # === DUNGEON & ADVENTURE ===
    "I am home to the monster, the trap, and the hoard, A grave for the nameless, a trial for the sword.": "dungeon",
    "I am crown of the hill, I am pride of the land, With towers like lances, with walls that withstand.": "castle",
    "I am blessing and curse, both fortune and chain, The heart of adventure, the root of all bane.": "treasure",
    "Though small in my shape, I hold what is great, A chest, or a secret, or kingdom’s own gate.": "lock",
    "I begin with a call, I end with a name, I carry no coin, yet bring fortune and fame.": "quest",
    "I am born of the deed, yet greater I grow, A tale of the past that all mortals know.": "legend"
}

CLASSES = {
    "warrior": {
        "hp_bonus": 4,
        "passive": "Toughness (+1 max HP per level)",
        "skill": {"name": "Power Strike", "cd": 3},
        "description": "Tanky melee fighter with high survivability",
        "playstyle": "High HP, strong attacks, good for beginners"
    },
    "mage": {
        "hp_bonus": 0,
        "passive": "Arcane Mind (+1 spell power per level, boosts all magic effects)",
        "skill": {"name": "Fire Bolt", "cd": 2},
        "description": "Magical damage dealer with armor-penetrating spells and spell power scaling",
        "playstyle": "Low HP, spell power scaling, magic effects boosted, Fire Bolt ignores half armor"
    },
    "rogue": {
        "hp_bonus": 2,
        "passive": "Evasion (20% dodge chance)",
        "skill": {"name": "Backstab", "cd": 3},
        "description": "Agile fighter with critical hits and escape abilities",
        "playstyle": "Medium HP, high crit, +15% flee success"
    },
}

COMMON_DROPS = ["Herb", "Coin", "Feather", "Bandage"]
BOSS_DROPS   = ["Greater Potion", "Enchanted Dagger", "Warmage Ring", "Sturdy Buckler"]

MOB_TABLE = [
    # === COMMON (Easy) ===
    # total=6
    {"name": "Cave Bat",   "hp": 5,  "atk": 1, "armor": 0, "traits": ["evasive"], "rarity": "common",
     "creature_type": "beast", "affinity": "darkness", "vulnerabilities": ["light"]},
    {"name": "Giant Rat",  "hp": 5,  "atk": 1, "armor": 0, "traits": ["disease"], "rarity": "common",
     "creature_type": "beast", "affinity": "neutral",  "vulnerabilities": ["fire"]},
    # total=9
    {"name": "Forest Wolf","hp": 8,  "atk": 1, "armor": 0, "traits": [], "rarity": "common",
     "creature_type": "beast", "affinity": "nature",   "vulnerabilities": ["fire"]},
    # total=10
    {"name": "Goblin Scout","hp": 8, "atk": 2, "armor": 0, "traits": ["bleed"], "rarity": "common",
     "creature_type": "humanoid", "affinity": "neutral","vulnerabilities": []},
    {"name": "Mud Crab",   "hp": 7,  "atk": 1, "armor": 2, "traits": ["shell"], "rarity": "common",
     "creature_type": "beast", "affinity": "earth",    "vulnerabilities": ["lightning"]},
    # total=12
    {"name": "Skeleton",   "hp": 9,  "atk": 2, "armor": 1, "traits": [], "rarity": "common",
     "creature_type": "undead", "affinity": "darkness","vulnerabilities": ["light", "divine"]},
    {"name": "Wild Boar",  "hp": 9,  "atk": 2, "armor": 1, "traits": ["charge"], "rarity": "common",
     "creature_type": "beast", "affinity": "nature",   "vulnerabilities": ["ice"]},
    # total=13
    {"name": "Moss Slime", "hp": 12, "atk": 1, "armor": 0, "traits": ["regen"], "rarity": "common",
     "creature_type": "ooze", "affinity": "nature",    "vulnerabilities": ["fire","lightning"]},

    # === UNCOMMON (Bridge tier) ===
    # total=11
    {"name": "Lightning Wisp", "hp": 7, "atk": 4, "armor": 0, "traits": ["shock","phase"], "rarity": "uncommon",
     "creature_type": "elemental", "affinity": "lightning", "vulnerabilities": ["earth"]},
    # total=13
    {"name": "Ice Sprite",  "hp": 9,  "atk": 3, "armor": 1, "traits": ["freeze","ice_shield"], "rarity": "uncommon",
     "creature_type": "elemental", "affinity": "ice",  "vulnerabilities": ["fire"]},
    # total=16
    {"name": "Giant Spider","hp": 13, "atk": 3, "armor": 0, "traits": ["poison","web"], "rarity": "uncommon",
     "creature_type": "beast", "affinity": "nature",   "vulnerabilities": ["fire","ice"]},
    # total=17
    {"name": "Dark Elf",    "hp": 12, "atk": 3, "armor": 2, "traits": ["magic_arrow","stealth"], "rarity": "uncommon",
     "creature_type": "humanoid", "affinity": "darkness", "vulnerabilities": ["light"]},
    # total=19
    {"name": "Zombie",      "hp": 16, "atk": 3, "armor": 0, "traits": ["regen","disease"], "rarity": "uncommon",
     "creature_type": "undead", "affinity": "darkness","vulnerabilities": ["light","fire"]},

    # === RARE (Elite) ===
    # total=15
    {"name": "Fire Imp",       "hp": 11, "atk": 4, "armor": 0, "traits": ["burn","flame_aura"], "rarity": "rare",
     "creature_type": "elemental", "affinity": "fire", "vulnerabilities": ["ice","water"]},
    # total=17
    {"name": "Ghost",          "hp": 13, "atk": 4, "armor": 0, "traits": ["phase_shift","fear"], "rarity": "rare",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["light","divine"]},
    # total=21
    {"name": "Forest Guardian","hp": 16, "atk": 3, "armor": 2, "traits": ["regen","nature_blessed"], "rarity": "rare",
     "creature_type": "fey", "affinity": "nature", "vulnerabilities": ["fire","void"]},
    # total=23
    {"name": "Orc Berserker",  "hp": 17, "atk": 5, "armor": 1, "traits": ["berserker","rage"], "rarity": "rare",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},
    # total=26
    {"name": "Dire Bear",      "hp": 20, "atk": 4, "armor": 2, "traits": ["intimidate","fury"], "rarity": "rare",
     "creature_type": "beast", "affinity": "nature", "vulnerabilities": ["lightning"]},

    # === EPIC (Supernatural champions) ===
    # total=18
    {"name": "Banshee",         "hp": 13, "atk": 5, "armor": 0, "traits": ["wail","phase_shift","fear"], "rarity": "epic",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["light","divine"]},
    # total=21
    {"name": "Void Cultist",    "hp": 15, "atk": 5, "armor": 1, "traits": ["void_magic","sacrifice"], "rarity": "epic",
     "creature_type": "humanoid", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=22
    {"name": "Shadow Wraith",   "hp": 16, "atk": 5, "armor": 1, "traits": ["stealth","life_drain"], "rarity": "epic",
     "creature_type": "undead", "affinity": "void", "vulnerabilities": ["light","divine"]},
    {"name": "Storm Elemental", "hp": 15, "atk": 7, "armor": 0, "traits": ["lightning_strike","windstorm"], "rarity": "epic",
     "creature_type": "elemental", "affinity": "lightning", "vulnerabilities": ["earth"]},
    # total=23
    {"name": "Fire Elemental",  "hp": 17, "atk": 6, "armor": 0, "traits": ["burn_aura","immolate"], "rarity": "epic",
     "creature_type": "elemental", "affinity": "fire", "vulnerabilities": ["ice","water"]},
    # total=27
    {"name": "Lesser Demon",    "hp": 19, "atk": 6, "armor": 2, "traits": ["intimidate","dark_magic"], "rarity": "epic",
     "creature_type": "demon", "affinity": "darkness", "vulnerabilities": ["divine","light"]},
    # total=29 
    {"name": "Stone Sentinel",  "hp": 22, "atk": 3, "armor": 4, "traits": ["stone_skin","magic_resist"], "rarity": "epic",
     "creature_type": "construct", "affinity": "earth", "vulnerabilities": ["void","lightning"]},
    {"name": "Chimera",         "hp": 22, "atk": 5, "armor": 2, "traits": ["fire_breath","poison_tail","intimidate"], "rarity": "epic",
     "creature_type": "beast", "affinity": "fire", "vulnerabilities": ["ice"]},
    # total=33
    {"name": "Frost Giant",     "hp": 24, "atk": 6, "armor": 3, "traits": ["ice_armor","freeze"], "rarity": "epic",
     "creature_type": "giant", "affinity": "ice", "vulnerabilities": ["fire"]},
    # total=35
    {"name": "Iron Golem",      "hp": 27, "atk": 4, "armor": 4, "traits": ["magic_resist","slam"], "rarity": "epic",
     "creature_type": "construct", "affinity": "neutral", "vulnerabilities": ["lightning"]},

    # === LEGENDARY (Ancient powers) ===
    # total=31
    {"name": "Void Spawn",    "hp": 24, "atk": 6, "armor": 1, "traits": ["void_magic","reality_tear","phase_shift"], "rarity": "legendary",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=35
    {"name": "Lich",          "hp": 26, "atk": 7, "armor": 2, "traits": ["necromancy","death_magic","phase_shift"], "rarity": "legendary",
     "creature_type": "undead", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=39
    {"name": "Fallen Angel",  "hp": 30, "atk": 6, "armor": 3, "traits": ["dark_wings","curse","intimidate"], "rarity": "legendary",
     "creature_type": "celestial", "affinity": "darkness", "vulnerabilities": ["divine","light"]},
    # total=48
    {"name": "Ancient Dragon","hp": 36, "atk": 8, "armor": 4, "traits": ["dragon_breath","intimidate","magic_resist"], "rarity": "legendary",
     "creature_type": "dragon", "affinity": "fire", "vulnerabilities": ["ice"]},

    # === MYTHIC (World-tier threats) ===
    # total=54
    {"name": "Primordial Elemental", "hp": 42, "atk": 9, "armor": 3, "traits": ["elemental_mastery","storm_call","earthquake"], "rarity": "mythic",
     "creature_type": "elemental", "affinity": "lightning", "vulnerabilities": ["void"]},
    # total=61
    {"name": "Shadow Dragon",        "hp": 47, "atk": 10, "armor": 4, "traits": ["void_breath","reality_rend","intimidate"], "rarity": "mythic",
     "creature_type": "dragon", "affinity": "void", "vulnerabilities": ["divine","light"]},

    # === NEW CREATURE ADDITIONS ===
    
    # COMMON MOBS
    {"name": "Bandit", "hp": 8, "atk": 2, "armor": 1, "traits": ["ambush", "coward"], "rarity": "common",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},
    {"name": "Cave Slime", "hp": 10, "atk": 1, "armor": 0, "traits": ["regen"], "rarity": "common",
     "creature_type": "ooze", "affinity": "earth", "vulnerabilities": ["fire", "lightning"]},
    {"name": "Gnoll Scout", "hp": 9, "atk": 2, "armor": 0, "traits": ["pack_hunter"], "rarity": "common",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},
    {"name": "Kobold", "hp": 6, "atk": 2, "armor": 0, "traits": ["coward"], "rarity": "common",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},
    {"name": "Plague Rat", "hp": 4, "atk": 1, "armor": 0, "traits": ["poison"], "rarity": "common",
     "creature_type": "beast", "affinity": "darkness", "vulnerabilities": ["fire", "light"]},

    # UNCOMMON MOBS  
    {"name": "Flame Sprite", "hp": 12, "atk": 3, "armor": 0, "traits": ["fire_aura", "evasive"], "rarity": "uncommon",
     "creature_type": "elemental", "affinity": "fire", "vulnerabilities": ["ice", "water"]},
    {"name": "Forest Dryad", "hp": 14, "atk": 2, "armor": 1, "traits": ["regen"], "rarity": "uncommon",
     "creature_type": "fey", "affinity": "nature", "vulnerabilities": ["fire", "void"]},
    {"name": "Ghoul", "hp": 13, "atk": 3, "armor": 0, "traits": ["life_drain"], "rarity": "uncommon",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},
    {"name": "Sand Viper", "hp": 11, "atk": 3, "armor": 0, "traits": ["poison"], "rarity": "uncommon",
     "creature_type": "beast", "affinity": "earth", "vulnerabilities": ["ice", "water"]},
    {"name": "Shade", "hp": 10, "atk": 2, "armor": 0, "traits": ["stealth"], "rarity": "uncommon",
     "creature_type": "undead", "affinity": "void", "vulnerabilities": ["light", "divine"]},

    # RARE MOBS
    {"name": "Abyss Hound", "hp": 20, "atk": 5, "armor": 2, "traits": ["intimidate", "predator"], "rarity": "rare",
     "creature_type": "fiend", "affinity": "void", "vulnerabilities": ["divine", "light"]},
    {"name": "Crystal Golem", "hp": 25, "atk": 3, "armor": 5, "traits": ["magic_resist", "reflect"], "rarity": "rare",
     "creature_type": "construct", "affinity": "neutral", "vulnerabilities": ["lightning"]},
    {"name": "Ice Drake", "hp": 22, "atk": 4, "armor": 3, "traits": ["frost_aura", "intimidate"], "rarity": "rare",
     "creature_type": "dragon", "affinity": "ice", "vulnerabilities": ["fire"]},
    {"name": "Thunder Roc", "hp": 18, "atk": 6, "armor": 1, "traits": ["shock", "evasive"], "rarity": "rare",
     "creature_type": "beast", "affinity": "lightning", "vulnerabilities": ["earth"]},

    # EPIC MOBS
    {"name": "Abyssal Knight", "hp": 35, "atk": 7, "armor": 6, "traits": ["intimidate", "armor_pierce", "soul_rend"], "rarity": "epic",
     "creature_type": "fiend", "affinity": "void", "vulnerabilities": ["divine", "light"]},
    {"name": "Fire Djinn", "hp": 30, "atk": 8, "armor": 2, "traits": ["fire_aura", "spell_caster"], "rarity": "epic",
     "creature_type": "elemental", "affinity": "fire", "vulnerabilities": ["ice", "water"]},
    {"name": "Hell Hound", "hp": 26, "atk": 9, "armor": 3, "traits": ["intimidate", "burn"], "rarity": "epic",
     "creature_type": "fiend", "affinity": "fire", "vulnerabilities": ["ice", "divine"]},
    {"name": "Night Stalker", "hp": 24, "atk": 7, "armor": 1, "traits": ["stealth", "life_drain"], "rarity": "epic",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},
    {"name": "Tempest Roc", "hp": 28, "atk": 8, "armor": 2, "traits": ["storm_call", "intimidate"], "rarity": "epic",
     "creature_type": "beast", "affinity": "lightning", "vulnerabilities": ["earth"]},
    {"name": "Dracolich Spawn", "hp": 32, "atk": 6, "armor": 4, "traits": ["regen", "intimidate"], "rarity": "epic",
     "creature_type": "undead", "affinity": "void", "vulnerabilities": ["divine", "light"]},

    # LEGENDARY MOBS
    {"name": "Angel of Wrath", "hp": 48, "atk": 12, "armor": 6, "traits": ["divine_power", "intimidate", "immunity"], "rarity": "legendary",
     "creature_type": "celestial", "affinity": "divine", "vulnerabilities": ["void", "darkness"]},
    {"name": "Starborn Horror", "hp": 52, "atk": 10, "armor": 4, "traits": ["cosmic_power", "phase_shift"], "rarity": "legendary",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine"]},
    {"name": "Draconic Warlock", "hp": 45, "atk": 11, "armor": 5, "traits": ["magic_damage", "intimidate"], "rarity": "legendary",
     "creature_type": "dragon", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},

    # MYTHIC MOBS
    {"name": "Eternal Phoenix", "hp": 85, "atk": 15, "armor": 8, "traits": ["immortality", "fire_aura", "regen"], "rarity": "mythic",
     "creature_type": "celestial", "affinity": "fire", "vulnerabilities": ["void"]},
    {"name": "Outer Titan", "hp": 120, "atk": 18, "armor": 12, "traits": ["cosmic_power", "intimidate"], "rarity": "mythic",
     "creature_type": "titan", "affinity": "void", "vulnerabilities": ["divine"]},
    {"name": "Void Leviathan", "hp": 100, "atk": 20, "armor": 6, "traits": ["void_damage", "intimidate"], "rarity": "mythic",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine", "light"]},
]


BOSS_TABLE = [
    # === UNCOMMON BOSSES ===
    # total=24
    {"name": "Bone Shaman", "hp": 20, "atk": 4, "armor": 0, "traits": ["necromancy"], "rarity": "uncommon",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["divine","light"]},
    # total=27
    {"name": "Wolf Matriarch", "hp": 22, "atk": 4, "armor": 1, "traits": ["pack_leader"], "rarity": "uncommon",
     "creature_type": "beast", "affinity": "nature", "vulnerabilities": ["fire"]},
    # total=30
    {"name": "Goblin Captain", "hp": 24, "atk": 5, "armor": 1, "traits": ["command","rage"], "rarity": "uncommon",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},

    # === RARE BOSSES ===
    # total=32
    {"name": "Cinder Wraith", "hp": 26, "atk": 6, "armor": 0, "traits": ["fire_aura","phase_shift"], "rarity": "rare",
     "creature_type": "undead", "affinity": "fire", "vulnerabilities": ["ice","divine"]},
    # total=34
    {"name": "Timberwolf Alpha", "hp": 28, "atk": 5, "armor": 1, "traits": ["pack_leader","howl"], "rarity": "rare",
     "creature_type": "beast", "affinity": "nature", "vulnerabilities": ["fire"]},
    # total=39
    {"name": "Bog Serpent", "hp": 32, "atk": 5, "armor": 2, "traits": ["poison_breath","constrict"], "rarity": "rare",
     "creature_type": "dragon", "affinity": "darkness", "vulnerabilities": ["light"]},
    # total=43
    {"name": "Bridge Troll", "hp": 34, "atk": 6, "armor": 3, "traits": ["regeneration","slam"], "rarity": "rare",
     "creature_type": "giant", "affinity": "earth", "vulnerabilities": ["lightning"]},
    # total=47
    {"name": "Stone Guardian", "hp": 38, "atk": 4, "armor": 5, "traits": ["stone_skin","earthquake"], "rarity": "rare",
     "creature_type": "construct", "affinity": "earth", "vulnerabilities": ["void","lightning"]},

    # === EPIC BOSSES ===
    # total=41
    {"name": "Void Stalker", "hp": 32, "atk": 8, "armor": 1, "traits": ["void_step","reality_tear","stealth"], "rarity": "epic",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=45
    {"name": "Frost Lich", "hp": 36, "atk": 7, "armor": 2, "traits": ["ice_magic","necromancy","freeze_aura"], "rarity": "epic",
     "creature_type": "undead", "affinity": "ice", "vulnerabilities": ["fire","divine"]},
    {"name": "Storm King", "hp": 34, "atk": 9, "armor": 2, "traits": ["lightning_mastery","hurricane","flight"], "rarity": "epic",
     "creature_type": "elemental", "affinity": "lightning", "vulnerabilities": ["earth"]},
    # total=46
    {"name": "Inferno Demon", "hp": 36, "atk": 8, "armor": 2, "traits": ["hell_fire","intimidate","burn_aura"], "rarity": "epic",
     "creature_type": "demon", "affinity": "fire", "vulnerabilities": ["ice","divine"]},
    # total=48
    {"name": "Shadow Lord", "hp": 38, "atk": 8, "armor": 2, "traits": ["void_magic","shadow_army","intimidate"], "rarity": "epic",
     "creature_type": "demon", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=53
    {"name": "Death Knight", "hp": 42, "atk": 7, "armor": 4, "traits": ["death_magic","intimidate","undead_army"], "rarity": "epic",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["divine","light"]},

    # === LEGENDARY BOSSES ===
    # total=55
    {"name": "Ancient Wyrm", "hp": 44, "atk": 7, "armor": 4, "traits": ["dragon_breath","ancient_magic","treasure_hoard"], "rarity": "legendary",
     "creature_type": "dragon", "affinity": "fire", "vulnerabilities": ["ice"]},
    # total=57
    {"name": "Elder Lich", "hp": 46, "atk": 9, "armor": 2, "traits": ["time_magic","soul_prison","undead_mastery"], "rarity": "legendary",
     "creature_type": "undead", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=61
    {"name": "Phoenix Lord", "hp": 49, "atk": 10, "armor": 2, "traits": ["rebirth","fire_mastery","immolate"], "rarity": "legendary",
     "creature_type": "celestial", "affinity": "fire", "vulnerabilities": ["ice","void"]},
    # total=63
    {"name": "Light Seraph", "hp": 52, "atk": 8, "armor": 3, "traits": ["divine_power","light_mastery","purify"], "rarity": "legendary",
     "creature_type": "celestial", "affinity": "light", "vulnerabilities": ["darkness","void"]},
    # total=66
    {"name": "Leviathan", "hp": 54, "atk": 9, "armor": 3, "traits": ["tidal_wave","water_mastery","colossal"], "rarity": "legendary",
     "creature_type": "dragon", "affinity": "water", "vulnerabilities": ["lightning"]},
    # total=69
    {"name": "Archdemon", "hp": 56, "atk": 10, "armor": 3, "traits": ["hell_portal","demon_army","curse_mastery"], "rarity": "legendary",
     "creature_type": "demon", "affinity": "darkness", "vulnerabilities": ["divine","light"]},
    # total=73
    {"name": "Void Emperor", "hp": 60, "atk": 9, "armor": 4, "traits": ["reality_control","void_mastery","dimension_rift"], "rarity": "legendary",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine","light"]},

    # === MYTHIC BOSSES ===
    # total=95
    {"name": "Cosmic Horror", "hp": 80, "atk": 11, "armor": 4, "traits": ["madness","reality_distortion","infinite_eyes"], "rarity": "mythic",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine","light"]},
    # total=103
    {"name": "World Serpent", "hp": 84, "atk": 13, "armor": 6, "traits": ["world_ending","poison_mastery","colossal","regeneration"], "rarity": "mythic",
     "creature_type": "dragon", "affinity": "earth", "vulnerabilities": ["divine","void"]},
    # total=122
    {"name": "Fallen God", "hp": 105, "atk": 9, "armor": 8, "traits": ["divine_corruption","reality_control","immortality"], "rarity": "mythic",
     "creature_type": "celestial", "affinity": "darkness", "vulnerabilities": ["divine","light"]},
    # total=149
    {"name": "Primordial Dragon", "hp": 125, "atk": 16, "armor": 8, "traits": ["creation_breath","time_mastery","ancient_power"], "rarity": "mythic",
     "creature_type": "dragon", "affinity": "fire", "vulnerabilities": ["void"]},

    # === NEW BOSS ADDITIONS ===
    
    # COMMON BOSSES
    {"name": "Giant Toad", "hp": 22, "atk": 4, "armor": 2, "traits": ["poison", "intimidate"], "rarity": "common",
     "creature_type": "beast", "affinity": "water", "vulnerabilities": ["lightning", "fire"]},
    {"name": "Goblin Brute", "hp": 25, "atk": 5, "armor": 3, "traits": ["intimidate"], "rarity": "common",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},

    # UNCOMMON BOSSES
    {"name": "Gravekeeper", "hp": 32, "atk": 5, "armor": 3, "traits": ["regen", "intimidate"], "rarity": "uncommon",
     "creature_type": "undead", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},
    {"name": "Kobold Warchief", "hp": 28, "atk": 6, "armor": 2, "traits": ["intimidate", "pack_hunter"], "rarity": "uncommon",
     "creature_type": "humanoid", "affinity": "neutral", "vulnerabilities": []},

    # RARE BOSSES  
    {"name": "Blood Fiend", "hp": 45, "atk": 8, "armor": 4, "traits": ["life_drain", "intimidate"], "rarity": "rare",
     "creature_type": "fiend", "affinity": "darkness", "vulnerabilities": ["divine", "light"]},
    {"name": "Hagmother", "hp": 40, "atk": 7, "armor": 3, "traits": ["intimidate", "poison"], "rarity": "rare",
     "creature_type": "humanoid", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},

    # EPIC BOSSES
    {"name": "Kraken Priest", "hp": 65, "atk": 9, "armor": 5, "traits": ["intimidate", "life_drain"], "rarity": "epic",
     "creature_type": "aberration", "affinity": "water", "vulnerabilities": ["lightning", "fire"]},
    {"name": "Tempest Sovereign", "hp": 58, "atk": 11, "armor": 3, "traits": ["storm_call", "intimidate"], "rarity": "epic",
     "creature_type": "elemental", "affinity": "lightning", "vulnerabilities": ["earth"]},

    # LEGENDARY BOSSES
    {"name": "Black Sun Dragon", "hp": 85, "atk": 14, "armor": 8, "traits": ["intimidate", "ancient_wisdom"], "rarity": "legendary",
     "creature_type": "dragon", "affinity": "void", "vulnerabilities": ["divine", "light"]},
    {"name": "Nightmare Lord", "hp": 75, "atk": 12, "armor": 6, "traits": ["intimidate", "phase_shift"], "rarity": "legendary",
     "creature_type": "fiend", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},
    {"name": "World Hydra", "hp": 90, "atk": 10, "armor": 7, "traits": ["regen", "intimidate"], "rarity": "legendary",
     "creature_type": "dragon", "affinity": "nature", "vulnerabilities": ["fire", "void"]},

    # MYTHIC BOSSES
    {"name": "Astral Colossus", "hp": 150, "atk": 20, "armor": 15, "traits": ["cosmic_power", "intimidate"], "rarity": "mythic",
     "creature_type": "titan", "affinity": "void", "vulnerabilities": ["divine"]},
    {"name": "Eclipsed Seraph", "hp": 120, "atk": 18, "armor": 10, "traits": ["divine_power", "cosmic_power"], "rarity": "mythic",
     "creature_type": "celestial", "affinity": "darkness", "vulnerabilities": ["light", "divine"]},
    {"name": "The King in Yellow", "hp": 100, "atk": 22, "armor": 8, "traits": ["intimidate", "reality_control"], "rarity": "mythic",
     "creature_type": "aberration", "affinity": "void", "vulnerabilities": ["divine", "light"]},
]

# Encounter rates by rarity
MOB_RARITY_WEIGHTS = {
    "common": 50,      # 50% chance
    "uncommon": 25,    # 25% chance
    "rare": 18,        # 18% chance  
    "epic": 5,         # 5% chance
    "legendary": 1.5,  # 1.5% chance
    "mythic": 0.5      # 0.5% chance
}

BOSS_RARITY_WEIGHTS = {
    "common": 25,      # 25% chance
    "uncommon": 35,    # 35% chance
    "rare": 25,        # 25% chance
    "epic": 12,        # 12% chance
    "legendary": 2.5,  # 2.5% chance
    "mythic": 0.5      # 0.5% chance
}

# === CREATURE LOCATION MAPPINGS ===

CREATURE_LOCATIONS = {
    # === WILDERNESS CREATURES ===
    "Forest Wolf": ["Whispering Grove", "Shaded Glade", "Twilight Marsh", "Wildflower Meadow", "Lonely Oak"],
    "Cave Bat": ["Dark Thicket", "Briar Patch", "Ashen Clearing", "Withered Grove"],
    "Giant Spider": ["Dark Thicket", "Briar Patch", "Withered Grove", "Boggy Mire"],
    "Dire Bear": ["Whispering Grove", "Rolling Hills", "Hunting Grounds", "Starlit Ridge"],
    "Wild Boar": ["Rolling Hills", "Hunting Grounds", "Wildflower Meadow", "Sunken Trail"],
    "Giant Rat": ["Boggy Mire", "Sunken Trail", "Serpent's Brook", "Twilight Marsh"],
    "Mud Crab": ["Twilight Marsh", "Serpent's Brook", "Boggy Mire", "Frozen Pond"],
    
    # === UNDERGROUND CREATURES ===
    "Skeleton": ["Abandoned Catacombs", "Sunken Crypt", "Forgotten Ossuary", "Buried Temple"],
    "Zombie": ["Abandoned Catacombs", "Sunken Crypt", "Forgotten Ossuary"],
    "Ghost": ["Sunken Crypt", "Forgotten Ossuary", "Buried Temple", "Echoing Grotto"],
    "Shadow Wraith": ["Abandoned Catacombs", "Sunken Crypt", "Chasm Edge"],
    "Fire Imp": ["Lava Fissure", "Crystal Cavern", "Dripping Tunnels"],
    "Ice Sprite": ["Frozen Pond", "Crystal Cavern", "Stalactite Chamber"],
    "Lightning Wisp": ["Crystal Cavern", "Echoing Grotto", "Stalactite Chamber"],
    "Earth Golem": ["Crystal Cavern", "Stalactite Chamber", "Chasm Edge"],
    
    # === SETTLEMENT CREATURES ===
    "Goblin Scout": ["Ruined Chapel", "Forsaken Hamlet", "Deserted Camp", "Wrecked Caravan"],
    "Dark Elf": ["Ancient Library", "Shattered Monastery", "Haunted Manor"],
    "Orc Warrior": ["Cursed Battlefield", "Fallen Barracks", "Crumbling Fortress"],
    "Lesser Demon": ["Ruined Chapel", "Shattered Monastery", "Cursed Battlefield"],
    "Void Cultist": ["Ancient Library", "Buried Temple", "Sealed Gate"],
    "Iron Golem": ["Crumbling Fortress", "Watch Post", "Fallen Barracks"],
    
    # === NEW CREATURES WITH LOCATIONS ===
    "Bandit": ["Wrecked Caravan", "Deserted Camp", "Sunken Trail", "Watch Post"],
    "Cave Slime": ["Dripping Tunnels", "Fungal Hollow", "Blackwater Caves"],
    "Gnoll Scout": ["Hunting Grounds", "Rolling Hills", "Cursed Battlefield"],
    "Kobold": ["Winding Burrows", "Collapsed Shaft", "Fungal Hollow"],
    "Plague Rat": ["Forsaken Hamlet", "Sunken Village", "Abandoned Market"],
    
    "Flame Sprite": ["Lava Fissure", "Ashen Clearing", "Crystal Cavern"],
    "Forest Dryad": ["Whispering Grove", "Shaded Glade", "Wildflower Meadow"],
    "Ghoul": ["Forgotten Ossuary", "Cursed Battlefield", "Haunted Manor"],
    "Sand Viper": ["Rolling Hills", "Howling Plateau", "Stormbluff Cliffs"],
    "Shade": ["Dark Thicket", "Withered Grove", "Silent Tomb"],
    
    "Abyss Hound": ["Chasm Edge", "Abandoned Catacombs", "Sealed Gate"],
    "Crystal Golem": ["Crystal Cavern", "Stalactite Chamber", "Buried Temple"],
    "Ice Drake": ["Frozen Pond", "Stalactite Chamber", "Stormbluff Cliffs"],
    "Thunder Roc": ["Stormbluff Cliffs", "Howling Plateau", "Starlit Ridge"],
    
    # === BOSS LOCATIONS ===
    "Giant Toad": ["Twilight Marsh", "Boggy Mire", "Serpent's Brook"],
    "Goblin Brute": ["Forsaken Hamlet", "Crumbling Fortress", "Cursed Battlefield"],
    "Blood Fiend": ["Cursed Battlefield", "Abandoned Catacombs", "Ruined Chapel"],
    "Black Sun Dragon": ["Chasm Edge", "Lava Fissure"],
    "The King in Yellow": ["Ancient Library", "Silent Tomb"],
}

# Location categories for easier creature assignment
LOCATION_TYPES = {
    "wilderness": [
        "Dark Thicket", "Whispering Grove", "Shaded Glade", "Twilight Marsh",
        "Stone Circle", "Briar Patch", "Frozen Pond", "Rolling Hills",
        "Ashen Clearing", "Wildflower Meadow", "Lonely Oak", "Stormbluff Cliffs",
        "Howling Plateau", "Fallen Log Crossing", "Hunting Grounds", "Serpent's Brook",
        "Withered Grove", "Starlit Ridge", "Boggy Mire", "Sunken Trail"
    ],
    "underground": [
        "Crystal Cavern", "Fungal Hollow", "Abandoned Catacombs", "Echoing Grotto",
        "Dripping Tunnels", "Buried Temple", "Stalactite Chamber", "Chasm Edge",
        "Sunken Crypt", "Lava Fissure", "Forgotten Ossuary", "Serpent's Den",
        "Blackwater Caves", "Collapsed Shaft", "Winding Burrows", "Silent Tomb"
    ],
    "settlements": [
        "Ruined Chapel", "Crumbling Fortress", "Forsaken Hamlet", "Watch Post",
        "Shattered Monastery", "Sealed Gate", "Ancient Library", "Deserted Camp",
        "Cursed Battlefield", "Half-Sunk Tower", "Overgrown Courtyard", "Abandoned Market",
        "Haunted Manor", "Fallen Barracks", "Broken Aqueduct", "Silent Docks",
        "Derelict Mill", "Lost Amphitheater", "Sunken Village", "Wrecked Caravan"
    ]
}

# === COMPREHENSIVE MONSTER TRAIT SYSTEM ===

MONSTER_TRAITS = {
    # === MOVEMENT & MOBILITY TRAITS ===
    "evasive": {
        "description": "Naturally agile and hard to hit. Grants +20-45% dodge chance based on level.",
        "category": "mobility",
        "mechanics": "Increases dodge chance, scales with creature level and rarity"
    },
    "phase_shift": {
        "description": "Can briefly become incorporeal to avoid attacks. Grants +12-27% dodge chance.",
        "category": "mobility", 
        "mechanics": "Dodge chance bonus, particularly effective against physical attacks"
    },
    "teleporter": {
        "description": "Can instantly teleport short distances in combat. 30% chance to avoid area attacks.",
        "category": "mobility",
        "mechanics": "Immunity to area effects, chance to reposition mid-combat"
    },
    "swift": {
        "description": "Exceptionally fast movement. Gets extra actions 20% of the time.",
        "category": "mobility",
        "mechanics": "Chance for additional attacks per turn"
    },
    "burrower": {
        "description": "Can burrow underground to avoid attacks. 25% chance to become untargetable for 1 turn.",
        "category": "mobility",
        "mechanics": "Temporary invulnerability periods"
    },
    "flyer": {
        "description": "Airborne creature immune to ground-based effects. +15% dodge vs melee.",
        "category": "mobility",
        "mechanics": "Reduced damage from certain attack types, mobility advantage"
    },
    "aquatic": {
        "description": "Moves freely through water. Gains +2 armor and regen when fighting near water.",
        "category": "mobility",
        "mechanics": "Environmental bonuses in water areas"
    },
    "wall_crawler": {
        "description": "Can climb any surface. Gains +10% crit chance from advantageous positions.",
        "category": "mobility",
        "mechanics": "Positioning bonuses, increased critical hit rate"
    },

    # === DEFENSIVE TRAITS ===
    "shell": {
        "description": "Natural armor plating. Grants +2-12 armor based on level and rarity.",
        "category": "defensive",
        "mechanics": "Flat armor bonus that scales with creature power"
    },
    "stone_skin": {
        "description": "Skin hard as stone. Grants +3-22 armor and immunity to bleeding.",
        "category": "defensive",
        "mechanics": "High armor bonus plus status immunity"
    },
    "ice_armor": {
        "description": "Constantly covered in protective ice. +2-8 armor and cold immunity.",
        "category": "defensive",
        "mechanics": "Armor bonus plus elemental immunity"
    },
    "scales": {
        "description": "Tough draconic scales. +3-8 armor and reflects 10% damage back to attacker.",
        "category": "defensive",
        "mechanics": "Armor bonus with damage reflection"
    },
    "thick_hide": {
        "description": "Extremely tough skin. Reduces all damage by 1-3 points (after armor).",
        "category": "defensive",
        "mechanics": "Flat damage reduction separate from armor"
    },
    "magic_resist": {
        "description": "Natural resistance to magic. Takes 25-50% less damage from magical effects.",
        "category": "defensive",
        "mechanics": "Percentage reduction to magic damage"
    },
    "spell_immunity": {
        "description": "Complete immunity to magical effects. Spells have no effect whatsoever.",
        "category": "defensive",
        "mechanics": "Total immunity to magic damage and magical status effects"
    },
    "blessed": {
        "description": "Protected by divine forces. Immune to curse effects and undead abilities.",
        "category": "defensive",
        "mechanics": "Immunity to specific effect types"
    },
    "warded": {
        "description": "Surrounded by protective magical fields. 30% chance to negate any attack.",
        "category": "defensive",
        "mechanics": "Chance to completely avoid damage"
    },
    "adaptive": {
        "description": "Adapts to damage types. Gains +2 resistance to the last damage type received.",
        "category": "defensive",
        "mechanics": "Dynamic resistance that changes based on combat"
    },

    # === OFFENSIVE TRAITS ===
    "poison": {
        "description": "Venomous attacks. 25-60% chance to inflict 2-8 turn poison on successful hits.",
        "category": "offensive",
        "mechanics": "Status effect application with scaling chance and duration"
    },
    "bleed": {
        "description": "Causes severe wounds. 30-65% chance to inflict 2-5 turn bleeding.",
        "category": "offensive", 
        "mechanics": "Bleeding status effect with damage over time"
    },
    "burn": {
        "description": "Attacks inflict burning. 20-50% chance to set target on fire for 2-6 turns.",
        "category": "offensive",
        "mechanics": "Fire-based damage over time effect"
    },
    "freeze": {
        "description": "Chilling attacks. 25% chance to freeze target for 1-2 turns, preventing actions.",
        "category": "offensive",
        "mechanics": "Crowd control effect that disables enemy actions"
    },
    "shock": {
        "description": "Electrical attacks. 30% chance to stun for 1 turn, preventing counterattacks.",
        "category": "offensive",
        "mechanics": "Stun effect that skips enemy turns"
    },
    "life_drain": {
        "description": "Drains life force. Heals self for 25-50% of damage dealt to enemies.",
        "category": "offensive",
        "mechanics": "Self-healing based on damage output"
    },
    "mana_burn": {
        "description": "Destroys magical energy. Each hit reduces target mana and deals +2 damage per mana destroyed.",
        "category": "offensive",
        "mechanics": "Resource destruction with bonus damage"
    },
    "curse": {
        "description": "Attacks carry dark magic. Target takes +50% damage from all sources for 3 turns.",
        "category": "offensive",
        "mechanics": "Vulnerability debuff that amplifies incoming damage"
    },
    "soul_rend": {
        "description": "Tears at the soul. Damage ignores all armor and resistances.",
        "category": "offensive",
        "mechanics": "Unblockable damage that bypasses all defenses"
    },
    "energy_leech": {
        "description": "Absorbs magical energy. Steals spell power and magical effects from target.",
        "category": "offensive",
        "mechanics": "Temporary stat theft and power transfer"
    },

    # === INTIMIDATION & FEAR TRAITS ===
    "intimidate": {
        "description": "Terrifying presence. 20-50% chance to reduce incoming damage by 25-60%.",
        "category": "intimidation",
        "mechanics": "Fear-based damage reduction through psychological effect"
    },
    "fear_aura": {
        "description": "Radiates supernatural terror. All nearby enemies have -20% accuracy.",
        "category": "intimidation", 
        "mechanics": "Area effect that reduces enemy hit chances"
    },
    "horrifying": {
        "description": "Induces madness in those who see it. 15% chance to cause target to attack randomly.",
        "category": "intimidation",
        "mechanics": "Mind control effect causing random target selection"
    },
    "nightmare_fuel": {
        "description": "Literally made of nightmares. Causes -2 to all enemy stats for 5 turns on first hit.",
        "category": "intimidation",
        "mechanics": "Persistent debuff effect on initial contact"
    },
    "presence_of_doom": {
        "description": "Carries an aura of inevitable death. Reduces enemy max HP by 10% while in combat.",
        "category": "intimidation",
        "mechanics": "Temporary health reduction effect"
    },

    # === REGENERATION & HEALING TRAITS ===
    "regen": {
        "description": "Natural healing ability. Heals 1-3 HP per turn when below maximum health.",
        "category": "regeneration",
        "mechanics": "Automatic healing over time"
    },
    "fast_heal": {
        "description": "Accelerated healing. Heals 2-5 HP per turn and removes 1 status effect.",
        "category": "regeneration",
        "mechanics": "Enhanced healing plus status cleansing"
    },
    "undying": {
        "description": "Extremely hard to kill. When reduced to 1 HP, heals to 25% max HP once per combat.",
        "category": "regeneration",
        "mechanics": "One-time combat revival ability"
    },
    "phoenix_blood": {
        "description": "Reborn from death. Upon dying, resurrects with 50% HP and +100% damage for 3 turns.",
        "category": "regeneration", 
        "mechanics": "Death-triggered resurrection with temporary power boost"
    },
    "life_link": {
        "description": "Connected to life force. Heals based on damage dealt to others.",
        "category": "regeneration",
        "mechanics": "Healing scales with offensive success"
    },

    # === ELEMENTAL TRAITS ===
    "fire_aura": {
        "description": "Surrounded by flames. Deals 2-5 fire damage to attackers in melee range.",
        "category": "elemental",
        "mechanics": "Automatic retaliation damage to melee attackers"
    },
    "frost_aura": {
        "description": "Radiates intense cold. 40% chance to slow attackers, reducing their damage by 30%.",
        "category": "elemental",
        "mechanics": "Debuff application to enemies who attack"
    },
    "lightning_charged": {
        "description": "Crackling with electricity. 35% chance to shock attackers, stunning them for 1 turn.",
        "category": "elemental",
        "mechanics": "Counter-stun effect against melee attacks"
    },
    "void_touched": {
        "description": "Infused with void energy. All attacks deal additional void damage equal to 25% base damage.",
        "category": "elemental",
        "mechanics": "Automatic elemental damage bonus on all attacks"
    },
    "earth_bond": {
        "description": "Connected to the earth. Gains +1 armor per turn while standing on ground (max +5).",
        "category": "elemental",
        "mechanics": "Progressive armor increase over combat duration"
    },
    "water_form": {
        "description": "Partially liquid. Takes 50% less damage from physical attacks, +100% from lightning.",
        "category": "elemental",
        "mechanics": "Damage type resistance and vulnerability"
    },
    "air_essence": {
        "description": "Made partially of air. Cannot be grappled or restrained, +25% dodge.",
        "category": "elemental",
        "mechanics": "Immunity to control effects plus mobility bonus"
    },

    # === SPECIAL ATTACK TRAITS ===
    "multi_attack": {
        "description": "Can strike multiple times. 40% chance to make 2 attacks instead of 1.",
        "category": "special_attack",
        "mechanics": "Chance for double attacks in single turn"
    },
    "berserker": {
        "description": "Enters rage when damaged. +25% damage for each 25% HP lost.",
        "category": "special_attack",
        "mechanics": "Damage increases as HP decreases"
    },
    "precise": {
        "description": "Surgically accurate attacks. +25% crit chance and crits deal x3 damage instead of x2.",
        "category": "special_attack",
        "mechanics": "Enhanced critical hit mechanics"
    },
    "brutal": {
        "description": "Savage fighting style. Critical hits cause bleeding and reduce target max HP by 2.",
        "category": "special_attack",
        "mechanics": "Critical hits apply additional effects"
    },
    "siege_breaker": {
        "description": "Designed to destroy fortifications. Attacks ignore 75% of armor and deal +50% to constructs.",
        "category": "special_attack",
        "mechanics": "Armor penetration with creature type bonuses"
    },
    "soul_strike": {
        "description": "Attacks target the soul directly. Damage ignores all physical defenses.",
        "category": "special_attack",
        "mechanics": "Unblockable damage that bypasses armor and resistances"
    },
    "weapon_break": {
        "description": "Attacks damage equipment. 20% chance to temporarily disable enemy weapon for 2 turns.",
        "category": "special_attack",
        "mechanics": "Equipment disruption mechanics"
    },

    # === MAGICAL TRAITS ===
    "spell_caster": {
        "description": "Can cast spells in addition to physical attacks. Has mana pool and magical abilities.",
        "category": "magical",
        "mechanics": "Access to spell-based attacks and mana system"
    },
    "magic_immune": {
        "description": "Completely immune to all magical effects and spells. Physical attacks only.",
        "category": "magical",
        "mechanics": "Total immunity to magic damage and magical status effects"
    },
    "spell_reflect": {
        "description": "Reflects magical attacks back at caster. 50% chance to reverse spell effects.",
        "category": "magical",
        "mechanics": "Magic attack redirection"
    },
    "mana_void": {
        "description": "Drains magical energy from area. Reduces enemy spell power by 50% while in combat.",
        "category": "magical",
        "mechanics": "Magical power suppression field"
    },
    "enchanted": {
        "description": "Enhanced by magic. All attacks count as magical and gain +3-8 damage.",
        "category": "magical",
        "mechanics": "Magical damage type and damage bonus"
    },
    "dispel": {
        "description": "Disrupts magical effects. Each attack has 30% chance to remove target buffs.",
        "category": "magical",
        "mechanics": "Buff removal on successful hits"
    },
    "ward_break": {
        "description": "Specialized in breaking magical protections. Ignores magical armor and shields.",
        "category": "magical",
        "mechanics": "Bypasses magical defensive effects"
    },

    # === SIZE & PHYSICAL TRAITS ===
    "massive": {
        "description": "Enormous size grants combat advantages. +50% HP, +25% damage, cannot be moved.",
        "category": "physical",
        "mechanics": "Size-based stat bonuses and movement immunity"
    },
    "tiny": {
        "description": "Extremely small and hard to target. +30% dodge but -25% HP.",
        "category": "physical",
        "mechanics": "Size-based trade-off between survivability and evasion"
    },
    "incorporeal": {
        "description": "Partially exists in another dimension. Takes 50% less physical damage.",
        "category": "physical",
        "mechanics": "Damage type resistance based on physical nature"
    },
    "armored": {
        "description": "Naturally heavily armored. +3-8 base armor that cannot be pierced by normal means.",
        "category": "physical",
        "mechanics": "Unpenetrable armor bonus"
    },
    "flexible": {
        "description": "Extremely bendy and elastic. Immune to critical hits and crushing damage.",
        "category": "physical",
        "mechanics": "Critical hit immunity and damage type resistance"
    },
    "crystalline": {
        "description": "Body made of living crystal. Reflects 25% damage but takes +100% from sonic attacks.",
        "category": "physical",
        "mechanics": "Damage reflection with specific vulnerability"
    },

    # === BEHAVIORAL TRAITS ===
    "pack_hunter": {
        "description": "Fights better with allies. +2 damage and +10% accuracy for each other creature in combat.",
        "category": "behavioral",
        "mechanics": "Scaling bonuses based on ally count"
    },
    "lone_wolf": {
        "description": "Prefers to fight alone. +50% damage and +20% dodge when no allies are present.",
        "category": "behavioral", 
        "mechanics": "Solo combat bonuses"
    },
    "coward": {
        "description": "Attempts to flee when injured. 50% chance to run away when below 25% HP.",
        "category": "behavioral",
        "mechanics": "Automatic retreat behavior at low health"
    },
    "berserker_rage": {
        "description": "Goes berserk when allies die. +100% damage and +50% attack speed for 5 turns.",
        "category": "behavioral",
        "mechanics": "Triggered rage state with massive temporary bonuses"
    },
    "territorial": {
        "description": "Defends home area fiercely. +25% all stats when fighting in native environment.",
        "category": "behavioral",
        "mechanics": "Environmental combat bonuses"
    },
    "ambush": {
        "description": "Prefers surprise attacks. First attack deals double damage and cannot miss.",
        "category": "behavioral",
        "mechanics": "Combat initiation bonus"
    },
    "patient": {
        "description": "Waits for perfect opportunity. +10% crit chance per turn without attacking (max 50%).",
        "category": "behavioral",
        "mechanics": "Accumulating combat bonuses over time"
    },

    # === UNDEAD-SPECIFIC TRAITS ===
    "undead_resilience": {
        "description": "Undead toughness. Immune to poison, disease, and mind effects.",
        "category": "undead",
        "mechanics": "Multiple status effect immunities"
    },
    "life_hatred": {
        "description": "Despises all living things. +50% damage against non-undead creatures.",
        "category": "undead",
        "mechanics": "Damage bonus based on target type"
    },
    "necromantic": {
        "description": "Commands dark magic. Can raise fallen enemies as temporary allies.",
        "category": "undead",
        "mechanics": "Minion summoning from defeated enemies"
    },
    "soul_hunger": {
        "description": "Feeds on spiritual energy. Gains temporary spell power when enemies die nearby.",
        "category": "undead",
        "mechanics": "Power absorption from death events"
    },
    "grave_chill": {
        "description": "Radiates deathly cold. Reduces enemy max HP by 1 per turn (not lethal).",
        "category": "undead",
        "mechanics": "Progressive health reduction over time"
    },
    "death_whispers": {
        "description": "Speaks of mortality. 20% chance to inflict fear, reducing enemy damage by 40%.",
        "category": "undead",
        "mechanics": "Fear-based damage reduction debuff"
    },

    # === BEAST-SPECIFIC TRAITS ===
    "pack_bond": {
        "description": "Communicates with other beasts. Can summon 1-2 lesser beasts as allies.",
        "category": "beast",
        "mechanics": "Ally summoning ability"
    },
    "natural_camouflage": {
        "description": "Blends with environment. +30% stealth and immunity to detection abilities.",
        "category": "beast",
        "mechanics": "Stealth bonuses and detection immunity"
    },
    "predator": {
        "description": "Apex hunter instincts. +25% damage against creatures with lower level.",
        "category": "beast",
        "mechanics": "Level-based damage bonus"
    },
    "territorial_marking": {
        "description": "Marks territory with scent. Knows location of all enemies within area.",
        "category": "beast",
        "mechanics": "Enhanced awareness and tracking abilities"
    },
    "alpha": {
        "description": "Pack leader. Other beast-type creatures in combat gain +3 damage.",
        "category": "beast",
        "mechanics": "Aura effect that buffs allied creatures"
    },
    "wild_rage": {
        "description": "Primal fury. When below 50% HP, gains +100% damage but loses 50% accuracy.",
        "category": "beast",
        "mechanics": "HP-triggered berserker state with trade-offs"
    },

    # === CONSTRUCT-SPECIFIC TRAITS ===
    "mechanical": {
        "description": "Artificial construction. Immune to poison, charm, and fear effects.",
        "category": "construct",
        "mechanics": "Immunity to biological and mental effects"
    },
    "self_repair": {
        "description": "Can repair damage automatically. Heals 3-6 HP per turn but costs 1 turn to activate.",
        "category": "construct",
        "mechanics": "Active healing ability with turn cost"
    },
    "overload": {
        "description": "Can push beyond limits. Double damage for 2 turns, then disabled for 1 turn.",
        "category": "construct",
        "mechanics": "Powerful temporary boost with cooldown penalty"
    },
    "modular": {
        "description": "Reconfigurable parts. Can change armor/damage configuration between turns.",
        "category": "construct",
        "mechanics": "Dynamic stat allocation"
    },
    "energy_core": {
        "description": "Powered by magical energy. When destroyed, explodes for 10-20 damage to all in range.",
        "category": "construct",
        "mechanics": "Death explosion ability"
    },

    # === DEMON-SPECIFIC TRAITS ===
    "corruption": {
        "description": "Spreads evil influence. Nearby enemies gradually lose resistances over time.",
        "category": "demon",
        "mechanics": "Progressive debuff field effect"
    },
    "hellfire": {
        "description": "Commands infernal flames. Fire attacks ignore resistances and cause permanent scarring.",
        "category": "demon",
        "mechanics": "Enhanced fire effects with resistance bypass"
    },
    "temptation": {
        "description": "Offers dark bargains. 25% chance to make enemy skip turn while 'considering offer'.",
        "category": "demon",
        "mechanics": "Mind manipulation causing action loss"
    },
    "sin_feeder": {
        "description": "Grows stronger from conflict. Gains +1 damage permanently for each enemy killed in combat.",
        "category": "demon",
        "mechanics": "Combat-persistent power growth"
    },
    "hell_gate": {
        "description": "Can open portals to hell. Summons lesser demons as reinforcements.",
        "category": "demon",
        "mechanics": "Reinforcement summoning ability"
    },

    # === DRAGON-SPECIFIC TRAITS ===
    "dragon_breath": {
        "description": "Devastating breath weapon. Area attack that hits all enemies for 8-25 elemental damage.",
        "category": "dragon",
        "mechanics": "Area of effect special attack"
    },
    "ancient_wisdom": {
        "description": "Millennia of knowledge. +10 to all mental stats and immunity to illusions.",
        "category": "dragon",
        "mechanics": "Mental stat bonuses and illusion immunity"
    },
    "treasure_sense": {
        "description": "Can smell valuable items. Knows location of all magical items in area.",
        "category": "dragon",
        "mechanics": "Item detection ability"
    },
    "wing_buffet": {
        "description": "Powerful wing attacks. Can knock enemies prone, reducing their accuracy by 50%.",
        "category": "dragon",
        "mechanics": "Crowd control attack with accuracy penalty"
    },
    "draconic_majesty": {
        "description": "Inspiring presence. All dragon-type allies gain +25% to all stats.",
        "category": "dragon",
        "mechanics": "Species-specific aura buff"
    },

    # === STEALTH & AMBUSH TRAITS ===
    "stealth": {
        "description": "Natural hiding ability. +10-25% chance to avoid being targeted.",
        "category": "stealth",
        "mechanics": "Target avoidance chance in group combat"
    },
    "shadow_step": {
        "description": "Can move through shadows. First attack each combat gains +100% damage.",
        "category": "stealth",
        "mechanics": "Opening attack damage bonus"
    },
    "invisible": {
        "description": "Naturally invisible. Cannot be targeted until it attacks or takes damage.",
        "category": "stealth",
        "mechanics": "Temporary untargetable state"
    },
    "camouflage": {
        "description": "Perfect environmental blending. +50% dodge in natural environments.",
        "category": "stealth",
        "mechanics": "Environmental dodge bonus"
    },
    "silent": {
        "description": "Makes no sound. Immune to detection abilities and sound-based attacks.",
        "category": "stealth",
        "mechanics": "Detection immunity and sound attack resistance"
    },

    # === STATUS RESISTANCE TRAITS ===
    "poison_immune": {
        "description": "Complete immunity to all toxins and venoms. Cannot be poisoned by any means.",
        "category": "immunity",
        "mechanics": "Total poison immunity"
    },
    "disease_immune": {
        "description": "Immune to all diseases and infections. Cannot be weakened by biological effects.",
        "category": "immunity",
        "mechanics": "Disease and infection immunity"
    },
    "mind_shield": {
        "description": "Protected against mental attacks. Immune to charm, fear, and confusion effects.",
        "category": "immunity",
        "mechanics": "Mental effect immunity"
    },
    "curse_ward": {
        "description": "Warded against dark magic. Immune to curses and negative magical effects.",
        "category": "immunity",
        "mechanics": "Dark magic immunity"
    },
    "status_cleanse": {
        "description": "Automatically purges debuffs. Removes 1 negative status effect per turn.",
        "category": "immunity",
        "mechanics": "Automatic status effect removal"
    },

    # === ENVIRONMENTAL TRAITS ===
    "desert_adapted": {
        "description": "Thrives in hot, dry conditions. +3 armor and fire resistance in desert areas.",
        "category": "environmental",
        "mechanics": "Climate-based bonuses"
    },
    "arctic_dweller": {
        "description": "Adapted to extreme cold. Immune to cold effects and gains +2 damage in cold areas.",
        "category": "environmental",
        "mechanics": "Cold immunity with environmental damage bonus"
    },
    "deep_dweller": {
        "description": "Lives in underground depths. +25% damage in caves and immunity to cave-ins.",
        "category": "environmental",
        "mechanics": "Underground environment specialization"
    },
    "amphibious": {
        "description": "Can fight equally well on land or water. No penalties in any environment.",
        "category": "environmental",
        "mechanics": "Environmental penalty immunity"
    },
    "void_walker": {
        "description": "Exists partially outside reality. Can phase through environmental obstacles.",
        "category": "environmental",
        "mechanics": "Environmental obstacle immunity"
    },

    # === INTELLIGENCE & CUNNING TRAITS ===
    "tactical": {
        "description": "Uses advanced combat strategies. Attacks target enemy weak points for +25% damage.",
        "category": "intelligence",
        "mechanics": "Damage bonus through strategic targeting"
    },
    "learning": {
        "description": "Adapts to enemy patterns. Gains +2% dodge and damage per turn (max +20%).",
        "category": "intelligence",
        "mechanics": "Progressive combat improvement"
    },
    "predictive": {
        "description": "Anticipates enemy actions. 30% chance to counter-attack immediately after being hit.",
        "category": "intelligence",
        "mechanics": "Reactive counter-attack ability"
    },
    "strategic": {
        "description": "Plans several moves ahead. Can 'prepare' actions that trigger under specific conditions.",
        "category": "intelligence",
        "mechanics": "Conditional ability activation"
    },
    "memory": {
        "description": "Remembers all previous encounters. +10% all stats against creatures it has fought before.",
        "category": "intelligence",
        "mechanics": "Experience-based bonuses against familiar enemies"
    },

    # === SOCIAL & LEADERSHIP TRAITS ===
    "commander": {
        "description": "Natural leader. All allied creatures gain +5 damage and +10% accuracy.",
        "category": "leadership",
        "mechanics": "Aura buff for allied creatures"
    },
    "inspiring": {
        "description": "Motivates others through presence. Allied creatures heal 2 HP per turn.",
        "category": "leadership",
        "mechanics": "Ally healing aura"
    },
    "rallying": {
        "description": "Can rally defeated allies. 25% chance to resurrect fallen allies with 1 HP.",
        "category": "leadership",
        "mechanics": "Ally revival ability"
    },
    "mob_boss": {
        "description": "Commands criminal organization. Can call for backup reinforcements.",
        "category": "leadership",
        "mechanics": "Mid-combat ally summoning"
    },

    # === SPECIAL MECHANICS TRAITS ===
    "explosive": {
        "description": "Unstable creature. Upon death, explodes for 5-15 damage to all nearby.",
        "category": "special",
        "mechanics": "Death-triggered area damage"
    },
    "splitting": {
        "description": "Can divide when damaged. 25% chance to spawn a copy when below 50% HP.",
        "category": "special",
        "mechanics": "Self-replication ability"
    },
    "shape_shifter": {
        "description": "Changes form in combat. Can copy one trait from enemy each turn.",
        "category": "special",
        "mechanics": "Temporary trait copying"
    },
    "time_shifted": {
        "description": "Exists across multiple time streams. 20% chance to take two turns in a row.",
        "category": "special",
        "mechanics": "Extra turn generation"
    },
    "probability_warper": {
        "description": "Bends chance itself. Can reroll any dice roll once per turn.",
        "category": "special",
        "mechanics": "Luck manipulation ability"
    },
    "resource_drain": {
        "description": "Consumes enemy resources. Each attack reduces enemy mana, stamina, or cooldowns.",
        "category": "special",
        "mechanics": "Resource destruction attacks"
    },
    "mirror_skin": {
        "description": "Reflects abilities back. 40% chance to copy and use enemy special abilities.",
        "category": "special",
        "mechanics": "Ability reflection and copying"
    },

    # === SWARM & HIVE TRAITS ===
    "swarm": {
        "description": "Multiple small creatures acting as one. Each 25% HP lost spawns 1 lesser creature.",
        "category": "swarm",
        "mechanics": "Progressive ally generation as health decreases"
    },
    "hive_mind": {
        "description": "Connected consciousness. Shares damage equally among all connected creatures.",
        "category": "swarm",
        "mechanics": "Damage distribution across multiple entities"
    },
    "collective": {
        "description": "Grows stronger in groups. +10% all stats for each allied creature (max +50%).",
        "category": "swarm",
        "mechanics": "Scaling group bonuses"
    },

    # === ENERGY & POWER TRAITS ===
    "energy_being": {
        "description": "Made of pure energy. Immune to physical damage but takes +100% from energy drain.",
        "category": "energy",
        "mechanics": "Damage type immunity with specific vulnerability"
    },
    "power_core": {
        "description": "Contains immense power. Can 'overcharge' to double all stats for 2 turns (once per combat).",
        "category": "energy",
        "mechanics": "Limited-use massive temporary buff"
    },
    "energy_vampire": {
        "description": "Feeds on magical energy. Gains spell power equal to 25% of magic damage dealt.",
        "category": "energy",
        "mechanics": "Power scaling based on magical combat performance"
    },
    "unstable": {
        "description": "Volatile energy form. Random chance each turn to gain +50% damage or lose 25% HP.",
        "category": "energy",
        "mechanics": "Random positive/negative effects each turn"
    },

    # === TRANSFORMATION TRAITS ===
    "lycanthrope": {
        "description": "Can change between forms. Switches between humanoid (magic) and beast (physical) forms.",
        "category": "transformation",
        "mechanics": "Form-based stat and ability changes"
    },
    "elemental_shift": {
        "description": "Changes elemental affinity. Can cycle through fire, ice, lightning affinities each turn.",
        "category": "transformation",
        "mechanics": "Dynamic elemental type changes"
    },
    "size_shifter": {
        "description": "Alters physical size. Can become tiny (+50% dodge) or massive (+50% damage).",
        "category": "transformation",
        "mechanics": "Size-based stat trade-offs"
    },

    # === UNIQUE BOSS TRAITS ===
    "phase_transition": {
        "description": "Changes tactics at specific HP thresholds. Gains new abilities at 75%, 50%, 25% HP.",
        "category": "boss",
        "mechanics": "HP-triggered ability progression"
    },
    "enrage": {
        "description": "Becomes more dangerous when injured. +10% damage per 10% HP lost.",
        "category": "boss",
        "mechanics": "Scaling damage based on health loss"
    },
    "legendary_presence": {
        "description": "Aura of power affects entire battlefield. All combat rules are enhanced by 50%.",
        "category": "boss",
        "mechanics": "Global combat modifier"
    },
    "world_shaker": {
        "description": "Attacks affect the environment. Each attack has 20% chance to cause environmental damage.",
        "category": "boss",
        "mechanics": "Environmental effect generation"
    },
    "reality_anchor": {
        "description": "Prevents reality manipulation. Enemies cannot use teleportation or phase abilities.",
        "category": "boss",
        "mechanics": "Ability negation field"
    }
}

# Utility for picking a random event

def random_event():
    return random.choice(EVENTS)