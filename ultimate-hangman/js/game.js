const { useState, useEffect, useCallback, useRef } = React;

/* ─────────────────── WORD BANK ─────────────────── */
const WORDS = {
  animals: {
    easy:   ['CAT','DOG','COW','PIG','HEN','BEE','ANT','OWL','ELK','FOX','EMU','YAK'],
    medium: ['RABBIT','MONKEY','PARROT','TURTLE','JAGUAR','SALMON','FALCON','BADGER','LIZARD','BEAVER','DONKEY','WALRUS'],
    hard:   ['ELEPHANT','KANGAROO','CROCODILE','BUTTERFLY','RHINOCEROS','ALLIGATOR','CHAMELEON','WOLVERINE'],
    expert: ['CHIMPANZEE','HIPPOPOTAMUS','TYRANNOSAURUS','ARCHAEOPTERYX','PLATYPUS','ORANGUTAN']
  },
  movies: {
    easy:   ['JAWS','ALIEN','THOR','DUNE','ARGO','HULK','SING','BOLT'],
    medium: ['AVATAR','BATMAN','FROZEN','MATRIX','TITANIC','SHREK','GREASE','ENCANTO'],
    hard:   ['INCEPTION','GLADIATOR','BRAVEHEART','AVENGERS','CASABLANCA','PREDATOR'],
    expert: ['APOCALYPSE','INTERSTELLAR','SCHINDLERLIST','CHRISTOPHER']
  },
  countries: {
    easy:   ['PERU','CUBA','FIJI','CHAD','OMAN','IRAN','LAOS','MALI','TOGO','IRAQ'],
    medium: ['FRANCE','BRAZIL','CANADA','RUSSIA','TURKEY','MEXICO','GREECE','SWEDEN','POLAND'],
    hard:   ['AUSTRALIA','ARGENTINA','INDONESIA','CAMBODIA','MOZAMBIQUE','VENEZUELA'],
    expert: ['LIECHTENSTEIN','AZERBAIJAN','MADAGASCAR','SWITZERLAND','TURKMENISTAN']
  },
  sports: {
    easy:   ['GOLF','POLO','JUDO','SWIM','ROWING','SKIING','BOXING'],
    medium: ['TENNIS','SOCCER','HOCKEY','CYCLING','CRICKET','FENCING','SURFING','ARCHERY'],
    hard:   ['BADMINTON','GYMNASTICS','WRESTLING','TRIATHLON','ATHLETICS','BIATHLON'],
    expert: ['WEIGHTLIFTING','SKATEBOARDING','SNOWBOARDING','PADDLEBOARDING','MOTORACING']
  },
  food: {
    easy:   ['CAKE','RICE','CORN','PEAR','BEEF','SOUP','MILK','FISH','EGGS','TACO','PITA'],
    medium: ['BURGER','PIZZA','SALMON','NOODLE','MUFFIN','WAFFLE','CHEESE','SHRIMP','BURRITO'],
    hard:   ['CHOCOLATE','SPAGHETTI','CROISSANT','BLUEBERRY','QUESADILLA','ENCHILADA'],
    expert: ['WORCESTERSHIRE','BITTERSWEET','MEDITERRANEAN','CARAMELIZED','GINGERBREAD']
  },
  technology: {
    easy:   ['CHIP','CODE','DATA','WIFI','USB','APP','CPU','RAM','LED','BOT'],
    medium: ['LAPTOP','TABLET','PYTHON','SERVER','ROUTER','HACKER','BINARY','KERNEL'],
    hard:   ['ALGORITHM','BLUETOOTH','INTERFACE','PROCESSOR','BANDWIDTH','DATABASE'],
    expert: ['CRYPTOCURRENCY','MICROPROCESSOR','CYBERSECURITY','VIRTUALIZATION','NANOTECHNOLOGY']
  },
  science: {
    easy:   ['ATOM','CELL','GENE','ACID','BASE','ION','MASS','HEAT','WAVE'],
    medium: ['PHOTON','PLASMA','CARBON','PROTON','NEURON','FISSION','OSMOSIS','GRAVITY'],
    hard:   ['MOLECULE','ELECTRON','HYDROGEN','MAGNETIC','CHEMICAL','PERIODIC','REACTION'],
    expert: ['THERMODYNAMICS','ELECTROMAGNETIC','PHOTOSYNTHESIS','MITOCHONDRIA','QUANTUMMECHANICS']
  },
  space: {
    easy:   ['MOON','MARS','STAR','SUN','NOVA','ORBIT','COMET','VENUS'],
    medium: ['SATURN','GALAXY','NEBULA','URANUS','METEOR','APOLLO','COSMOS','ECLIPSE'],
    hard:   ['ASTEROID','SUPERNOVA','TELESCOPE','BLACKHOLE','SATELLITE','EXOPLANET'],
    expert: ['CONSTELLATION','GRAVITATIONAL','INTERSTELLAR','LIGHTYEAR','SINGULARITY']
  },
  videogames: {
    easy:   ['MARIO','ZELDA','SONIC','PONG','DOOM','HALO','ATARI','SIMS'],
    medium: ['TETRIS','PACMAN','PORTAL','DIABLO','WARCRAFT','SKYRIM','FALLOOUT'],
    hard:   ['MINECRAFT','FORTNITE','OVERWATCH','CYBERPUNK','STARCRAFT','DISHONORED'],
    expert: ['COUNTERSTRIKE','BALDURSGATE','STREETFIGHTER','RESIDENTEVIL','DRAGONQUEST']
  }
};

const CAT_NAMES  = { animals:'Animals', movies:'Movies', countries:'Countries', sports:'Sports', food:'Food', technology:'Technology', science:'Science', space:'Space', videogames:'Video Games', random:'Random' };
const CAT_ICONS  = { animals:'🐾', movies:'🎬', countries:'🌍', sports:'⚽', food:'🍕', technology:'💻', science:'🔬', space:'🚀', videogames:'🎮', random:'🎲' };
const DIFF = {
  easy:   { maxWrong:10, label:'Easy',   badgeCls:'bg-green-100 text-green-800',  btnCls:'border-green-400 text-green-400'  },
  medium: { maxWrong:8,  label:'Medium', badgeCls:'bg-yellow-100 text-yellow-800',btnCls:'border-yellow-400 text-yellow-400'},
  hard:   { maxWrong:6,  label:'Hard',   badgeCls:'bg-orange-100 text-orange-800',btnCls:'border-orange-400 text-orange-400'},
  expert: { maxWrong:5,  label:'Expert', badgeCls:'bg-red-100 text-red-800',      btnCls:'border-red-400 text-red-400', noHints:true }
};

/* ─────────────────── AUDIO ─────────────────── */
let _ctx = null;
const ac = () => { if (!_ctx) _ctx = new (window.AudioContext||window.webkitAudioContext)(); return _ctx; };
const tone = (freq, dur, type='sine', vol=0.25) => {
  try {
    const c=ac(), o=c.createOscillator(), g=c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime+dur);
    o.start(); o.stop(c.currentTime+dur);
  } catch(e){}
};
const SFX = {
  correct: ()=>{ tone(523,.08); setTimeout(()=>tone(659,.08),90); setTimeout(()=>tone(784,.18),180); },
  wrong:   ()=>{ tone(220,.1,'sawtooth',.3); setTimeout(()=>tone(165,.18,'sawtooth',.3),110); },
  win:     ()=>{ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.25),i*110)); },
  lose:    ()=>{ [330,280,220,165].forEach((f,i)=>setTimeout(()=>tone(f,.28,'sawtooth',.25),i*140)); },
  hint:    ()=>{ tone(440,.08); setTimeout(()=>tone(880,.18),100); },
  click:   ()=>{ tone(600,.05,'sine',.1); }
};

/* ─────────────────── STORAGE ─────────────────── */
const LS_STATS = 'uh_stats_v2';
const LS_SET   = 'uh_settings_v2';
const defStats = { gamesPlayed:0, gamesWon:0, longestStreak:0, currentStreak:0, highestScore:0, totalScore:0, categoryWins:{} };
const loadStats    = ()=>{ try { return {...defStats,...JSON.parse(localStorage.getItem(LS_STATS)||'{}')}; } catch(e){ return {...defStats}; } };
const saveStats    = s=>{ try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch(e){} };
const loadSettings = ()=>{ try { return JSON.parse(localStorage.getItem(LS_SET)||'{}'); } catch(e){ return {}; } };
const saveSettings = s=>{ try { localStorage.setItem(LS_SET, JSON.stringify(s)); } catch(e){} };

/* ─────────────────── WORD SELECTION ─────────────────── */
function pickWord(category, difficulty) {
  let cat = category;
  if (cat === 'random') { const keys=Object.keys(WORDS); cat=keys[Math.floor(Math.random()*keys.length)]; }
  const list = WORDS[cat]?.[difficulty] || WORDS.animals.medium;
  return { word: list[Math.floor(Math.random()*list.length)], category: cat };
}

/* ─────────────────── HANGMAN SVG ─────────────────── */
function HangmanSVG({ wrong, isDark, status }) {
  const sc = isDark ? '#94a3b8' : '#64748b';
  const hf = isDark ? '#1e293b' : '#f8fafc';
  const fc = isDark ? '#94a3b8' : '#475569';
  const lw = { stroke: sc, strokeLinecap:'round', strokeLinejoin:'round', fill:'none' };

  const parts = [
    <line key="base" x1="10" y1="228" x2="190" y2="228" strokeWidth="7" {...lw} className="svg-draw" />,
    <line key="pole" x1="55"  y1="228" x2="55"  y2="12"  strokeWidth="6" {...lw} className="svg-draw" />,
    <line key="beam" x1="55"  y1="12"  x2="145" y2="12"  strokeWidth="5" {...lw} className="svg-draw" />,
    <line key="rope" x1="145" y1="12"  x2="145" y2="42"  strokeWidth="3" {...lw} className="svg-draw" />,
    <g key="head">
      <circle cx="145" cy="60" r="18" fill={hf} stroke={sc} strokeWidth="3" className="svg-draw" style={{strokeDasharray:200,animation:'drawSVG 0.4s ease both'}} />
      {wrong >= 5 && (
        status === 'lost'
          ? <>
              <line x1="138" y1="54" x2="143" y2="59" stroke={fc} strokeWidth="2" strokeLinecap="round" />
              <line x1="143" y1="54" x2="138" y2="59" stroke={fc} strokeWidth="2" strokeLinecap="round" />
              <line x1="148" y1="54" x2="153" y2="59" stroke={fc} strokeWidth="2" strokeLinecap="round" />
              <line x1="153" y1="54" x2="148" y2="59" stroke={fc} strokeWidth="2" strokeLinecap="round" />
              <path d="M138 70 Q145 66 152 70" stroke={fc} strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          : <>
              <circle cx="139" cy="57" r="2.5" fill={fc} />
              <circle cx="151" cy="57" r="2.5" fill={fc} />
              <path d="M138 68 Q145 74 152 68" stroke={fc} strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
      )}
    </g>,
    <line key="body" x1="145" y1="78"  x2="145" y2="148" strokeWidth="3" {...lw} className="svg-draw" />,
    <line key="la"   x1="145" y1="100" x2="115" y2="128" strokeWidth="3" {...lw} className="svg-draw" />,
    <line key="ra"   x1="145" y1="100" x2="175" y2="128" strokeWidth="3" {...lw} className="svg-draw" />,
    <line key="ll"   x1="145" y1="148" x2="115" y2="190" strokeWidth="3" {...lw} className="svg-draw" />,
    <line key="rl"   x1="145" y1="148" x2="175" y2="190" strokeWidth="3" {...lw} className="svg-draw" />
  ];

  const glow = status==='lost' ? 'drop-shadow(0 0 10px rgba(239,68,68,0.6))' : status==='won' ? 'drop-shadow(0 0 10px rgba(34,197,94,0.6))' : 'none';
  return (
    <svg viewBox="0 0 200 240" className="w-full max-w-[200px] mx-auto" style={{filter:glow}}>
      {parts.slice(0, wrong)}
    </svg>
  );
}

/* ─────────────────── WORD DISPLAY ─────────────────── */
function WordDisplay({ word, guessed, reveal, isDark }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 my-3">
      {word.split('').map((ch, i) => {
        const shown = ch===' ' || guessed.has(ch) || reveal;
        return ch===' '
          ? <div key={i} className="w-5" />
          : (
            <div key={i} className={`w-10 h-12 flex items-end justify-center pb-1 border-b-4 ${isDark?'border-indigo-400':'border-indigo-500'}`}>
              {shown
                ? <span key={ch+i+(guessed.has(ch)?'g':'r')} className={`text-xl font-extrabold ${isDark?'text-white':'text-gray-800'} pop-in`}>{ch}</span>
                : <span className="text-xl text-transparent select-none">_</span>
              }
            </div>
          );
      })}
    </div>
  );
}

/* ─────────────────── KEYBOARD ─────────────────── */
const ROWS = [['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M']];

function Keyboard({ guessed, word, onGuess, locked, isDark }) {
  return (
    <div className="flex flex-col items-center gap-1.5 mt-3 no-sel">
      {ROWS.map((row,ri) => (
        <div key={ri} className="flex gap-1.5 flex-wrap justify-center">
          {row.map(L => {
            const used = guessed.has(L);
            const ok   = used && word.includes(L);
            const bad  = used && !word.includes(L);
            return (
              <button key={L} onClick={()=>!used&&!locked&&onGuess(L)} disabled={used||locked}
                className={[
                  'w-8 h-9 sm:w-9 sm:h-10 rounded-lg text-sm font-bold transition-all duration-150',
                  ok  ? 'bg-green-500 text-white cursor-default shadow-inner' : '',
                  bad ? (isDark?'bg-gray-700 text-gray-500':'bg-gray-200 text-gray-400')+' cursor-default line-through' : '',
                  !used ? (isDark?'bg-indigo-600 hover:bg-indigo-500 active:scale-90 text-white shadow-md hover:scale-105':'bg-indigo-500 hover:bg-indigo-400 active:scale-90 text-white shadow-md hover:scale-105') : ''
                ].join(' ')}
              >{L}</button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────── HOME SCREEN ─────────────────── */
function HomeScreen({ onStart, stats, isDark, toggleTheme, onStats }) {
  const [mode, setMode]       = useState('single');
  const [diff, setDiff]       = useState('medium');
  const [cat,  setCat]        = useState('random');
  const winPct = stats.gamesPlayed ? Math.round(stats.gamesWon/stats.gamesPlayed*100) : 0;

  const card = `${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-200'} border rounded-2xl p-5 shadow-lg mb-4`;
  const selBtn = (active) => `border-2 rounded-xl p-2.5 text-center transition-all cursor-pointer ${active ? 'border-indigo-500 bg-indigo-500/10' : isDark?'border-gray-700 hover:border-gray-500':'border-gray-200 hover:border-gray-300'}`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark?'bg-gray-900 text-white':'bg-gray-50 text-gray-800'}`}>
      <header className={`flex justify-between items-center px-5 py-4 ${isDark?'bg-gray-800':'bg-white'} shadow-md`}>
        <div>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent leading-tight">Ultimate Hangman</h1>
          {stats.currentStreak > 1 && <p className="text-xs text-orange-400 font-semibold">🔥 {stats.currentStreak} win streak!</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onStats}       className={`p-2 rounded-xl ${isDark?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} transition-colors text-lg`} title="Stats">📊</button>
          <button onClick={toggleTheme}   className={`p-2 rounded-xl ${isDark?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} transition-colors text-lg`}>{isDark?'☀️':'🌙'}</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 max-w-xl mx-auto w-full">
        {stats.gamesPlayed > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[{l:'Played',v:stats.gamesPlayed},{l:'Win %',v:winPct+'%'},{l:'Best Streak',v:stats.longestStreak}].map(s=>(
              <div key={s.l} className={`${isDark?'bg-gray-800':'bg-white'} rounded-xl p-3 text-center shadow`}>
                <div className="text-xl font-extrabold text-indigo-400">{s.v}</div>
                <div className={`text-xs ${isDark?'text-gray-400':'text-gray-500'}`}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        <div className={card}>
          <h2 className="font-bold text-base mb-3 text-indigo-400">Game Mode</h2>
          <div className="grid grid-cols-3 gap-2">
            {[{id:'single',icon:'🎯',lbl:'Single Player'},{id:'twoplayer',icon:'👥',lbl:'Two Player'},{id:'ai',icon:'🤖',lbl:'AI Challenge'}].map(m=>(
              <div key={m.id} className={selBtn(mode===m.id)} onClick={()=>{setMode(m.id);SFX.click();}}>
                <div className="text-2xl">{m.icon}</div>
                <div className={`text-xs font-semibold mt-1 ${mode===m.id?'text-indigo-400':isDark?'text-gray-300':'text-gray-600'}`}>{m.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h2 className="font-bold text-base mb-3 text-indigo-400">Difficulty</h2>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(DIFF).map(([id,cfg])=>(
              <div key={id} className={selBtn(diff===id)} onClick={()=>{setDiff(id);SFX.click();}}>
                <div className={`text-xs font-extrabold ${diff===id?'text-indigo-400':''}`}>{cfg.label}</div>
                <div className={`text-xs mt-0.5 ${isDark?'text-gray-400':'text-gray-500'}`}>{cfg.maxWrong} lives</div>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h2 className="font-bold text-base mb-3 text-indigo-400">Category</h2>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(CAT_NAMES).map(([id,name])=>(
              <div key={id} className={selBtn(cat===id)} onClick={()=>{setCat(id);SFX.click();}}>
                <div className="text-xl leading-tight">{CAT_ICONS[id]}</div>
                <div className={`text-xs font-medium mt-0.5 ${cat===id?'text-indigo-400':isDark?'text-gray-300':'text-gray-500'}`}>{name}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={()=>onStart({mode,diff,cat})}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl">
          Play Now →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── WORD ENTRY (2P) ─────────────────── */
function WordEntryScreen({ onSubmit, isDark }) {
  const [val,setVal] = useState('');
  const [show,setShow] = useState(false);
  const [err,setErr]  = useState('');
  const submit = () => {
    const w = val.toUpperCase().replace(/[^A-Z]/g,'');
    if (w.length < 3) { setErr('At least 3 letters required'); return; }
    if (w.length > 16) { setErr('Max 16 letters'); return; }
    onSubmit(w);
  };
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark?'bg-gray-900':'bg-gray-50'}`}>
      <div className={`${isDark?'bg-gray-800 text-white':'bg-white text-gray-800'} rounded-3xl p-8 shadow-2xl max-w-sm w-full`}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">👥</div>
          <h2 className="text-2xl font-extrabold">Player 1</h2>
          <p className={`text-sm mt-1 ${isDark?'text-gray-400':'text-gray-500'}`}>Enter the secret word for Player 2</p>
        </div>
        <div className="relative mb-3">
          <input type={show?'text':'password'} value={val} maxLength={16} autoFocus
            onChange={e=>{setVal(e.target.value.toUpperCase());setErr('');}}
            onKeyDown={e=>e.key==='Enter'&&submit()}
            placeholder="YOUR SECRET WORD"
            className={`w-full px-4 py-3 rounded-xl text-center text-xl font-mono font-bold border-2 outline-none transition-all
              ${isDark?'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500':'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-300 focus:border-indigo-500'}`}
          />
          <button onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xl">{show?'🙈':'👁️'}</button>
        </div>
        {err && <p className="text-red-500 text-xs text-center mb-3">{err}</p>}
        <p className={`text-xs text-center mb-5 ${isDark?'text-gray-500':'text-gray-400'}`}>Letters only • Make it tricky!</p>
        <button onClick={submit} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-opacity">
          Set Word →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── GAME SCREEN ─────────────────── */
function GameScreen({ settings, secretWord, onEnd, isDark, toggleTheme }) {
  const { mode, diff, cat: initCat } = settings;
  const cfg = DIFF[diff];

  const [wdata]          = useState(()=> secretWord ? {word:secretWord,category:'twoplayer'} : pickWord(initCat, diff));
  const { word, category } = wdata;
  const uniqueLetters      = [...new Set(word.split('').filter(c=>c!==' '))];
  const maxWrongBase       = cfg.maxWrong;

  const [guessed,   setGuessed]   = useState(new Set());
  const [wrongCnt,  setWrongCnt]  = useState(0);
  const [maxWrong,  setMaxWrong]  = useState(maxWrongBase);
  const [status,    setStatus]    = useState('playing');
  const [score,     setScore]     = useState(0);
  const [hintTok,   setHintTok]   = useState(3);
  const [usedHints, setUsedHints] = useState(0);
  const [hints,     setHints]     = useState([]);
  const [shakeKey,  setShakeKey]  = useState(0);
  const [msg,       setMsg]       = useState(null);
  const [powerUps,  setPowerUps]  = useState({shield:1,reveal:1,extraLife:1,double:1});
  const [shield,    setShield]    = useState(false);
  const [doubleScore,setDouble]   = useState(false);
  const endedRef = useRef(false);

  const showMsg = (text, type='info', ms=1800) => {
    setMsg({text,type});
    setTimeout(()=>setMsg(null), ms);
  };

  const isWon  = uniqueLetters.every(l=>guessed.has(l));
  const isLost = wrongCnt >= maxWrong;

  useEffect(()=>{
    if (endedRef.current) return;
    if (isWon) {
      endedRef.current = true;
      setStatus('won'); SFX.win();
      const pts = (uniqueLetters.length*10) + 50 + ((maxWrong-wrongCnt)*5) - (usedHints*10);
      const final = Math.max(0, doubleScore ? pts*2 : pts);
      setScore(final);
      setTimeout(()=>onEnd({result:'won', score:final, word, category, diff}), 1600);
    } else if (isLost) {
      endedRef.current = true;
      setStatus('lost'); SFX.lose();
      setShakeKey(k=>k+1);
      setTimeout(()=>onEnd({result:'lost', score:0, word, category, diff}), 1700);
    }
  }, [isWon, isLost]);

  const guess = useCallback((L)=>{
    if (guessed.has(L) || status!=='playing') return;
    const next = new Set(guessed); next.add(L);
    setGuessed(next);
    if (word.includes(L)) {
      SFX.correct();
      const pts = doubleScore ? 20 : 10;
      setScore(s=>s+pts);
      showMsg(`+${pts} pts`, 'success', 1000);
    } else {
      if (shield) { setShield(false); showMsg('🛡️ Shield blocked it!','info'); return; }
      SFX.wrong();
      setWrongCnt(c=>c+1);
      setShakeKey(k=>k+1);
    }
  }, [guessed, word, status, doubleScore, shield]);

  useEffect(()=>{
    const h = e => { const k=e.key.toUpperCase(); if(/^[A-Z]$/.test(k)) guess(k); };
    window.addEventListener('keydown', h);
    return ()=>window.removeEventListener('keydown', h);
  }, [guess]);

  const useHint = (type) => {
    if (cfg.noHints)    { showMsg('No hints in Expert mode!','error'); return; }
    if (hintTok <= 0)   { showMsg('No hint tokens left!','error'); return; }
    if (status!=='playing') return;
    SFX.hint();
    setHintTok(h=>h-1); setUsedHints(u=>u+1); setScore(s=>Math.max(0,s-10));
    let label = '';
    if (type==='cat')    { label = `Category: ${CAT_NAMES[category]||'Two Player'}`; }
    else if (type==='first') { const l=word[0]; if(!guessed.has(l)){const n=new Set(guessed);n.add(l);setGuessed(n);} label=`First letter: ${l}`; }
    else if (type==='last')  { const l=word[word.length-1]; if(!guessed.has(l)){const n=new Set(guessed);n.add(l);setGuessed(n);} label=`Last letter: ${l}`; }
    else if (type==='rnd')   {
      const pool=uniqueLetters.filter(l=>!guessed.has(l));
      if (!pool.length) { showMsg('All letters revealed!','info'); return; }
      const l=pool[Math.floor(Math.random()*pool.length)];
      const n=new Set(guessed); n.add(l); setGuessed(n);
      label=`Revealed: ${l}`;
    }
    setHints(h=>[...h, label]);
    showMsg('-10 pts • '+label, 'warn');
  };

  const usePU = (type) => {
    if (!powerUps[type]) { showMsg(`No ${type} left!`,'error'); return; }
    if (status!=='playing') return;
    SFX.hint();
    setPowerUps(p=>({...p,[type]:p[type]-1}));
    if (type==='shield')    { setShield(true); showMsg('🛡️ Shield active!','success'); }
    else if (type==='reveal') {
      const pool=uniqueLetters.filter(l=>!guessed.has(l));
      if (pool.length) { const l=pool[Math.floor(Math.random()*pool.length)]; const n=new Set(guessed);n.add(l);setGuessed(n); showMsg(`🔍 Revealed: ${l}`,'success'); }
    }
    else if (type==='extraLife') { setMaxWrong(m=>m+1); showMsg('💚 +1 Life!','success'); }
    else if (type==='double')    { setDouble(true); showMsg('⚡ 2× Score!','success'); }
  };

  const livesLeft = maxWrong - wrongCnt;
  const pct = (livesLeft/maxWrong)*100;
  const barCls = pct>60?'bg-green-500':pct>25?'bg-yellow-500':'bg-red-500';

  const msgColors = { success:'bg-green-500 text-white', error:'bg-red-500 text-white', warn:'bg-amber-400 text-gray-900', info:`${isDark?'bg-gray-700 text-gray-200':'bg-gray-200 text-gray-700'}` };

  return (
    <div className={`min-h-screen flex flex-col ${isDark?'bg-gray-900 text-white':'bg-gray-50 text-gray-800'}`}>
      <header className={`flex justify-between items-center px-4 py-3 ${isDark?'bg-gray-800':'bg-white'} shadow`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cfg.badgeCls}`}>{cfg.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark?'bg-gray-700 text-gray-300':'bg-gray-100 text-gray-600'}`}>
            {CAT_ICONS[category]} {CAT_NAMES[category]||'Two Player'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {doubleScore && <span className="text-yellow-400 font-extrabold text-sm pulse2">2×</span>}
          {shield && <span className="text-blue-400 text-base">🛡️</span>}
          <div className="text-right">
            <div className="text-lg font-extrabold text-indigo-400 leading-none">{score}</div>
            <div className={`text-xs ${isDark?'text-gray-500':'text-gray-400'}`}>pts</div>
          </div>
          <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark?'bg-gray-700':'bg-gray-100'}`}>{isDark?'☀️':'🌙'}</button>
        </div>
      </header>

      <div className={`px-4 py-2 ${isDark?'bg-gray-800 border-gray-700':'bg-white border-gray-100'} border-b`}>
        <div className="flex justify-between text-xs mb-1">
          <span className={isDark?'text-gray-400':'text-gray-500'}>❤️ {livesLeft}/{maxWrong} lives</span>
          <span className={isDark?'text-gray-400':'text-gray-500'}>{wrongCnt} wrong</span>
        </div>
        <div className={`h-1.5 rounded-full ${isDark?'bg-gray-700':'bg-gray-200'}`}>
          <div className={`h-1.5 rounded-full transition-all duration-500 ${barCls}`} style={{width:`${pct}%`}} />
        </div>
      </div>

      {msg && (
        <div className={`mx-4 mt-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-center slide-down ${msgColors[msg.type]}`}>
          {msg.text}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-2 pb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className={`sm:w-44 w-full ${status==='lost'?'shake':''}`} key={`hg-${shakeKey}`}>
              <HangmanSVG wrong={wrongCnt} isDark={isDark} status={status} />
            </div>
            <div className="flex-1 w-full">
              <WordDisplay word={word} guessed={guessed} reveal={status==='lost'} isDark={isDark} />

              {hints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {hints.map((h,i)=>(
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark?'bg-indigo-900 text-indigo-300':'bg-indigo-100 text-indigo-700'}`}>
                      💡 {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {[
              {id:'shield',   icon:'🛡️', lbl:'Shield',    tip:'Block next wrong guess'},
              {id:'reveal',   icon:'🔍', lbl:'Reveal',    tip:'Show a random letter'},
              {id:'extraLife',icon:'💚', lbl:'+Life',     tip:'Add an extra attempt'},
              {id:'double',   icon:'⚡', lbl:'2× Score',  tip:'Double your score'}
            ].map(pu=>{
              const off = !powerUps[pu.id] || status!=='playing' || (pu.id==='double'&&doubleScore) || (pu.id==='shield'&&shield);
              return (
                <button key={pu.id} onClick={()=>usePU(pu.id)} disabled={off} title={pu.tip}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                    ${off ? isDark?'border-gray-700 bg-gray-800 text-gray-600':'border-gray-200 bg-gray-100 text-gray-400'
                          : isDark?'border-gray-600 bg-gray-700 hover:bg-gray-600 text-white':'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm'}`}>
                  {pu.icon} {pu.lbl}
                  <span className={`ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs ${powerUps[pu.id]&&!off?'bg-indigo-500 text-white':'bg-gray-500 text-gray-300'}`}>
                    {powerUps[pu.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {!cfg.noHints && status==='playing' && (
            <div className="mt-3">
              <p className={`text-center text-xs mb-2 ${isDark?'text-gray-400':'text-gray-500'}`}>
                💡 Hint tokens: {hintTok} &nbsp;(−10 pts each)
              </p>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {[{id:'cat',lbl:'📂 Category'},{id:'first',lbl:'⬅️ First'},{id:'last',lbl:'➡️ Last'},{id:'rnd',lbl:'🎲 Random'}].map(h=>(
                  <button key={h.id} onClick={()=>useHint(h.id)} disabled={hintTok<=0}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
                      ${hintTok>0 ? isDark?'border-amber-700 bg-amber-900/40 text-amber-300 hover:bg-amber-900/70':'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : isDark?'border-gray-700 bg-gray-800 text-gray-600':'border-gray-200 bg-gray-100 text-gray-400'}`}>
                    {h.lbl}
                  </button>
                ))}
              </div>
            </div>
          )}
          {cfg.noHints && (
            <p className="text-center text-xs text-red-400 mt-3 font-semibold">Expert mode — no hints allowed</p>
          )}

          <Keyboard guessed={guessed} word={word} onGuess={guess} locked={status!=='playing'} isDark={isDark} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── GAME OVER SCREEN ─────────────────── */
function GameOverScreen({ result, onAgain, onHome, isDark }) {
  const { result:res, score, word, category, diff } = result;
  const won = res === 'won';

  const confetti = won ? Array.from({length:35},(_,i)=>({
    id:i, left:Math.random()*100, delay:Math.random()*1.5,
    color:['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#38bdf8'][i%6],
    size:6+Math.random()*8, round:Math.random()>.5
  })) : [];

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDark?'bg-gray-900':'bg-gray-50'}`}>
      {confetti.map(p=>(
        <div key={p.id} className="absolute pointer-events-none" style={{
          left:`${p.left}%`, top:'-16px', width:p.size, height:p.size,
          backgroundColor:p.color, borderRadius:p.round?'50%':'3px',
          animation:`confettiFall ${1.8+Math.random()*1.2}s ${p.delay}s linear both`
        }} />
      ))}

      <div className={`${isDark?'bg-gray-800 text-white':'bg-white text-gray-800'} rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center relative z-10`}>
        <div className="text-6xl mb-3">{won?'🎉':'💀'}</div>
        <h2 className={`text-3xl font-extrabold mb-1 ${won?'text-green-400':'text-red-400'}`}>{won?'You Won!':'Game Over!'}</h2>
        <p className={`text-sm mb-5 ${isDark?'text-gray-400':'text-gray-500'}`}>{won?'Outstanding!':'Better luck next time'}</p>

        <div className={`${isDark?'bg-gray-700':'bg-gray-100'} rounded-2xl p-4 mb-5`}>
          <div className="text-3xl font-extrabold font-mono tracking-widest text-indigo-400">{word}</div>
          <div className={`text-sm mt-1 ${isDark?'text-gray-400':'text-gray-500'}`}>
            {CAT_ICONS[category]||'👥'} {CAT_NAMES[category]||'Two Player'} • {DIFF[diff]?.label||diff}
          </div>
        </div>

        {won && (
          <div className={`${isDark?'bg-gray-700':'bg-gray-100'} rounded-xl p-3 mb-5`}>
            <div className="text-3xl font-extrabold text-yellow-400">{score}</div>
            <div className={`text-xs ${isDark?'text-gray-400':'text-gray-500'}`}>Points Earned</div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={onAgain} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-lg hover:opacity-90 transition-opacity">
            Play Again
          </button>
          <button onClick={onHome} className={`w-full py-3 rounded-xl font-bold ${isDark?'bg-gray-700 hover:bg-gray-600 text-gray-300':'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── STATS SCREEN ─────────────────── */
function StatsScreen({ stats, onBack, isDark }) {
  const { gamesPlayed:gp=0, gamesWon:gw=0, longestStreak:ls=0, highestScore:hs=0, totalScore:ts=0, categoryWins:cw={} } = stats;
  const pct = gp ? Math.round(gw/gp*100) : 0;
  const topCat = Object.entries(cw).sort(([,a],[,b])=>b-a)[0];

  return (
    <div className={`min-h-screen flex flex-col ${isDark?'bg-gray-900 text-white':'bg-gray-50 text-gray-800'}`}>
      <header className={`flex items-center gap-3 px-4 py-4 ${isDark?'bg-gray-800':'bg-white'} shadow`}>
        <button onClick={onBack} className={`p-2 rounded-xl ${isDark?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'} transition-colors font-bold`}>← Back</button>
        <h2 className="text-xl font-extrabold">Statistics</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full">
        {gp === 0
          ? <div className="text-center py-20">
              <div className="text-6xl mb-4">🎮</div>
              <p className={isDark?'text-gray-400':'text-gray-500'}>No games yet — start playing!</p>
            </div>
          : <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[{i:'🎮',l:'Games Played',v:gp},{i:'🏆',l:'Games Won',v:gw},{i:'📈',l:'Win Rate',v:pct+'%'},{i:'🔥',l:'Best Streak',v:ls},{i:'⭐',l:'Highest Score',v:hs},{i:'💎',l:'Total Score',v:ts}].map(s=>(
                <div key={s.l} className={`${isDark?'bg-gray-800':'bg-white'} rounded-2xl p-4 shadow text-center`}>
                  <div className="text-3xl mb-1">{s.i}</div>
                  <div className="text-2xl font-extrabold text-indigo-400">{s.v}</div>
                  <div className={`text-xs ${isDark?'text-gray-400':'text-gray-500'}`}>{s.l}</div>
                </div>
              ))}
            </div>

            {topCat && (
              <div className={`${isDark?'bg-gray-800':'bg-white'} rounded-2xl p-5 shadow mb-4 text-center`}>
                <div className="text-4xl mb-1">{CAT_ICONS[topCat[0]]}</div>
                <div className="font-bold text-indigo-400">{CAT_NAMES[topCat[0]]}</div>
                <div className={`text-xs ${isDark?'text-gray-400':'text-gray-500'}`}>Favourite category • {topCat[1]} wins</div>
              </div>
            )}

            {Object.keys(cw).length > 0 && (
              <div className={`${isDark?'bg-gray-800':'bg-white'} rounded-2xl p-5 shadow`}>
                <h3 className="font-bold mb-3 text-indigo-400">Wins by Category</h3>
                <div className="space-y-2.5">
                  {Object.entries(cw).sort(([,a],[,b])=>b-a).map(([cat,wins])=>{
                    const max = Math.max(...Object.values(cw));
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-lg w-7 shrink-0">{CAT_ICONS[cat]}</span>
                        <span className={`text-xs font-medium w-20 shrink-0 ${isDark?'text-gray-300':'text-gray-600'}`}>{CAT_NAMES[cat]}</span>
                        <div className={`flex-1 h-2 rounded-full ${isDark?'bg-gray-700':'bg-gray-200'}`}>
                          <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{width:`${(wins/max)*100}%`}} />
                        </div>
                        <span className="text-xs font-bold text-indigo-400 w-5 text-right">{wins}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        }
      </div>
    </div>
  );
}

/* ─────────────────── APP ROOT ─────────────────── */
function App() {
  const saved = loadSettings();
  const [isDark,    setIsDark]    = useState(saved.isDark !== false);
  const [screen,    setScreen]    = useState('home');
  const [gameCfg,   setGameCfg]   = useState(null);
  const [secret,    setSecret]    = useState(null);
  const [lastResult,setLastResult]= useState(null);
  const [stats,     setStats]     = useState(()=>loadStats());

  const toggleTheme = () => {
    setIsDark(d=>{ const n=!d; saveSettings({isDark:n}); return n; });
  };

  const commitStats = (res) => {
    setStats(prev=>{
      const s = {...prev};
      s.gamesPlayed = (s.gamesPlayed||0)+1;
      if (res.result==='won') {
        s.gamesWon = (s.gamesWon||0)+1;
        s.totalScore = (s.totalScore||0)+res.score;
        s.highestScore = Math.max(s.highestScore||0, res.score);
        s.currentStreak = (s.currentStreak||0)+1;
        s.longestStreak = Math.max(s.longestStreak||0, s.currentStreak);
        if (res.category && res.category!=='twoplayer') {
          s.categoryWins = {...(s.categoryWins||{})};
          s.categoryWins[res.category] = (s.categoryWins[res.category]||0)+1;
        }
      } else {
        s.currentStreak = 0;
      }
      saveStats(s);
      return s;
    });
  };

  return (
    <div>
      {screen==='home' && (
        <HomeScreen
          onStart={cfg=>{ SFX.click(); setGameCfg(cfg); setSecret(null); setScreen(cfg.mode==='twoplayer'?'entry':'game'); }}
          stats={stats} isDark={isDark} toggleTheme={toggleTheme}
          onStats={()=>setScreen('stats')}
        />
      )}
      {screen==='entry' && (
        <WordEntryScreen onSubmit={w=>{ setSecret(w); setScreen('game'); }} isDark={isDark} />
      )}
      {screen==='game' && gameCfg && (
        <GameScreen
          key={`${Date.now()}`}
          settings={gameCfg} secretWord={secret}
          onEnd={res=>{ commitStats(res); setLastResult(res); setScreen('over'); }}
          isDark={isDark} toggleTheme={toggleTheme}
        />
      )}
      {screen==='over' && lastResult && (
        <GameOverScreen
          result={lastResult}
          onAgain={()=>{ setSecret(null); setScreen(gameCfg?.mode==='twoplayer'?'entry':'game'); }}
          onHome={()=>setScreen('home')}
          isDark={isDark}
        />
      )}
      {screen==='stats' && (
        <StatsScreen stats={stats} onBack={()=>setScreen('home')} isDark={isDark} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
