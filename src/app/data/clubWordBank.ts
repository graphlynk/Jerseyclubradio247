// ─── Jersey Club Global Word Bank ─────────────────────────────────────────────
// Covers every region, era, artist, dance, and cultural touchpoint of the scene.

export interface WordEntry {
  id: string;
  word: string; // UPPERCASE, no spaces
  clue: string;
  category: 'place' | 'dj' | 'artist' | 'dance' | 'music' | 'digital' | 'culture';
}

export const WORD_BANK: WordEntry[] = [
  // ─── CORE PLACES ──────────────────────────────────────────────────────────────
  { id: 'newark',       word: 'NEWARK',       category: 'place', clue: 'Birthplace of Jersey Club — the undisputed home of the genre' },
  { id: 'baltimore',    word: 'BALTIMORE',    category: 'place', clue: 'Maryland\'s B-More scene — direct sister genre to Jersey Club' },
  { id: 'philly',       word: 'PHILLY',       category: 'place', clue: 'Philadelphia slang — city with its own fast-paced club style' },
  { id: 'brooklyn',     word: 'BROOKLYN',     category: 'place', clue: 'NYC borough where Jersey Club fused with local drill music' },
  { id: 'bronx',        word: 'BRONX',        category: 'place', clue: 'NYC borough with a deep connection to club and dancehall culture' },
  { id: 'london',       word: 'LONDON',       category: 'place', clue: 'UK capital where Jersey Club gained a massive following via grime circles' },
  { id: 'toronto',      word: 'TORONTO',      category: 'place', clue: 'Drake\'s hometown — his Honestly Nevermind album put Jersey Club on the global map' },
  { id: 'chicago',      word: 'CHICAGO',      category: 'place', clue: 'Footwork capital — cultural cousin to Jersey Club, shared DNA' },
  { id: 'jersey',       word: 'JERSEY',       category: 'place', clue: 'The Garden State — namesake of the genre' },
  { id: 'irvington',    word: 'IRVINGTON',    category: 'place', clue: 'Newark-adjacent NJ township central to early club culture' },
  { id: 'camden',       word: 'CAMDEN',       category: 'place', clue: 'NJ city across the Delaware from Philly — a key scene connector' },
  { id: 'paterson',     word: 'PATERSON',     category: 'place', clue: 'New Jersey\'s third-largest city with a vibrant club following' },
  { id: 'trenton',      word: 'TRENTON',      category: 'place', clue: 'New Jersey\'s capital city — part of the statewide scene' },
  { id: 'elizabeth',    word: 'ELIZABETH',    category: 'place', clue: 'Port city in northeast NJ — a key Jersey Club hub' },
  { id: 'hoboken',      word: 'HOBOKEN',      category: 'place', clue: 'NJ city on the Hudson with strong ties to club events' },
  { id: 'maryland',     word: 'MARYLAND',     category: 'place', clue: 'State home to Baltimore\'s B-More bounce scene' },
  { id: 'tristate',     word: 'TRISTATE',     category: 'place', clue: 'NY/NJ/CT area — the original heartland of Jersey Club culture' },
  { id: 'eastcoast',    word: 'EASTCOAST',    category: 'place', clue: 'Original home territory where Jersey Club rose from underground to movement' },
  { id: 'shore',        word: 'SHORE',        category: 'place', clue: 'NJ ___ — where beach clubs and youth culture spread the sound' },
  { id: 'plainfield',   word: 'PLAINFIELD',   category: 'place', clue: 'Central NJ city with a noted Jersey Club following' },
  { id: 'garden',       word: 'GARDEN',       category: 'place', clue: 'The ___ State — New Jersey\'s proud nickname' },
  { id: 'newyork',      word: 'NEWYORK',      category: 'place', clue: 'Major Tri-state anchor for Jersey Club shows and DJ residencies' },

  // ─── DJS / PRODUCERS ─────────────────────────────────────────────────────────
  { id: 'tameil',       word: 'TAMEIL',       category: 'dj', clue: 'DJ ___ — Newark original, credited as a founding architect of Jersey Club' },
  { id: 'bavgate',      word: 'BAVGATE',      category: 'dj', clue: 'DJ ___ — prolific Jersey Club legend from the Brick Bandits camp' },
  { id: 'technics',     word: 'TECHNICS',     category: 'dj', clue: 'DJ ___ — Jersey pioneer (and the legendary turntable brand name)' },
  { id: 'rondell',      word: 'RONDELL',      category: 'dj', clue: 'DJ ___ — Jersey Club fixture known for moving the crowd' },
  { id: 'sliink',       word: 'SLIINK',       category: 'dj', clue: 'DJ ___ — producer known for heavy, hard-hitting Jersey sound' },
  { id: 'jayhood',      word: 'JAYHOOD',      category: 'dj', clue: 'DJ ___ — certified Jersey legend with deep Newark roots' },
  { id: 'muramasa',     word: 'MURAMASA',     category: 'dj', clue: 'Mura Masa — UK producer who incorporated Jersey Club into mainstream pop' },
  { id: 'roddyrod',     word: 'RODDYROD',     category: 'dj', clue: 'Roddy Rod — Newark producer known for energetic club edits' },

  // ─── MAINSTREAM ARTISTS ───────────────────────────────────────────────────────
  { id: 'drake',        word: 'DRAKE',        category: 'artist', clue: '"Honestly, Nevermind" (2022) — his album introduced millions to Jersey Club globally' },
  { id: 'honestly',     word: 'HONESTLY',     category: 'artist', clue: '"___, Nevermind" — Drake\'s 2022 album built on Jersey Club rhythms' },
  { id: 'nevermind',    word: 'NEVERMIND',    category: 'artist', clue: 'Honestly, ___ — Drake\'s landmark Jersey-influenced LP' },
  { id: 'liluzivert',   word: 'LILUZIVERT',   category: 'artist', clue: '"Just Wanna Rock" — his viral Jersey Club banger from Philly' },
  { id: 'uzivert',      word: 'UZIVERT',      category: 'artist', clue: 'Lil ___ — Philly rapper whose "Just Wanna Rock" went Jersey viral' },

  // ─── DANCE MOVES ──────────────────────────────────────────────────────────────
  { id: 'shuffle',      word: 'SHUFFLE',      category: 'dance', clue: 'Signature Jersey Club dance — rapid side-to-side footwork steps' },
  { id: 'bounce',       word: 'BOUNCE',       category: 'dance', clue: 'Essential up-and-down motion — B-More and Jersey both claim it' },
  { id: 'stomp',        word: 'STOMP',        category: 'dance', clue: 'Percussive floor move — hard hit that echoes the kick drum' },
  { id: 'footwork',     word: 'FOOTWORK',     category: 'dance', clue: 'Chicago\'s lightning-fast feet style — closely related to Jersey Club' },
  { id: 'dribble',      word: 'DRIBBLE',      category: 'dance', clue: 'Basketball-inspired Jersey Club floor move' },
  { id: 'slide',        word: 'SLIDE',        category: 'dance', clue: 'Smooth lateral floor move essential to Jersey Club parties' },
  { id: 'jook',         word: 'JOOK',         category: 'dance', clue: 'Classic Jersey Club dance (also spelled Juke)' },
  { id: 'juke',         word: 'JUKE',         category: 'dance', clue: 'Alternative spelling of Jook — foundational club dance' },
  { id: 'bmore',        word: 'BMORE',        category: 'dance', clue: 'B-___ bounce: Baltimore\'s distinct club dance style' },
  { id: 'twerk',        word: 'TWERK',        category: 'dance', clue: 'Popular dance move that frequently appears in Jersey Club sets' },

  // ─── MUSIC TERMS ──────────────────────────────────────────────────────────────
  { id: 'bass',         word: 'BASS',         category: 'music', clue: 'The low-end frequency that physically shakes the dance floor' },
  { id: 'beat',         word: 'BEAT',         category: 'music', clue: 'The rhythmic pulse that drives every Jersey Club track' },
  { id: 'drop',         word: 'DROP',         category: 'music', clue: 'The moment the beat kicks back in — the dance floor explodes' },
  { id: 'freestyle',    word: 'FREESTYLE',    category: 'music', clue: 'Improvised, unscripted style — a core jersey club DJ skill' },
  { id: 'loop',         word: 'LOOP',         category: 'music', clue: 'A repeated audio sample — the backbone of club production' },
  { id: 'sample',       word: 'SAMPLE',       category: 'music', clue: 'A snippet of existing music reused in a new track' },
  { id: 'kick',         word: 'KICK',         category: 'music', clue: 'The bass drum hit — the rapid-fire heartbeat of Jersey Club' },
  { id: 'banger',       word: 'BANGER',       category: 'music', clue: 'A hard-hitting, high-energy club track that rocks the floor' },
  { id: 'remix',        word: 'REMIX',        category: 'music', clue: 'A reworked version — Jersey DJs turn anything into a club remix' },
  { id: 'groove',       word: 'GROOVE',       category: 'music', clue: 'A smooth repeating musical pattern — Baltimore is famous for its groove' },
  { id: 'bedsqueak',    word: 'BEDSQUEAK',    category: 'music', clue: 'The iconic "bed squeak" sample — the most recognisable Jersey Club sound' },
  { id: 'tempo',        word: 'TEMPO',        category: 'music', clue: 'Speed of a track — Jersey Club runs at roughly 140 BPM' },
  { id: 'trap',         word: 'TRAP',         category: 'music', clue: 'Sub-genre that cross-pollinates with Jersey Club in NYC drill circles' },
  { id: 'flip',         word: 'FLIP',         category: 'music', clue: 'To manipulate a sample — reverse, pitch-shift, or chop it up' },
  { id: 'chop',         word: 'CHOP',         category: 'music', clue: 'To cut a vocal or sample into rapid-fire stuttering fragments' },
  { id: 'vibe',         word: 'VIBE',         category: 'music', clue: 'The collective feeling a DJ set creates on the dance floor' },
  { id: 'club',         word: 'CLUB',         category: 'music', clue: 'Jersey ___ — the genre, the culture, and the venue all in one word' },
  { id: 'house',        word: 'HOUSE',        category: 'music', clue: 'Electronic genre born in Chicago that helped shape Jersey Club' },
  { id: 'drill',        word: 'DRILL',        category: 'music', clue: 'NYC sub-genre that fuses with Jersey Club in Brooklyn' },
  { id: 'vocal',        word: 'VOCAL',        category: 'music', clue: 'Chopped and stuttered voice samples — a signature Jersey Club element' },
  { id: 'scene',        word: 'SCENE',        category: 'music', clue: 'The underground ___ — block parties and local events where Jersey Club grew' },

  // ─── DIGITAL / SOCIAL ─────────────────────────────────────────────────────────
  { id: 'tiktok',       word: 'TIKTOK',       category: 'digital', clue: 'Platform that launched Jersey Club to a global audience virtually overnight' },
  { id: 'viral',        word: 'VIRAL',        category: 'digital', clue: 'What Jersey Club became on TikTok and Instagram — globally' },
  { id: 'youtube',      word: 'YOUTUBE',      category: 'digital', clue: 'Platform where Jersey Club DJ mixes live and build worldwide fanbases' },
  { id: 'stream',       word: 'STREAM',       category: 'digital', clue: 'How listeners in Tokyo or London access Jersey Club today' },
  { id: 'global',       word: 'GLOBAL',       category: 'digital', clue: 'Jersey Club has gone ___ — from Newark streets to every continent' },
  { id: 'instagram',    word: 'INSTAGRAM',    category: 'digital', clue: 'Visual social platform that spread Jersey Club dance clips worldwide' },
  { id: 'digital',      word: 'DIGITAL',      category: 'digital', clue: 'The ___ era transformed Jersey Club from a local sound to a global force' },

  // ─── CULTURE / CREW ───────────────────────────────────────────────────────────
  { id: 'brickbandits', word: 'BRICKBANDITS', category: 'culture', clue: 'The Brick ___ — Newark collective championed by DJ Tameil that defined the sound' },
  { id: 'crew',         word: 'CREW',         category: 'culture', clue: 'A collective of DJs and producers — the backbone of every scene' },
  { id: 'block',        word: 'BLOCK',        category: 'culture', clue: '___ party — where Jersey Club DJs first honed their craft in Newark' },
  { id: 'crowd',        word: 'CROWD',        category: 'culture', clue: 'The dance floor energy that drives the DJ to go harder' },
  { id: 'floor',        word: 'FLOOR',        category: 'culture', clue: 'The dance ___ — where Jersey Club music lives and breathes' },
  { id: 'party',        word: 'PARTY',        category: 'culture', clue: 'The event — where the music is made and the memories created' },
  { id: 'mainstream',   word: 'MAINSTREAM',   category: 'culture', clue: 'Jersey Club broke into the ___ via Drake, Uzi Vert and TikTok' },
  { id: 'underground',  word: 'UNDERGROUND',  category: 'culture', clue: 'Jersey Club\'s roots — it started as a raw, local ___ movement' },
];

// ─── 12 Themed Puzzles ────────────────────────────────────────────────────────
// Each theme selects 14-18 words from the bank above.
// Themes cycle daily: 365 ÷ 12 ≈ a new theme every 30 days.

export interface ThemeDefinition {
  id: string;
  name: string;
  subtitle: string;
  region: string;
  emoji: string;
  accentColor: string;
  blurb: string;        // educational paragraph shown in UI
  wordIds: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'newark',
    name: 'Newark Origins',
    subtitle: 'Where it all began',
    region: 'Newark, NJ',
    emoji: '🏙️',
    accentColor: '#9D00FF',
    blurb: 'Newark, New Jersey is the undisputed birthplace of Jersey Club. The sound emerged from block parties and basement events in the city\'s neighborhoods, championed by DJs like Tameil and the Brick Bandits crew. The Irvington area was especially central — a tight-knit community where producers built the genre from scratch on basic equipment, chopping vocals and layering rapid kick drums into something entirely new.',
    wordIds: ['newark', 'tameil', 'bavgate', 'irvington', 'brickbandits', 'shuffle', 'bedsqueak', 'jersey', 'scene', 'bounce', 'drop', 'bass', 'crew', 'garden', 'block'],
  },
  {
    id: 'baltimore',
    name: 'B-More Connection',
    subtitle: 'The sister city sound',
    region: 'Baltimore, MD',
    emoji: '🦀',
    accentColor: '#FF6B00',
    blurb: 'Baltimore Club — or B-More Bounce — is considered the direct ancestor of Jersey Club. The two cities exchanged DJs, beats, and techniques throughout the 1990s and 2000s, creating a shared musical DNA. Baltimore\'s faster tempo, chopped vocal style, and heavy bass directly influenced what Newark producers developed into the distinct Jersey Club sound. The two scenes still share DJs and crowds to this day.',
    wordIds: ['baltimore', 'maryland', 'bmore', 'bounce', 'groove', 'club', 'eastcoast', 'drop', 'bass', 'beat', 'shore', 'remix', 'chop', 'vocal', 'tempo'],
  },
  {
    id: 'philly',
    name: 'Philly Exchange',
    subtitle: 'South Jersey connects',
    region: 'Philadelphia, PA',
    emoji: '🔔',
    accentColor: '#00B4FF',
    blurb: 'Philadelphia developed its own fast-paced club style that constantly cross-pollinates with Jersey. Camden, NJ — just across the Delaware River — served as a natural bridge. Philly producers pushed the tempo even higher and added their own vocal chop signature. Lil Uzi Vert\'s "Just Wanna Rock" — one of the most viral Jersey Club anthems — came straight from Philly, proving how deep the connection runs.',
    wordIds: ['philly', 'camden', 'uzivert', 'house', 'freestyle', 'sample', 'remix', 'eastcoast', 'floor', 'party', 'club', 'shuffle', 'bounce', 'bass', 'banger'],
  },
  {
    id: 'nyc',
    name: 'NYC Takeover',
    subtitle: 'Tri-State spreads the gospel',
    region: 'New York City',
    emoji: '🗽',
    accentColor: '#00FF88',
    blurb: 'New York City — particularly Brooklyn and the Bronx — became a major expansion zone for Jersey Club. The proximity of Newark made it natural for the sound to flood across the Hudson. In Brooklyn and the Bronx, Jersey Club merged with local drill music, creating a harder, grittier hybrid that filled clubs and block parties. The Tri-state connection meant NYC DJs and Newark DJs were sharing stages and building a unified scene.',
    wordIds: ['brooklyn', 'bronx', 'newyork', 'tristate', 'drill', 'trap', 'crowd', 'vibe', 'kick', 'banger', 'newark', 'beat', 'floor', 'shuffle', 'bass'],
  },
  {
    id: 'shore',
    name: 'Shore Scene',
    subtitle: 'Beach clubs go hard',
    region: 'New Jersey Shore',
    emoji: '🌊',
    accentColor: '#00D4FF',
    blurb: 'The New Jersey Shore was a critical part of Jersey Club\'s local growth. Club nights at Shore venues drew massive crowds of young New Jerseyans throughout the late 2000s and 2010s. The Shore scene gave the genre a second home outside of Newark — a space where the music could reach suburban and beach-town audiences. Shore DJs and promoters helped standardize the sound and build a statewide fanbase.',
    wordIds: ['shore', 'jersey', 'bounce', 'party', 'crowd', 'floor', 'drop', 'bass', 'banger', 'groove', 'shuffle', 'scene', 'vibe', 'beat', 'club'],
  },
  {
    id: 'eastcoast',
    name: 'East Coast Bloc',
    subtitle: 'From Baltimore to Boston',
    region: 'East Coast, USA',
    emoji: '🗺️',
    accentColor: '#FF00FF',
    blurb: 'The East Coast was always the incubator. Jersey Club traveled up and down the I-95 corridor, connecting Newark, Baltimore, Philadelphia, and New York into one fluid cultural bloc. DJs from these cities played each other\'s events, sampled each other\'s records, and built a shared language of club music that spanned hundreds of miles. The East Coast scene laid the groundwork for the global explosion that would follow.',
    wordIds: ['eastcoast', 'newark', 'baltimore', 'philly', 'brooklyn', 'tristate', 'tameil', 'bavgate', 'shuffle', 'bounce', 'bass', 'drop', 'scene', 'crew', 'floor'],
  },
  {
    id: 'uk',
    name: 'UK Takeover',
    subtitle: 'London calling',
    region: 'United Kingdom',
    emoji: '🇬🇧',
    accentColor: '#FF4444',
    blurb: 'The United Kingdom became one of Jersey Club\'s biggest international homes. London\'s underground club scene — already rich with grime, UK garage, and jungle — proved fertile ground for Jersey\'s rapid kicks and chopped vocals. UK producer Mura Masa incorporated Jersey Club elements into his mainstream-crossing work, helping bring the sound to British pop audiences. UK DJs and selectors now regularly include Jersey edits in their sets.',
    wordIds: ['london', 'muramasa', 'global', 'viral', 'tiktok', 'jersey', 'bounce', 'bass', 'groove', 'freestyle', 'stream', 'remix', 'digital', 'scene', 'club'],
  },
  {
    id: 'global',
    name: 'Global Stage',
    subtitle: 'Every continent is rocking',
    region: 'Worldwide',
    emoji: '🌍',
    accentColor: '#FFD700',
    blurb: 'Social media collapsed all geographic barriers for Jersey Club. What once required a physical presence in Newark or Baltimore could now be experienced anywhere with an internet connection. YouTube mixes went viral in Japan, Brazil, and Australia. Instagram reels spread dance videos to West Africa and Southeast Asia. Toronto, Chicago, London, and Tokyo all developed their own local producers influenced by the Jersey Club template.',
    wordIds: ['global', 'tiktok', 'viral', 'youtube', 'stream', 'london', 'toronto', 'chicago', 'bounce', 'drop', 'digital', 'instagram', 'bass', 'kick', 'scene'],
  },
  {
    id: 'mainstream',
    name: 'Mainstream Crossover',
    subtitle: 'From underground to everywhere',
    region: 'Global Pop',
    emoji: '🏆',
    accentColor: '#FFD700',
    blurb: 'Jersey Club\'s crossover into mainstream pop is one of music\'s most dramatic underground-to-global stories. Drake\'s Honestly, Nevermind (2022) brought the sound to the top of charts worldwide. Lil Uzi Vert\'s "Just Wanna Rock" became a TikTok phenomenon. Mura Masa from the UK wove Jersey elements into festival-ready pop. The genre that started on Newark streets suddenly appeared in luxury hotel DJ sets, stadium playlists, and the Grammy conversation.',
    wordIds: ['drake', 'honestly', 'nevermind', 'uzivert', 'tiktok', 'viral', 'youtube', 'global', 'remix', 'bounce', 'mainstream', 'stream', 'vibe', 'bass', 'drop'],
  },
  {
    id: 'dance',
    name: 'Dance Culture',
    subtitle: 'The moves behind the music',
    region: 'The Dance Floor',
    emoji: '💃',
    accentColor: '#FF69B4',
    blurb: 'You cannot separate Jersey Club from its dance culture. The music was designed to move bodies — every BPM, every kick drum placement, every chopped vocal was crafted with the dance floor in mind. The shuffle, the dribble, the stomp, the slide, the jook — these aren\'t just moves, they\'re a physical language. B-More\'s bounce style, Chicago\'s footwork, and Newark\'s own vocabulary merged on the dance floor to create something uniquely athletic and expressive.',
    wordIds: ['shuffle', 'footwork', 'dribble', 'slide', 'jook', 'bounce', 'stomp', 'twerk', 'juke', 'bmore', 'groove', 'floor', 'party', 'crowd', 'tempo'],
  },
  {
    id: 'djlegends',
    name: 'DJ Roll Call',
    subtitle: 'The architects of the sound',
    region: 'Newark · Baltimore · London',
    emoji: '🎧',
    accentColor: '#9D00FF',
    blurb: 'Jersey Club was built by DJs, not labels. Tameil, Bavgate, DJ Technics, Rondell, Sliink, Jay Hood — these producers worked outside the mainstream industry, releasing tracks directly to communities that were hungry for them. Their approach — fast iteration, constant remixes, direct community engagement — became a model that later defined how internet-era artists would operate. UK producer Mura Masa stands as the most prominent international heir to that tradition.',
    wordIds: ['tameil', 'bavgate', 'technics', 'rondell', 'sliink', 'jayhood', 'muramasa', 'freestyle', 'drop', 'banger', 'remix', 'bass', 'bedsqueak', 'kick', 'scene'],
  },
  {
    id: 'digital',
    name: 'Digital Revolution',
    subtitle: 'How the internet changed everything',
    region: 'The Internet',
    emoji: '📱',
    accentColor: '#00FF88',
    blurb: 'The digital era transformed Jersey Club from a tight regional scene into a global cultural force. SoundCloud let producers upload tracks directly to fans. YouTube hosted full DJ sets that racked up millions of streams. TikTok turned Jersey Club dance clips into viral moments weekly. Instagram reels spread moves to every country. Streaming platforms added Jersey Club to editorial playlists alongside mainstream pop. The underground is everywhere now.',
    wordIds: ['tiktok', 'viral', 'youtube', 'global', 'stream', 'instagram', 'digital', 'bounce', 'drop', 'vibe', 'floor', 'scene', 'crowd', 'bass', 'underground'],
  },
];
