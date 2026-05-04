import { useState, useEffect, useRef, useCallback } from "react";

// ─── Storage ────────────────────────────────────────────────────────────────
const GAME_KEY = "rummy-game-v1";
const HIST_KEY = "rummy-history-v1";
const POLL_MS  = 2500;

// היסטוריה — נשמרת ב-localStorage (קבועה לתמיד)
function histLoad() {
  try { const v=localStorage.getItem(HIST_KEY); return v?JSON.parse(v):[]; } catch { return []; }
}
function histSave(data) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(data)); } catch {}
}

// מצב משחק — נשמר ב-localStorage לסינכרון בסיסי
async function sharedGet(key) {
  try { const v=localStorage.getItem(key); return v?JSON.parse(v):null; } catch { return null; }
}
async function sharedSet(key,val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_NAMES = ["עומרי","ליאל","אלירן","אביעד","עידן"];
const SUITS = ["♠","♣","♦","♥"];
const SUIT_COLORS = {"♠":"#cbd5e1","♣":"#cbd5e1","♦":"#f87171","♥":"#f87171"};
const SUIT_NAMES = {"♠":"ספייד","♣":"תלתן","♦":"יהלום","♥":"לב"};
const SUIT_MULT = {"♠":1,"♣":1,"♦":2,"♥":3}; // relative to base: same suit=3x, diamond=2x, other=1x
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const VALUE_SCORES = {A:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13};

const C = {
  bg:"#060e1a", surface:"#0c1829", card:"#101f35", border:"#1a3050",
  borderLight:"#243d5a", text:"#e2e8f0", muted:"#4a6080",
  green:"#22c55e", red:"#ef4444", amber:"#f59e0b", accent:"#0ea5e9",
};

// ─── Phone Numpad (1,2,3 top row) ────────────────────────────────────────────
function Numpad({ value, onChange, onConfirm, label }) {
  // Phone layout: 1 2 3 / 4 5 6 / 7 8 9 / ⌫ 0 ✓
  const rows = [["1","2","3"],["4","5","6"],["7","8","9"],["⌫","0","✓"]];
  const press = (k) => {
    if (k==="⌫") { onChange(value.slice(0,-1)); return; }
    if (k==="✓") { onConfirm(); return; }
    if (value.length>=3) return;
    onChange(value===""||value==="0" ? k : value+k);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      {label&&<div style={{color:C.muted,fontSize:13,textAlign:"center"}}>{label}</div>}
      <div style={{
        background:C.bg,border:`2px solid ${C.accent}`,borderRadius:14,
        padding:"10px 40px",fontSize:46,fontWeight:900,color:C.text,
        minWidth:170,textAlign:"center",letterSpacing:4,fontVariantNumeric:"tabular-nums",
      }}>{value===""?"0":value}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,width:234,direction:"ltr"}}>
        {rows.map((row,ri)=>(
          <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {row.map(k=>(
              <button key={k} onClick={()=>press(k)} style={{
                background:k==="✓"?C.green:k==="⌫"?"#1a2a3a":C.card,
                border:`1px solid ${k==="✓"?C.green:C.border}`,
                borderRadius:14,padding:"16px 0",
                color:k==="✓"?"#fff":k==="⌫"?C.muted:C.text,
                fontSize:k==="✓"||k==="⌫"?20:24,fontWeight:700,cursor:"pointer",
              }}
              onPointerDown={e=>e.currentTarget.style.transform="scale(0.92)"}
              onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}
              >{k}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CardPicker (value + suit, value blocks taken) ────────────────────────────
function CardPicker({ value, onChange, takenValues=[], playerName }) {
  const [selVal, setSelVal] = useState(value?.val||null);
  return (
    <div style={{direction:"rtl"}}>
      <div style={{color:C.muted,fontSize:12,marginBottom:10}}>קלף של {playerName}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {VALUES.map(v=>{
          const blocked=takenValues.includes(v);
          return (
            <button key={v} onClick={()=>!blocked&&setSelVal(v===selVal?null:v)} style={{
              background:selVal===v?C.accent:C.card,
              border:`1px solid ${selVal===v?C.accent:C.border}`,
              borderRadius:10,padding:"9px 12px",
              color:blocked?C.muted:C.text,
              fontSize:15,fontWeight:700,cursor:blocked?"not-allowed":"pointer",
              opacity:blocked?0.3:1,minWidth:42,
            }}>{v}</button>
          );
        })}
      </div>
      {selVal&&(
        <>
          <div style={{color:C.muted,fontSize:12,marginBottom:8}}>בחר סוויט</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            {SUITS.map(s=>{
              const sel=value?.val===selVal&&value?.suit===s;
              return (
                <button key={s} onClick={()=>onChange({val:selVal,suit:s})} style={{
                  background:sel?C.accent:C.card,border:`2px solid ${sel?C.accent:C.border}`,
                  borderRadius:12,padding:"11px 16px",color:SUIT_COLORS[s],
                  fontSize:24,cursor:"pointer",fontWeight:700,textAlign:"center",
                }}>{s}<div style={{fontSize:10,color:sel?"#fff":C.muted,marginTop:2}}>{SUIT_NAMES[s]}</div></button>
              );
            })}
          </div>
        </>
      )}
      {value&&<div style={{textAlign:"center",marginTop:10,color:C.accent,fontWeight:700,fontSize:15}}>✓ {value.val}{value.suit}</div>}
    </div>
  );
}

// ─── Money badge ──────────────────────────────────────────────────────────────
function Money({v,size=14}) {
  if(v===0) return <span style={{color:C.muted,fontSize:size}}>0₪</span>;
  return <span style={{color:v>0?C.green:C.red,fontWeight:700,fontSize:size}}>{v>0?"+":""}{v}₪</span>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const blankPersonal = () => ({
  joker:0, card:0, consec:0, firstWin:0, gameBet:0, circles:0,
  roundLog:[],
});
const personalTotal = p => p.joker+p.card+p.consec+p.firstWin+p.gameBet+p.circles;

// ══════════════════════════════════════════════════════════════════════════════
export default function RummyApp() {
  // ── Setup state ──
  const [phase, setPhase]     = useState("setup");
  const [playerCount, setPlayerCount] = useState(5);
  const [names, setNames]     = useState([...DEFAULT_NAMES]);
  const [cards, setCards]     = useState([null,null,null,null,null]);
  const [editingCard, setEditingCard] = useState(null);
  // circleBets[i][j] and cardBets[i][j] — both symmetric, default 50
  const [circleBets, setCircleBets] = useState(()=>Array(5).fill(null).map(()=>Array(5).fill(50)));
  const [cardBets,   setCardBets]   = useState(()=>Array(5).fill(null).map(()=>Array(5).fill(50)));
  // Setup UI: which player is expanded, which rivals selected, which field editing
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [selectedRivals, setSelectedRivals] = useState([]);
  const [betEditField, setBetEditField] = useState(null); // "circle"|"card"
  const [betInput, setBetInput] = useState("");

  // ── Game state ──
  const [scores, setScores]         = useState([]);
  const [eliminated, setEliminated] = useState([]);
  const [pot, setPot]               = useState(0);   // communal pot (circles only)
  const [personal, setPersonal]     = useState([]);  // per-player personal ledger
  const [dealer, setDealer]         = useState(0);
  const [roundNum, setRoundNum]     = useState(1);
  const [consec, setConsec]         = useState({player:-1,count:0});
  const [firstWon, setFirstWon]     = useState(false);
  const [roundHistory, setRoundHistory] = useState([]);
  const [isDouble, setIsDouble]     = useState(false);
  const [dealerOrder, setDealerOrder] = useState([]); // סדר חלוקה לפי קלפים // true after a parish round

  // ── Round modal ──
  const [modal, setModal]           = useState(null);
  const [step, setStep]             = useState("winner");
  const [roundWinner, setRoundWinner] = useState(-1);
  const [scoreInputs, setScoreInputs] = useState([]);
  const [scoreIdx, setScoreIdx]     = useState(0);
  const [jokerActive, setJokerActive] = useState(false);
  const [jokerOwner, setJokerOwner]   = useState(-1);
  const [cardFell, setCardFell]       = useState(null); // {receiver, suit}

  // ── Endgame ──
  const [egWinner, setEgWinner]     = useState(-1);
  const [egBets, setEgBets]         = useState({});
  const [egBetInput, setEgBetInput] = useState("");
  const [egBetPlayer, setEgBetPlayer] = useState(0);

  // ── Detail view ──
  const [viewPlayer, setViewPlayer] = useState(null);

  // ── Shared state sync ──────────────────────────────────────────────────────
  const [isManager, setIsManager] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [allHistory, setAllHistory] = useState([]); // cross-game history
  const [historyView, setHistoryView] = useState(false);
  const lastSaveRef = useRef(0);

  // Build a snapshot of current game state
  const buildSnapshot = useCallback(() => ({
    phase, playerCount, names, cards: cards.map(c=>c),
    scores, eliminated, pot, personal, dealer, roundNum,
    consec, firstWon, isDouble, roundHistory, dealerOrder,
    egWinner, ts: Date.now(),
  }), [phase, playerCount, names, cards, scores, eliminated, pot, personal,
      dealer, roundNum, consec, firstWon, isDouble, roundHistory, dealerOrder, egWinner]);

  // Apply a snapshot from storage
  function applySnapshot(s) {
    if(!s) return;
    if(s.phase!==undefined) setPhase(s.phase);
    if(s.playerCount!==undefined) setPlayerCount(s.playerCount);
    if(s.names!==undefined) setNames(s.names);
    if(s.cards!==undefined) setCards(s.cards);
    if(s.scores!==undefined) setScores(s.scores);
    if(s.eliminated!==undefined) setEliminated(s.eliminated);
    if(s.pot!==undefined) setPot(s.pot);
    if(s.personal!==undefined) setPersonal(s.personal);
    if(s.dealer!==undefined) setDealer(s.dealer);
    if(s.roundNum!==undefined) setRoundNum(s.roundNum);
    if(s.consec!==undefined) setConsec(s.consec);
    if(s.firstWon!==undefined) setFirstWon(s.firstWon);
    if(s.isDouble!==undefined) setIsDouble(s.isDouble);
    if(s.roundHistory!==undefined) setRoundHistory(s.roundHistory);
    if(s.dealerOrder!==undefined) setDealerOrder(s.dealerOrder);
    if(s.egWinner!==undefined) setEgWinner(s.egWinner);
  }

  // Load history from localStorage on mount (persistent)
  useEffect(() => {
    setAllHistory(histLoad());
  }, []);

  // Manager saves state explicitly after each action (not via useEffect)
  async function syncState(overrides={}) {
    if(!isManager) return;
    const snap = {
      phase, playerCount, names, cards,
      scores, eliminated, pot, personal, dealer, roundNum,
      consec, firstWon, isDouble, roundHistory, dealerOrder, egWinner,
      ...overrides, ts: Date.now(),
    };
    await sharedSet(GAME_KEY, snap);
  }

  // Non-manager polls for updates
  useEffect(() => {
    if(isManager) return;
    const id = setInterval(async () => {
      const snap = await sharedGet(GAME_KEY);
      if(snap) applySnapshot(snap);
      const hist = await sharedGet(HIST_KEY);
      if(hist) setAllHistory(hist);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isManager]);

  const n = playerCount;
  const pNames = names.slice(0,n);
  const pCards  = cards.slice(0,n);
  const activeIdxs = Array.from({length:n},(_,i)=>i).filter(i=>!eliminated[i]);

  // ── START GAME ──────────────────────────────────────────────────────────────
  function startGame() {
    if (pNames.some(nm=>!nm.trim())) return alert("נא להזין שמות לכל השחקנים");
    if (new Set(pNames.map(x=>x.trim().toLowerCase())).size!==n) return alert("שמות חייבים להיות שונים");
    // סדר חלוקה: ממיין לפי ערך הקלף (אס=1 הכי נמוך), שחקן ללא קלף בסוף
    const order = Array.from({length:n},(_,i)=>i).sort((a,b)=>{
      const va = pCards[a] ? VALUE_SCORES[pCards[a].val] : 999;
      const vb = pCards[b] ? VALUE_SCORES[pCards[b].val] : 999;
      return va - vb;
    });
    const fd = order[0]; // הראשון בסדר מתחיל לחלק
    setDealerOrder(order);
    setScores(Array(n).fill(0));
    setEliminated(Array(n).fill(false));
    setPot(0);
    setPersonal(Array(n).fill(null).map(blankPersonal));
    setDealer(fd);
    setRoundNum(1);
    setConsec({player:-1,count:0});
    setFirstWon(false);
    setIsDouble(false);
    setRoundHistory([]);
    setPhase("game");
  }

  // ── PARISH (פריש) ────────────────────────────────────────────────────────────
  function doParish() {
    const order = dealerOrder.filter(i=>!eliminated[i]);
    const idx = order.indexOf(dealer);
    const d = order[(idx+1) % order.length];
    setDealer(d);
    setIsDouble(true);
    setRoundHistory(prev=>[...prev,{
      round:roundNum, winner:-1, parish:true,
      cols:Array.from({length:n},(_,i)=>({score:scores[i],added:null,circles:0})),
    }]);
    setRoundNum(r=>r+1);
  }

  // ── OPEN ROUND ──────────────────────────────────────────────────────────────
  function openRound() {
    setRoundWinner(-1);
    setScoreInputs(activeIdxs.map(i=>({idx:i,didntDrop:false,pts:""})));
    setScoreIdx(0);
    setJokerActive(false);
    setJokerOwner(-1);
    setCardFell(null);
    setStep("winner");
    setModal("round");
  }

  // ── PROCESS ROUND ────────────────────────────────────────────────────────────
  function processRound() {
    const W = roundWinner;
    const scoresBefore = [...scores]; // snapshot BEFORE any changes
    let ns  = [...scores];
    let ne  = [...eliminated];
    let np  = [...personal].map(p=>({...p,roundLog:[...p.roundLog]}));
    let newPot = pot;
    const still = Array.from({length:n},(_,i)=>i).filter(i=>!ne[i]);

    // 1. Apply raw scores (×2 if after parish)
    const mult = isDouble ? 2 : 1;
    scoreInputs.forEach(({idx,didntDrop,pts})=>{
      if(idx===W) return;
      const add = (didntDrop?100:(parseInt(pts)||0)) * mult;
      ns[idx] += add;
      if(ns[idx] < 2) ns[idx] = 2; // מינימום 2, רק המנצח יכול להיות על 0
    });
    setIsDouble(false);

    // 2. First win bonus (personal)
    if(!firstWon){
      setFirstWon(true);
      still.forEach(i=>{
        if(i!==W){
          np[i].firstWin-=50;
          np[i].roundLog.push({round:roundNum,label:"תשלום ניצחון ראשון",val:-50});
        } else {
          const gain=50*(still.length-1);
          np[i].firstWin+=gain;
          np[i].roundLog.push({round:roundNum,label:"בונוס ניצחון ראשון",val:gain});
        }
      });
    }

    // 3. Consecutive wins (personal)
    const nc = consec.player===W
      ? {player:W,count:consec.count+1}
      : {player:W,count:1};
    setConsec(nc);
    if(nc.count>=3){
      const b = nc.count===3?50:100;
      still.forEach(i=>{
        if(i!==W){
          np[i].consec-=b;
          np[i].roundLog.push({round:roundNum,label:`תשלום ${nc.count} רצופים`,val:-b});
        } else {
          const gain=b*(still.length-1);
          np[i].consec+=gain;
          np[i].roundLog.push({round:roundNum,label:`בונוס ${nc.count} רצופים`,val:gain});
        }
      });
    }

    // 4. Joker — always goes to round winner
    if(jokerActive){
      still.forEach(i=>{
        if(i!==W){
          np[i].joker-=100;
          np[i].roundLog.push({round:roundNum,label:`ג'וקר ל${pNames[W]}`,val:-100});
        } else {
          const gain=100*(still.length-1);
          np[i].joker+=gain;
          np[i].roundLog.push({round:roundNum,label:"ג'וקר חופשי",val:gain});
        }
      });
    }

    // 5. Card fell (personal)
    // שחקן ללא קלף מוגדר לא משתתף — לא משלם ולא מקבל
    if(cardFell?.receiver!=null && cardFell?.suit){
      const recv = cardFell.receiver;
      const myCard = pCards[recv];
      if(myCard){
        const redSuits = ["♦","♥"], blackSuits = ["♠","♣"];
        const isExact = cardFell.suit===myCard.suit;
        const sameColor = (redSuits.includes(cardFell.suit)&&redSuits.includes(myCard.suit)) ||
                          (blackSuits.includes(cardFell.suit)&&blackSuits.includes(myCard.suit));
        let lbl="";
        // רק שחקנים שיש להם קלף מוגדר משתתפים
        still.filter(i=>i!==recv && pCards[i]!=null).forEach(i=>{
          let amt;
          if(isExact){
            amt = cardBets[Math.min(i,recv)][Math.max(i,recv)]||50;
            lbl="בינגו! קלף מדויק";
          } else if(sameColor){
            amt = 100;
            lbl="אותו צבע!";
          } else {
            amt = 50;
            lbl="צבע שונה";
          }
          np[i].card-=amt;
          np[recv].card+=amt;
          np[i].roundLog.push({round:roundNum,label:`${lbl} ל${pNames[recv]}`,val:-amt});
          np[recv].roundLog.push({round:roundNum,label:`${lbl} מ${pNames[i]}`,val:amt});
        });
      }
    }

    // 6. עיגולים
    const circleCount = Array(n).fill(0);
    const didCircle = Array(n).fill(false);

    // פונקציה: מי פעיל (לא הוסר ולא המנצח)
    const active = () => Array.from({length:n},(_,i)=>i).filter(i=>!ne[i]&&i!==W);

    // 6a. עיגול רגיל: מי שעל 151+ עיגל לגבוה מבין הבטוחים
    // בדוק קודם: אם כולם (לא המנצח) על 151+ → משחק נגמר
    const allActiveNow = Array.from({length:n},(_,i)=>i).filter(i=>!ne[i]);
    const everyoneOver = allActiveNow.every(i=>i===W||ns[i]>=151);
    if(everyoneOver && allActiveNow.length>1){
      allActiveNow.forEach(i=>{ if(i!==W) ne[i]=true; });
    } else {
      for(let iter=0;iter<20;iter++){
        const over151 = active().filter(i=>ns[i]>=151);
        if(over151.length===0) break;
        const under151 = active().filter(i=>ns[i]<151);
        if(under151.length===0){ active().forEach(i=>{ if(i!==W) ne[i]=true; }); break; }
        const player = over151[0];
        const hi = Math.max(2, ...under151.map(j=>ns[j]));
        console.log(`עיגול: ${pNames[player]}(${ns[player]}) → ${hi}. under151: ${under151.map(j=>pNames[j]+'='+ns[j]).join(',')}`);
        ns[player]=hi; newPot+=50; circleCount[player]++; didCircle[player]=true;
        np[player].circles-=50;
        np[player].roundLog.push({round:roundNum,label:`עיגול ל-${hi} → קופה`,val:-50});
      }
    }

    // 6b. עיגול חובה
    // under51 = כל שחקן פעיל (כולל המנצח!) שעל פחות מ-51
    // המנצח תמיד על 0 ונספר — הוא קובע אם יש עיגול חובה
    // אבל המנצח לא עוגל — רק השאר
    const allActivePlayers = Array.from({length:n},(_,i)=>i).filter(i=>!ne[i]);
    const under51 = allActivePlayers.filter(i=>ns[i]<51); // כולל המנצח!
    const over51notCircled = allActivePlayers.filter(i=>i!==W&&ns[i]>=51&&ns[i]<151&&!didCircle[i]);
    if(under51.length>=2 && over51notCircled.length>0){
      // עוגלים לגבוה מבין מי שמתחת ל-51, לא כולל המנצח (שהוא תמיד 0)
      const under51others = under51.filter(i=>i!==W);
      const hi51 = under51others.length>0
        ? Math.max(...under51others.map(j=>ns[j]))
        : 2; // מינימום 2
      over51notCircled.forEach(i=>{
        ns[i] = Math.max(hi51, 2);
        newPot+=50;
        circleCount[i]++;
        didCircle[i]=true;
        np[i].circles-=50;
        np[i].roundLog.push({round:roundNum,label:`עיגול חובה ל-${hi51} → קופה`,val:-50});
      });
    }

    // 7. Build round history row
    const histRow = {
      round: roundNum,
      winner: W,
      pot: newPot,
      isDouble: mult===2,
      cols: Array.from({length:n},(_,i)=>{
        if(ne[i]&&!didCircle[i]&&scoresBefore[i]===scores[i]&&i!==W) return {score:ns[i],added:null,circles:0};
        if(i===W) return {score:ns[i],added:0,won:true,circles:circleCount[i]||0};
        const si=scoreInputs.find(x=>x.idx===i);
        const rawAdd = si?.didntDrop?100:(parseInt(si?.pts)||0);
        return {
          score:ns[i],
          added: rawAdd*mult,
          didntDrop:si?.didntDrop||false,
          circles:circleCount[i]||0,
        };
      }),
    };

    // 8. Next dealer — לפי סדר הקלפים שהורמו, מדלג על מי שהוסר
    const nextDealer = (currentDealer) => {
      const order = dealerOrder.filter(i=>!ne[i]);
      if(order.length===0) return currentDealer;
      const idx = order.indexOf(currentDealer);
      return order[(idx+1) % order.length];
    };
    const d = nextDealer(dealer);

    setScores(ns);setEliminated(ne);setPot(newPot);setPersonal(np);setDealer(d);
    setRoundHistory(prev=>[...prev,histRow]);
    setRoundNum(r=>r+1);
    setModal(null);

    // שמירה מפורשת עם הערכים הנכונים
    sharedSet(GAME_KEY, {
      phase, playerCount, names, cards, egWinner,
      scores:ns, eliminated:ne, pot:newPot, personal:np, dealer:d,
      roundNum:roundNum+1, consec:nc, firstWon:!firstWon?true:firstWon,
      isDouble:false, roundHistory:[...roundHistory,histRow], dealerOrder,
      ts:Date.now(),
    });

    const rem=Array.from({length:n},(_,i)=>i).filter(i=>!ne[i]);
    if(rem.length===1){
      setTimeout(()=>{
        setEgWinner(rem[0]);
        setEgBets(Object.fromEntries(Array.from({length:n},(_,i)=>[i,0])));
        setEgBetInput(""); setEgBetPlayer(0);
        setModal("endgame");
      },300);
    }
  }

  function finishGame() {
    const np=[...personal].map(p=>({...p,roundLog:[...p.roundLog]}));
    const payers = Array.from({length:n},(_,i)=>i).filter(i=>i!==egWinner);
    const totalBetsVal = payers.reduce((s,i)=>s+(parseInt(egBets[i])||0),0);
    payers.forEach(i=>{
      const bet=parseInt(egBets[i])||0;
      np[i].gameBet-=bet;
      np[i].roundLog.push({round:"סוף",label:"עלות משחק",val:-bet});
    });
    // Save to cross-game history
    const winnerCirclesRefund = Math.abs(np[egWinner].circles); // כמה שילם לקופה
    np[egWinner].circles = 0;
    np[egWinner].roundLog = np[egWinner].roundLog.filter(e=>!e.label.includes("עיגול"));
    // המנצח מקבל את הקופה פחות העיגולים שלו (שמוחזרים לו דרך הביטול)
    const potAfterWinnerRefund = pot - winnerCirclesRefund;
    np[egWinner].gameBet += totalBetsVal + potAfterWinnerRefund;
    // נדרס את הרשומה הקודמת
    const lastLog = np[egWinner].roundLog.findIndex(e=>e.label==="קופה + עלויות");
    if(lastLog!==-1) np[egWinner].roundLog.splice(lastLog,1);
    np[egWinner].roundLog.push({round:"סוף",label:"קופה + עלויות",val:totalBetsVal+potAfterWinnerRefund});

    // Save to cross-game history — circles from np (already zeroed for winner)
    const gameRecord = {
      date: new Date().toLocaleDateString("he-IL"),
      dateTs: Date.now(),
      winner: names[egWinner],
      players: Array.from({length:n},(_,i)=>({
        name: names[i],
        total: personalTotal(np[i]),
        circles: i===egWinner ? 0 : Math.abs(np[i].circles/50), // מספר עיגולים
        joker: np[i].joker,
        card: np[i].card,
        bonuses: np[i].consec+np[i].firstWin,
        gameBet: np[i].gameBet,
        finalScore: scores[i],
        won: i===egWinner,
      })),
      rounds: roundNum-1,
      potTotal: pot,
    };
    const newHistory = [...allHistory, gameRecord];
    setAllHistory(newHistory);
    histSave(newHistory); // שמירה קבועה ב-localStorage
    sharedSet(HIST_KEY, newHistory); // גם shared לסינכרון

    setPersonal(np);
    setPhase("summary");
    setModal(null);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORY SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if(historyView) {
    // Aggregate by player name
    const playerStats = {};
    allHistory.forEach(game=>{
      game.players.forEach(p=>{
        if(!playerStats[p.name]) playerStats[p.name]={name:p.name,games:0,wins:0,totalMoney:0,circles:0,joker:0,card:0,bonuses:0};
        const ps=playerStats[p.name];
        ps.games++; ps.wins+=p.won?1:0; ps.totalMoney+=p.total;
        ps.circles+=p.circles; ps.joker+=p.joker; ps.card+=p.card; ps.bonuses+=p.bonuses;
      });
    });
    const players = Object.values(playerStats).sort((a,b)=>b.totalMoney-a.totalMoney);

    return (
      <div style={{minHeight:"100vh",background:C.bg,direction:"rtl",fontFamily:"'Segoe UI',sans-serif",padding:14,paddingBottom:40}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 16px"}}>
            <h1 style={{color:C.text,fontSize:20,fontWeight:900,margin:0}}>📊 היסטוריה</h1>
            <button onClick={()=>setHistoryView(false)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>← חזור</button>
          </div>

          {/* All-time player stats */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",marginBottom:16}}>
            <div style={{padding:"10px 14px",background:C.card,borderBottom:`1px solid ${C.border}`,color:C.text,fontWeight:700,fontSize:14}}>
              🏅 סיכום שחקנים — כל הזמנים
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",width:"100%",minWidth:480}}>
                <thead>
                  <tr style={{background:C.card}}>
                    {["שחקן","משחקים","נצחונות","כסף","עיגולים","ג׳וקר","קלף","בונוס"].map(h=>(
                      <th key={h} style={{padding:"8px 8px",color:C.muted,fontSize:11,fontWeight:600,textAlign:"center",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players.map((p,pi)=>(
                    <tr key={p.name} style={{borderTop:`1px solid ${C.border}`,background:pi===0?"rgba(251,191,36,0.05)":"transparent"}}>
                      <td style={{padding:"9px 8px",fontWeight:700,color:pi===0?"#fbbf24":C.text,fontSize:13}}>{pi===0?"🏆":""}{p.name}</td>
                      <td style={{padding:"9px 8px",textAlign:"center",color:C.muted,fontSize:13}}>{p.games}</td>
                      <td style={{padding:"9px 8px",textAlign:"center",color:C.green,fontSize:13,fontWeight:700}}>{p.wins}</td>
                      <td style={{padding:"9px 8px",textAlign:"center",fontSize:13,fontWeight:800,color:p.totalMoney>=0?C.green:C.red}}>{p.totalMoney>=0?"+":""}{p.totalMoney}₪</td>
                      <td style={{padding:"9px 8px",textAlign:"center",color:C.red,fontSize:13}}>{p.circles>0?`🔴${p.circles}`:"—"}</td>
                      <td style={{padding:"9px 8px",textAlign:"center",fontSize:12,color:p.joker>=0?C.green:C.red}}>{p.joker>=0?"+":""}{p.joker}₪</td>
                      <td style={{padding:"9px 8px",textAlign:"center",fontSize:12,color:p.card>=0?C.green:C.red}}>{p.card>=0?"+":""}{p.card}₪</td>
                      <td style={{padding:"9px 8px",textAlign:"center",fontSize:12,color:p.bonuses>=0?C.green:C.red}}>{p.bonuses>=0?"+":""}{p.bonuses}₪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Game by game */}
          <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:10}}>📅 לפי משחקים</div>
          {[...allHistory].reverse().map((game,gi)=>{
            const realIdx = allHistory.length-1-gi;
            return (
            <div key={gi} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.card,borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <span style={{color:"#fbbf24",fontWeight:700,fontSize:14}}>🏆 {game.winner}</span>
                  <span style={{color:C.muted,fontSize:12,marginRight:8}}>{game.rounds} סיבובים</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:C.muted,fontSize:12}}>{game.date}</span>
                  <button onClick={()=>{
                    if(!window.confirm("למחוק משחק זה?")) return;
                    const updated=allHistory.filter((_,idx)=>idx!==realIdx);
                    setAllHistory(updated);
                    histSave(updated);
                    sharedSet(HIST_KEY,updated);
                  }} style={{
                    background:"rgba(239,68,68,0.15)",border:"1px solid #ef4444",
                    borderRadius:8,padding:"4px 10px",color:C.red,
                    fontSize:12,cursor:"pointer",fontWeight:700,
                  }}>מחק</button>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{borderCollapse:"collapse",width:"100%"}}>
                  <thead>
                    <tr>
                      {["שחקן","כסף","עיגולים","ג׳וקר","קלף"].map(h=>(
                        <th key={h} style={{padding:"6px 8px",color:C.muted,fontSize:11,textAlign:"center"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {game.players.map((p,pi)=>(
                      <tr key={pi} style={{borderTop:`1px solid ${C.border}`,background:p.won?"rgba(251,191,36,0.04)":"transparent"}}>
                        <td style={{padding:"7px 8px",fontWeight:700,color:p.won?"#fbbf24":C.text,fontSize:13}}>{p.won?"🏆":""}{p.name}</td>
                        <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,fontSize:13,color:p.total>=0?C.green:C.red}}>{p.total>=0?"+":""}{p.total}₪</td>
                        <td style={{padding:"7px 8px",textAlign:"center",color:C.red,fontSize:12}}>{p.circles>0?`🔴${p.circles}`:"—"}</td>
                        <td style={{padding:"7px 8px",textAlign:"center",fontSize:12,color:p.joker>=0?C.green:C.red}}>{p.joker>=0?"+":""}{p.joker}₪</td>
                        <td style={{padding:"7px 8px",textAlign:"center",fontSize:12,color:p.card>=0?C.green:C.red}}>{p.card>=0?"+":""}{p.card}₪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
          })}
          {allHistory.length===0&&<div style={{textAlign:"center",color:C.muted,padding:40}}>אין משחקים שמורים עדיין</div>}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SETUP SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if(phase==="setup") return (
    <div style={{minHeight:"100vh",background:C.bg,direction:"rtl",fontFamily:"'Segoe UI',sans-serif",padding:16,paddingBottom:40}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",padding:"20px 0 14px"}}>
          <div style={{fontSize:48}}>🃏</div>
          <h1 style={{color:C.text,fontSize:24,fontWeight:900,margin:"6px 0 0"}}>רמי</h1>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10}}>
            <button onClick={()=>setIsManager(m=>!m)} style={{
              background:isManager?"rgba(34,197,94,0.15)":C.card,
              border:`1px solid ${isManager?C.green:C.border}`,
              borderRadius:10,padding:"6px 14px",
              color:isManager?C.green:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",
            }}>{isManager?"✓ מנהל":"צופה"}</button>
            <button onClick={()=>setHistoryView(true)} style={{
              background:C.card,border:`1px solid ${C.border}`,
              borderRadius:10,padding:"6px 14px",
              color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",
            }}>📊 היסטוריה</button>
          </div>
        </div>

        {/* Player count */}
        <div style={{display:"flex",gap:10,marginBottom:16,justifyContent:"center"}}>
          {[4,5].map(c=>(
            <button key={c} onClick={()=>setPlayerCount(c)} style={{
              background:playerCount===c?C.accent:C.card,
              border:`1px solid ${playerCount===c?C.accent:C.border}`,
              borderRadius:12,padding:"10px 28px",color:C.text,fontSize:17,fontWeight:700,cursor:"pointer",
            }}>{c} שחקנים</button>
          ))}
        </div>

        {/* Players */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {Array.from({length:n},(_,i)=>i).map(i=>{
            const takenVals=cards.slice(0,n).filter((_,j)=>j!==i&&cards[j]).map(c=>c.val);
            return (
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"12px 14px"}}>
                <div style={{color:C.muted,fontSize:11,marginBottom:6}}>שחקן {i+1}</div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input value={names[i]} onChange={e=>{const a=[...names];a[i]=e.target.value;setNames(a);}}
                    style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:16,outline:"none"}}
                  />
                  <button onClick={()=>setEditingCard(editingCard===i?null:i)} style={{
                    background:cards[i]?C.surface:C.bg,border:`1px solid ${cards[i]?C.accent:C.border}`,
                    borderRadius:10,padding:"9px 12px",
                    color:cards[i]?SUIT_COLORS[cards[i].suit]:C.muted,
                    fontSize:15,fontWeight:700,cursor:"pointer",minWidth:68,
                  }}>{cards[i]?`${cards[i].val}${cards[i].suit}`:"קלף"}</button>
                </div>
                {editingCard===i&&(
                  <div style={{marginTop:10,background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.borderLight}`}}>
                    <CardPicker value={cards[i]} takenValues={takenVals}
                      playerName={names[i]||`שחקן ${i+1}`}
                      onChange={c=>{const a=[...cards];a[i]=c;setCards(a);setEditingCard(null);}}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bet settings per player */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:14,marginBottom:18}}>
          <div style={{color:C.text,fontWeight:700,fontSize:14,marginBottom:2}}>💰 הגדרות סכומים</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:12}}>עיגול = סכום לעיגול · בינגו = קלף מדויק (50₪ צבע שונה / 100₪ אותו צבע / בינגו = סכום מוגדר)</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {Array.from({length:n},(_,i)=>i).map(i=>{
              const isExpanded = expandedPlayer===i;
              return (
                <div key={i}>
                  <button onClick={()=>{
                    setExpandedPlayer(isExpanded?null:i);
                    setSelectedRivals([]);
                    setBetEditField(null);
                    setBetInput("");
                  }} style={{
                    width:"100%",background:isExpanded?C.borderLight:C.card,
                    border:`1px solid ${isExpanded?C.accent:C.border}`,
                    borderRadius:12,padding:"12px 14px",cursor:"pointer",
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                  }}>
                    <span style={{color:C.text,fontWeight:700,fontSize:15}}>{names[i]||`שחקן ${i+1}`}</span>
                    <span style={{color:C.muted,fontSize:12}}>{isExpanded?"▲":"▼"}</span>
                  </button>

                  {isExpanded&&(
                    <div style={{background:C.card,border:`1px solid ${C.accent}`,borderRadius:12,padding:14,marginTop:4}}>
                      {/* הצג סכומים קיימים */}
                      {Array.from({length:n},(_,j)=>j).filter(j=>j!==i).some(j=>
                        circleBets[i][j]!==50||cardBets[i][j]!==50
                      )&&(
                        <div style={{marginBottom:12}}>
                          <div style={{color:C.muted,fontSize:12,marginBottom:6}}>סכומים מוגדרים:</div>
                          {Array.from({length:n},(_,j)=>j).filter(j=>j!==i&&(circleBets[i][j]!==50||cardBets[i][j]!==50)).map(j=>(
                            <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
                              <span style={{color:C.text,fontSize:13}}>{names[j]||`שחקן ${j+1}`}</span>
                              <span style={{color:C.muted,fontSize:13}}>
                                עיגול: <span style={{color:C.amber,fontWeight:700}}>{circleBets[i][j]}₪</span>
                                {" · "}בינגו: <span style={{color:C.accent,fontWeight:700}}>{cardBets[i][j]}₪</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* בחר יריב חדש — רק אם טרם הוגדר */}
                      <div style={{color:C.muted,fontSize:12,marginBottom:8}}>הגדר סכום מול יריב:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                        {Array.from({length:n},(_,j)=>j).filter(j=>j!==i).map(j=>{
                          const sel = selectedRivals.includes(j);
                          // אם כבר הוגדר מהצד האחר (j→i) — הצג כקריאה בלבד
                          const alreadySet = Math.min(i,j)<Math.max(i,j) ?
                            (circleBets[Math.min(i,j)][Math.max(i,j)]!==50||cardBets[Math.min(i,j)][Math.max(i,j)]!==50) : false;
                          return (
                            <button key={j} onClick={()=>{
                              setSelectedRivals(r=>sel?r.filter(x=>x!==j):[...r,j]);
                              setBetEditField(null); setBetInput("");
                            }} style={{
                              background:sel?C.accent:C.surface,
                              border:`1px solid ${sel?C.accent:C.border}`,
                              borderRadius:10,padding:"8px 14px",
                              color:C.text,fontSize:14,fontWeight:600,cursor:"pointer",
                            }}>{names[j]||`שחקן ${j+1}`}</button>
                          );
                        })}
                      </div>

                      {selectedRivals.length>0&&(
                        <>
                          {/* Show current values */}
                          <div style={{background:C.surface,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
                            {selectedRivals.map(j=>(
                              <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.card}`}}>
                                <span style={{color:C.muted,fontSize:13}}>מול {names[j]||`שחקן ${j+1}`}</span>
                                <span style={{color:C.text,fontSize:13}}>
                                  עיגול: <span style={{color:C.amber,fontWeight:700}}>{circleBets[i][j]}₪</span>
                                  {" · "}בינגו: <span style={{color:C.accent,fontWeight:700}}>{cardBets[i][j]}₪</span>
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Field buttons */}
                          <div style={{display:"flex",gap:8,marginBottom:12}}>
                            <button onClick={()=>{
                              setBetEditField("circle");
                              setBetInput(String(circleBets[i][selectedRivals[0]]||50));
                            }} style={{
                              flex:1,background:betEditField==="circle"?C.amber:C.surface,
                              border:`1px solid ${betEditField==="circle"?C.amber:C.border}`,
                              borderRadius:10,padding:"10px",cursor:"pointer",
                              color:betEditField==="circle"?"#000":C.text,fontWeight:700,fontSize:14,
                            }}>🔄 עיגול</button>
                            <button onClick={()=>{
                              setBetEditField("card");
                              setBetInput(String(cardBets[i][selectedRivals[0]]||50));
                            }} style={{
                              flex:1,background:betEditField==="card"?C.accent:C.surface,
                              border:`1px solid ${betEditField==="card"?C.accent:C.border}`,
                              borderRadius:10,padding:"10px",cursor:"pointer",
                              color:C.text,fontWeight:700,fontSize:14,
                            }}>🎯 בינגו</button>
                          </div>

                          {betEditField&&(
                            <>
                              <Numpad
                                value={betInput}
                                label={`${betEditField==="circle"?"עלות עיגול":"עלות קלף"} — ${names[i]} מול ${selectedRivals.map(j=>names[j]).join(", ")}`}
                                onChange={setBetInput}
                                onConfirm={()=>{
                                  const v=parseInt(betInput)||50;
                                  if(betEditField==="circle"){
                                    const nb=circleBets.map(r=>[...r]);
                                    selectedRivals.forEach(j=>{nb[i][j]=v;nb[j][i]=v;});
                                    setCircleBets(nb);
                                  } else {
                                    const nb=cardBets.map(r=>[...r]);
                                    selectedRivals.forEach(j=>{nb[i][j]=v;nb[j][i]=v;});
                                    setCardBets(nb);
                                  }
                                  setBetEditField(null); setBetInput("");
                                }}
                              />
                              <button onClick={()=>{
                                const v=parseInt(betInput)||50;
                                if(betEditField==="circle"){
                                  const nb=circleBets.map(r=>[...r]);
                                  selectedRivals.forEach(j=>{nb[i][j]=v;nb[j][i]=v;});
                                  setCircleBets(nb);
                                } else {
                                  const nb=cardBets.map(r=>[...r]);
                                  selectedRivals.forEach(j=>{nb[i][j]=v;nb[j][i]=v;});
                                  setCardBets(nb);
                                }
                                setBetEditField(null); setBetInput("");
                              }} style={{width:"100%",marginTop:10,background:`linear-gradient(135deg,${C.accent},#0369a1)`,border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>שמור</button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={startGame} style={{
          width:"100%",background:`linear-gradient(135deg,${C.accent},#0369a1)`,
          border:"none",borderRadius:14,padding:16,color:"#fff",fontSize:18,fontWeight:800,cursor:"pointer",
        }}>🚀 התחל משחק</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PLAYER DETAIL SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if(viewPlayer!==null && phase!=="setup") {
    const p = personal[viewPlayer];
    const total = personalTotal(p);
    // group roundLog by round
    const byRound = {};
    p.roundLog.forEach(e=>{
      const k=String(e.round);
      if(!byRound[k]) byRound[k]=[];
      byRound[k].push(e);
    });
    return (
      <div style={{minHeight:"100vh",background:C.bg,direction:"rtl",fontFamily:"'Segoe UI',sans-serif",padding:16,paddingBottom:40}}>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <button onClick={()=>setViewPlayer(null)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:15,marginBottom:10,padding:0}}>← חזור</button>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div>
              <h2 style={{color:C.text,fontSize:21,fontWeight:900,margin:0}}>{pNames[viewPlayer]}</h2>
              {pCards[viewPlayer]&&<div style={{color:SUIT_COLORS[pCards[viewPlayer].suit],fontSize:14,fontWeight:700,marginTop:2}}>{pCards[viewPlayer].val}{pCards[viewPlayer].suit}</div>}
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{color:C.muted,fontSize:11}}>יתרה אישית</div>
              <Money v={total} size={26}/>
            </div>
          </div>

          {/* Category summary */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"12px 16px",marginBottom:16}}>
            <div style={{color:C.muted,fontSize:12,marginBottom:8}}>סיכום לפי קטגוריה</div>
            {[
              {label:"ג'וקר",val:p.joker},
              {label:"קלף",val:p.card},
              {label:"רצף ניצחונות",val:p.consec},
              {label:"ניצחון ראשון",val:p.firstWin},
              {label:"עלות / קופה",val:p.gameBet},
            ].map((x,xi)=>(
              <div key={xi} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.card}`}}>
                <span style={{color:C.muted,fontSize:14}}>{x.label}</span>
                <Money v={x.val} size={14}/>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:6,borderTop:`1px solid ${C.borderLight}`}}>
              <span style={{color:C.text,fontWeight:800,fontSize:15}}>סה"כ</span>
              <Money v={total} size={18}/>
            </div>
          </div>

          {/* Per-round events */}
          <div style={{color:C.muted,fontSize:12,marginBottom:8}}>פירוט סיבוב סיבוב</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {Object.keys(byRound).length===0&&<div style={{color:C.muted,textAlign:"center",padding:24}}>אין פעילות</div>}
            {Object.entries(byRound).map(([rnd,events])=>{
              const rndTotal=events.reduce((s,e)=>s+e.val,0);
              return (
                <div key={rnd} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.card,borderBottom:`1px solid ${C.border}`}}>
                    <span style={{color:C.text,fontWeight:700,fontSize:14}}>{rnd==="סוף"?"סיום משחק":`סיבוב ${rnd}`}</span>
                    <Money v={rndTotal} size={15}/>
                  </div>
                  <div style={{padding:"8px 14px 10px"}}>
                    {events.map((e,ei)=>(
                      <div key={ei} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.card}`}}>
                        <span style={{color:C.muted,fontSize:13}}>{e.label}</span>
                        <Money v={e.val} size={13}/>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if(phase==="summary") {
    // חישוב מספר עיגולים לכל שחקן מהיסטוריה
    const totalCircles = Array(n).fill(0);
    roundHistory.forEach(row=>{
      if(row.parish) return;
      row.cols?.forEach((col,i)=>{ totalCircles[i]+=(col.circles||0); });
    });

    return (
    <div style={{minHeight:"100vh",background:C.bg,direction:"rtl",fontFamily:"'Segoe UI',sans-serif",padding:16,paddingBottom:40}}>
      <div style={{maxWidth:520,margin:"0 auto"}}>
        <div style={{textAlign:"center",padding:"20px 0 14px"}}>
          <div style={{fontSize:48}}>🏆</div>
          <h1 style={{color:"#fbbf24",fontSize:24,fontWeight:900,margin:"6px 0 2px"}}>{pNames[egWinner]} ניצח!</h1>
          <div style={{color:C.muted,fontSize:13}}>סיכום סופי</div>
        </div>

        {/* Main summary table */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 44px 48px 48px 48px 48px 48px 60px",background:C.card,padding:"10px 10px",borderBottom:`1px solid ${C.border}`,gap:2}}>
            {["שחקן","ניקוד","עיגולים","ג׳וקר","קלף","בונוס","קופה/כניסה","סה״כ"].map((h,hi)=>(
              <div key={hi} style={{color:C.muted,fontSize:11,fontWeight:600,textAlign:"center"}}>{h}</div>
            ))}
          </div>

          {Array.from({length:n},(_,i)=>i).map(i=>{
            const p = personal[i];
            const total = personalTotal(p);
            const isWinner = i===egWinner;
            const bonuses = p.consec+p.firstWin;
            return (
              <button key={i} onClick={()=>setViewPlayer(i)} style={{
                display:"grid",gridTemplateColumns:"1fr 44px 48px 48px 48px 48px 48px 60px",
                padding:"12px 10px",gap:2,
                borderBottom:`1px solid ${C.border}`,
                background:isWinner?"rgba(251,191,36,0.06)":"transparent",
                cursor:"pointer",width:"100%",border:"none",
                borderBottom:`1px solid ${C.border}`,
              }}>
                <div style={{textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {isWinner&&<span style={{fontSize:14}}>🏆</span>}
                    <span style={{color:isWinner?"#fbbf24":C.text,fontWeight:800,fontSize:14}}>{pNames[i]}</span>
                  </div>
                  {pCards[i]&&<div style={{color:SUIT_COLORS[pCards[i].suit],fontSize:11}}>{pCards[i].val}{pCards[i].suit}</div>}
                </div>
                <div style={{textAlign:"center",color:C.muted,fontSize:13,fontWeight:600,paddingTop:2}}>{scores[i]}</div>
                <div style={{textAlign:"center",paddingTop:2}}>
                  {totalCircles[i]>0
                    ? <span style={{color:C.red,fontSize:12,fontWeight:700}}>🔴{totalCircles[i]}<br/><Money v={p.circles} size={11}/></span>
                    : <span style={{color:C.muted,fontSize:12}}>—</span>}
                </div>
                <div style={{textAlign:"center",paddingTop:2}}><Money v={p.joker} size={12}/></div>
                <div style={{textAlign:"center",paddingTop:2}}><Money v={p.card} size={12}/></div>
                <div style={{textAlign:"center",paddingTop:2}}><Money v={bonuses} size={12}/></div>
                <div style={{textAlign:"center",paddingTop:2}}><Money v={p.gameBet} size={12}/></div>
                <div style={{textAlign:"center",paddingTop:2}}><Money v={total} size={15}/></div>
              </button>
            );
          })}

          <div style={{display:"grid",gridTemplateColumns:"1fr 44px 48px 48px 48px 48px 48px 60px",padding:"10px 10px",gap:2,background:C.card,borderTop:`2px solid ${C.borderLight}`}}>
            <div style={{color:C.text,fontWeight:700,fontSize:13}}>סה״כ</div>
            <div/>
            <div style={{textAlign:"center",color:C.red,fontWeight:700,fontSize:12}}>🔴{totalCircles.reduce((a,b)=>a+b,0)}</div>
            <div style={{textAlign:"center"}}><Money v={Array.from({length:n},(_,i)=>i).reduce((s,i)=>s+personal[i].joker,0)} size={12}/></div>
            <div style={{textAlign:"center"}}><Money v={Array.from({length:n},(_,i)=>i).reduce((s,i)=>s+personal[i].card,0)} size={12}/></div>
            <div style={{textAlign:"center"}}><Money v={Array.from({length:n},(_,i)=>i).reduce((s,i)=>s+personal[i].consec+personal[i].firstWin,0)} size={12}/></div>
            <div style={{textAlign:"center"}}><Money v={Array.from({length:n},(_,i)=>i).reduce((s,i)=>s+personal[i].gameBet,0)} size={12}/></div>
            <div style={{textAlign:"center"}}><Money v={Array.from({length:n},(_,i)=>i).reduce((s,i)=>s+personalTotal(personal[i]),0)} size={14}/></div>
          </div>
        </div>

        {/* Per player detail cards */}
        <div style={{color:C.muted,fontSize:12,marginBottom:10,textAlign:"center"}}>לחץ על שחקן לפירוט מלא</div>

        <button onClick={()=>{
          setNames([...DEFAULT_NAMES]);
          setCards([null,null,null,null,null]);
          setViewPlayer(null);
          setPhase("setup");
        }} style={{
          width:"100%",background:`linear-gradient(135deg,${C.accent},#0369a1)`,
          border:"none",borderRadius:14,padding:15,color:"#fff",fontSize:17,fontWeight:800,cursor:"pointer",
        }}>🔄 משחק חדש</button>
      </div>
    </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GAME SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:C.bg,direction:"rtl",fontFamily:"'Segoe UI',sans-serif",paddingBottom:36}}>
      <div style={{maxWidth:580,margin:"0 auto",padding:"0 10px"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0 10px"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <h1 style={{color:C.text,fontSize:19,fontWeight:900,margin:0}}>🃏 רמי {isDouble&&<span style={{color:C.amber,fontSize:14}}>×2</span>}</h1>
              <button onClick={()=>setIsManager(m=>!m)} style={{
                background:isManager?"rgba(34,197,94,0.15)":C.card,
                border:`1px solid ${isManager?C.green:C.border}`,
                borderRadius:8,padding:"3px 10px",
                color:isManager?C.green:C.muted,fontSize:11,fontWeight:700,cursor:"pointer",
              }}>{isManager?"✓ מנהל":"👁 צופה"}</button>
            </div>
            <div style={{color:C.muted,fontSize:12}}>סיבוב {roundNum} · מחלק: <span style={{color:C.accent}}>{pNames[dealer]}</span> · קופה: <span style={{color:C.amber}}>{pot}₪</span></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setHistoryView(true)} style={{
              background:C.card,border:`1px solid ${C.border}`,
              borderRadius:13,padding:"10px 12px",
              color:C.muted,fontSize:13,cursor:"pointer",
            }}>📊</button>
            {isManager&&<button onClick={doParish} style={{
              background:C.card,border:`1px solid ${C.border}`,
              borderRadius:13,padding:"10px 14px",
              color:C.amber,fontSize:13,fontWeight:700,cursor:"pointer",
            }}>פריש</button>}
            {isManager&&<button onClick={openRound} style={{
              background:`linear-gradient(135deg,${C.green},#16a34a)`,
              border:"none",borderRadius:13,padding:"10px 16px",
              color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",
            }}>+ סיבוב</button>}
          </div>
        </div>

        {/* Current scores — tap for detail */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",marginBottom:14,boxShadow:"0 6px 24px rgba(0,0,0,0.4)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 48px 60px 68px",background:C.card,padding:"8px 12px",borderBottom:`1px solid ${C.border}`}}>
            {["שחקן","קלף","נקודות","אישי"].map(h=>(
              <div key={h} style={{color:C.muted,fontSize:11,fontWeight:600,textAlign:"center"}}>{h}</div>
            ))}
          </div>
          {(dealerOrder.length>0 ? dealerOrder.slice(0,n) : Array.from({length:n},(_,i)=>i)).map(i=>{
            const elim=eliminated[i],sc=scores[i];
            const tot=personalTotal(personal[i]||blankPersonal());
            const bar=Math.min((sc/151)*100,100);
            const bc=sc>=151?C.red:sc>=100?"#f97316":sc>=51?C.amber:C.green;
            const isD=dealer===i&&!elim;
            return (
              <button key={i} onClick={()=>!elim&&setViewPlayer(i)} style={{
                display:"grid",gridTemplateColumns:"1fr 48px 60px 68px",
                padding:"10px 12px",borderBottom:`1px solid ${C.border}`,
                opacity:elim?0.3:1,background:isD?"rgba(14,165,233,0.06)":"transparent",
                cursor:elim?"default":"pointer",width:"100%",border:"none",
                borderBottom:`1px solid ${C.border}`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  {isD&&<span style={{fontSize:11}}>🃏</span>}
                  <span style={{fontWeight:700,color:elim?C.muted:C.text,fontSize:13}}>{elim&&"❌"}{pNames[i]}</span>
                  {consec.player===i&&consec.count>=2&&!elim&&<span style={{fontSize:10,color:C.amber}}>🔥{consec.count}</span>}
                </div>
                <div style={{textAlign:"center",color:pCards[i]?SUIT_COLORS[pCards[i].suit]:C.muted,fontWeight:700,fontSize:12,paddingTop:2}}>
                  {pCards[i]?`${pCards[i].val}${pCards[i].suit}`:"—"}
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontWeight:800,color:bc,fontSize:16}}>{sc}</div>
                  <div style={{height:3,background:C.card,borderRadius:2,marginTop:2}}>
                    <div style={{width:`${bar}%`,height:"100%",background:bc,borderRadius:2,transition:"width 0.4s"}}/>
                  </div>
                </div>
                <div style={{textAlign:"center",paddingTop:2}}><Money v={tot} size={13}/></div>
              </button>
            );
          })}
        </div>

        {/* Round history table */}
        {roundHistory.length>0&&(
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",marginBottom:14}}>
            <div style={{padding:"10px 14px",background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:C.text,fontSize:13,fontWeight:700}}>היסטוריית סיבובים</span>
              <span style={{color:C.muted,fontSize:11}}>🔴=עיגול · ✓=ניצח · 🚫=לא הוריד</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",width:"100%",minWidth:n*70+80}}>
                <thead>
                  <tr style={{background:C.card}}>
                    <th style={{padding:"8px 10px",color:C.muted,fontSize:12,textAlign:"right",fontWeight:600,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>סיבוב</th>
                    {Array.from({length:n},(_,i)=>i).map(i=>{
                      const totalCircles=roundHistory.reduce((s,r)=>s+(r.cols[i]?.circles||0),0);
                      return (
                        <th key={i} style={{padding:"8px 6px",borderBottom:`1px solid ${C.border}`,textAlign:"center",minWidth:70}}>
                          <div style={{color:C.text,fontSize:13,fontWeight:800}}>{pNames[i].slice(0,5)}</div>
                          {pCards[i]&&<div style={{color:SUIT_COLORS[pCards[i].suit],fontSize:11}}>{pCards[i].val}{pCards[i].suit}</div>}
                          {totalCircles>0&&<div style={{color:C.red,fontSize:11,fontWeight:700}}>🔴×{totalCircles}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roundHistory.map((row,ri)=>(
                    <tr key={ri} style={{borderTop:`1px solid ${C.border}`,background:row.parish?"rgba(245,158,11,0.06)":ri%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                      <td style={{padding:"9px 10px",whiteSpace:"nowrap"}}>
                        <div style={{color:row.parish?C.amber:C.text,fontWeight:700,fontSize:13}}>
                          #{row.round}{row.isDouble&&<span style={{color:C.amber,fontSize:11}}> ×2</span>}
                        </div>
                        <div style={{color:row.parish?C.amber:C.green,fontSize:11}}>
                          {row.parish?"פריש 🔃":pNames[row.winner]?.slice(0,5)}
                        </div>
                      </td>
                      {row.cols.map((col,ci)=>(
                        <td key={ci} style={{padding:"8px 4px",textAlign:"center",verticalAlign:"middle"}}>
                          {row.parish?(
                            <div style={{color:C.amber,fontSize:12}}>—</div>
                          ):col.added===null?(
                            <span style={{color:C.muted,fontSize:12}}>—</span>
                          ):col.won?(
                            <div>
                              <div style={{color:C.green,fontSize:18,fontWeight:900,lineHeight:1}}>✓</div>
                              <div style={{color:C.green,fontSize:12,fontWeight:700}}>{col.score}</div>
                              {col.circles>0&&<div style={{color:C.red,fontSize:12,fontWeight:800}}>🔴{col.circles>1?`×${col.circles}`:""}</div>}
                            </div>
                          ):(
                            <div>
                              <div style={{color:col.added>0?C.red:C.muted,fontSize:13,fontWeight:700}}>
                                {col.didntDrop?"🚫":(col.added>0?"+":"")+col.added}
                              </div>
                              {col.circles>0&&(
                                <div style={{color:C.red,fontSize:13,fontWeight:900}}>
                                  🔴{col.circles>1?`×${col.circles}`:""}
                                </div>
                              )}
                              <div style={{
                                color:col.score>=151?C.red:col.score>=100?"#f97316":col.score>=51?C.amber:C.green,
                                fontSize:13,fontWeight:800,
                              }}>{col.score}</div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Balance row */}
                  <tr style={{borderTop:`2px solid ${C.borderLight}`,background:C.card}}>
                    <td style={{padding:"9px 10px",color:C.muted,fontSize:12,fontWeight:700}}>מאזן</td>
                    {Array.from({length:n},(_,i)=>i).map(i=>{
                      const tot=personalTotal(personal[i]||blankPersonal());
                      return (
                        <td key={i} style={{padding:"9px 4px",textAlign:"center"}}>
                          <div style={{color:tot>=0?C.green:C.red,fontWeight:900,fontSize:14}}>
                            {tot>=0?"+":""}{tot}₪
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══ ROUND MODAL ══ */}
      {modal==="round"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,padding:"20px 18px 44px",maxHeight:"92vh",overflowY:"auto",direction:"rtl"}}>

            {/* WINNER */}
            {step==="winner"&&(
              <>
                <h2 style={{color:C.text,margin:"0 0 14px",fontSize:18}}>מי ניצח?</h2>
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {activeIdxs.map(i=>(
                    <button key={i} onClick={()=>{setRoundWinner(i);setStep("scores");}} style={{
                      background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",
                      color:C.text,fontSize:17,fontWeight:700,cursor:"pointer",textAlign:"right",
                      display:"flex",alignItems:"center",gap:10,
                    }}>{dealer===i&&<span>🃏</span>}{pNames[i]}</button>
                  ))}
                </div>
                <button onClick={()=>setModal(null)} style={{marginTop:12,background:"transparent",border:"none",color:C.muted,cursor:"pointer",width:"100%",padding:10,fontSize:13}}>ביטול</button>
              </>
            )}

            {/* SCORES */}
            {step==="scores"&&(()=>{
              const losers=scoreInputs.filter(x=>x.idx!==roundWinner);
              if(scoreIdx>=losers.length){setStep("extras");return null;}
              const cur=losers[scoreIdx];
              const ci=scoreInputs.find(x=>x.idx===cur.idx);
              return (
                <>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <h2 style={{color:C.text,margin:0,fontSize:17}}>ניקוד</h2>
                    <span style={{color:C.muted,fontSize:13}}>{scoreIdx+1}/{losers.length}</span>
                  </div>
                  <div style={{textAlign:"center",marginBottom:12}}>
                    <div style={{color:C.accent,fontSize:22,fontWeight:900}}>{pNames[cur.idx]}</div>
                    <div style={{color:C.muted,fontSize:12}}>כרגע: {scores[cur.idx]}</div>
                  </div>
                  <button onClick={()=>setScoreInputs(scoreInputs.map(x=>x.idx===cur.idx?{...x,didntDrop:!x.didntDrop,pts:!x.didntDrop?"100":""}:x))} style={{
                    width:"100%",marginBottom:14,
                    background:ci?.didntDrop?"#5b21b6":C.card,
                    border:`1px solid ${ci?.didntDrop?"#7c3aed":C.border}`,
                    borderRadius:13,padding:"12px",color:C.text,fontSize:15,fontWeight:700,cursor:"pointer",
                  }}>{ci?.didntDrop?"✓ לא הוריד יד — 100 נקודות":"לא הוריד יד?"}</button>
                  {!ci?.didntDrop&&(
                    <Numpad value={ci?.pts||""} label={`נקודות — ${pNames[cur.idx]}`}
                      onChange={v=>setScoreInputs(scoreInputs.map(x=>x.idx===cur.idx?{...x,pts:v}:x))}
                      onConfirm={()=>setScoreIdx(s=>s+1)}
                    />
                  )}
                  <div style={{display:"flex",gap:10,marginTop:14}}>
                    <button onClick={()=>setScoreIdx(s=>Math.max(0,s-1))} style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:12,color:C.muted,cursor:"pointer",fontSize:13}}>← חזור</button>
                    <button onClick={()=>setScoreIdx(s=>s+1)} style={{flex:2,background:`linear-gradient(135deg,${C.accent},#0369a1)`,border:"none",borderRadius:12,padding:12,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14}}>
                      {scoreIdx<losers.length-1?"הבא →":"המשך →"}
                    </button>
                  </div>
                </>
              );
            })()}

            {/* EXTRAS */}
            {step==="extras"&&(
              <>
                <h2 style={{color:C.text,margin:"0 0 14px",fontSize:17}}>✨ תוספות</h2>

                {/* Joker — always awarded to round winner */}
                <button onClick={()=>setJokerActive(j=>!j)} style={{
                  width:"100%",marginBottom:10,
                  background:jokerActive?"rgba(249,115,22,0.15)":C.card,
                  border:`2px solid ${jokerActive?"#f97316":C.border}`,
                  borderRadius:14,padding:"16px 18px",
                  display:"flex",alignItems:"center",gap:12,cursor:"pointer",
                }}>
                  <span style={{fontSize:24}}>🃏</span>
                  <div style={{flex:1,textAlign:"right"}}>
                    <div style={{color:C.text,fontWeight:700,fontSize:16}}>ג'וקר חופשי</div>
                    <div style={{color:C.muted,fontSize:12}}>
                      {jokerActive
                        ? `✓ ${pNames[roundWinner]} מקבל 100₪ מכל שחקן`
                        : `100₪ לכל שחקן → ${pNames[roundWinner]}`}
                    </div>
                  </div>
                  <div style={{
                    width:28,height:28,borderRadius:8,
                    background:jokerActive?C.green:"transparent",
                    border:`2px solid ${jokerActive?C.green:C.muted}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    flexShrink:0,
                  }}>
                    {jokerActive&&<span style={{color:"#fff",fontSize:16,fontWeight:900}}>✓</span>}
                  </div>
                </button>

                {/* Card fell — only suit picker */}
                <div style={{background:C.card,border:`1px solid ${cardFell?C.accent:C.border}`,borderRadius:14,padding:"12px 14px",marginBottom:14}}>
                  <button onClick={()=>setCardFell(c=>c?null:{receiver:activeIdxs[0],suit:null})} style={{width:"100%",background:"transparent",border:"none",display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:0}}>
                    <span style={{fontSize:22}}>🎴</span>
                    <div style={{flex:1,textAlign:"right"}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:15}}>נפל קלף</div>
                      <div style={{color:C.muted,fontSize:12}}>בחר שחקן וצורה</div>
                    </div>
                    <div style={{width:24,height:24,borderRadius:6,background:cardFell?C.accent:"transparent",border:`2px solid ${cardFell?C.accent:C.muted}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {cardFell&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
                    </div>
                  </button>
                  {cardFell&&(
                    <div style={{marginTop:12}}>
                      <div style={{color:C.muted,fontSize:12,marginBottom:8}}>לאיזה שחקן?</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                        {(activeIdxs.filter(i=>pCards[i]!=null).length>0
                          ? activeIdxs.filter(i=>pCards[i]!=null)
                          : activeIdxs
                        ).map(i=>(
                          <button key={i} onClick={()=>setCardFell(c=>({...c,receiver:i}))} style={{
                            background:cardFell.receiver===i?C.accent:C.surface,
                            border:`1px solid ${cardFell.receiver===i?C.accent:C.border}`,
                            borderRadius:10,padding:"7px 14px",color:C.text,fontSize:14,fontWeight:600,cursor:"pointer",
                          }}>
                            {pNames[i]}
                            {pCards[i]&&<span style={{color:SUIT_COLORS[pCards[i].suit],marginRight:4,fontSize:13}}>{pCards[i].val}{pCards[i].suit}</span>}
                          </button>
                        ))}
                      </div>
                      <div style={{color:C.muted,fontSize:12,marginBottom:8}}>איזה צורה נפלה?</div>
                      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                        {SUITS.map(s=>{
                          const recv=cardFell.receiver;
                          const myCard=recv!=null?pCards[recv]:null;
                          const redSuits=["♦","♥"], blackSuits=["♠","♣"];
                          let bonus="", bonusColor=C.muted;
                          if(myCard){
                            if(s===myCard.suit){ bonus="בינגו!"; bonusColor=C.amber; }
                            else if(
                              (redSuits.includes(s)&&redSuits.includes(myCard.suit))||
                              (blackSuits.includes(s)&&blackSuits.includes(myCard.suit))
                            ){ bonus="100₪"; bonusColor=C.green; }
                            else { bonus="50₪"; bonusColor=C.muted; }
                          } else {
                            // אין קלף מוגדר — מציג לפי צבע בלבד
                            bonus="50₪"; bonusColor=C.muted;
                          }
                          return (
                            <button key={s} onClick={()=>setCardFell(c=>({...c,suit:s}))} style={{
                              background:cardFell.suit===s?C.accent:C.surface,
                              border:`2px solid ${cardFell.suit===s?C.accent:C.border}`,
                              borderRadius:12,padding:"10px 14px",
                              color:SUIT_COLORS[s],fontSize:22,cursor:"pointer",fontWeight:700,textAlign:"center",
                            }}>{s}<div style={{fontSize:11,color:cardFell.suit===s?"#fff":bonusColor,fontWeight:700,marginTop:2}}>{bonus}</div></button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={processRound} style={{width:"100%",background:`linear-gradient(135deg,${C.green},#16a34a)`,border:"none",borderRadius:13,padding:16,color:"#fff",fontWeight:900,fontSize:17,cursor:"pointer"}}>
                  ✓ אשר סיבוב
                </button>
                <button onClick={()=>setStep("scores")} style={{width:"100%",marginTop:8,background:"transparent",border:"none",color:C.muted,cursor:"pointer",padding:8,fontSize:13}}>← חזור לניקוד</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ ENDGAME MODAL ══ */}
      {modal==="endgame"&&(()=>{
        // Only non-winners pay — build list of payers
        const payers = Array.from({length:n},(_,i)=>i).filter(i=>i!==egWinner);
        const currentPayer = payers[egBetPlayer] ?? null;
        const totalBets = payers.reduce((s,i)=>s+(parseInt(egBets[i])||0),0);
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:22,padding:24,width:"100%",maxWidth:440,direction:"rtl"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:44}}>🏆</div>
              <h2 style={{color:"#fbbf24",fontSize:20,margin:"6px 0 4px"}}>{pNames[egWinner]} ניצח!</h2>
              <p style={{color:C.muted,fontSize:13,margin:0}}>קופת עיגולים: <span style={{color:C.amber,fontWeight:700}}>{pot}₪</span></p>
              <p style={{color:C.muted,fontSize:12,margin:"4px 0 0"}}>הכנס עלות כניסה למפסידים</p>
            </div>
            {currentPayer!==null?(
              <>
                <div style={{textAlign:"center",marginBottom:12}}>
                  <div style={{color:C.accent,fontSize:20,fontWeight:900}}>{pNames[currentPayer]}</div>
                  <div style={{color:C.muted,fontSize:12}}>{egBetPlayer+1} מתוך {payers.length}</div>
                </div>
                <Numpad value={egBetInput} label={`עלות כניסה — ${pNames[currentPayer]}`} onChange={setEgBetInput}
                  onConfirm={()=>{
                    setEgBets(b=>({...b,[currentPayer]:parseInt(egBetInput)||0}));
                    setEgBetInput("");
                    setEgBetPlayer(p=>p+1);
                  }}
                />
                <button onClick={()=>{
                  setEgBets(b=>({...b,[currentPayer]:parseInt(egBetInput)||0}));
                  setEgBetInput("");
                  setEgBetPlayer(p=>p+1);
                }} style={{width:"100%",marginTop:14,background:`linear-gradient(135deg,${C.accent},#0369a1)`,border:"none",borderRadius:13,padding:14,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>
                  {egBetPlayer<payers.length-1?"הבא →":"לסיכום →"}
                </button>
              </>
            ):(
              <>
                <div style={{background:"rgba(251,191,36,0.1)",border:"1px solid #fbbf24",borderRadius:12,padding:"12px",marginBottom:14,textAlign:"center"}}>
                  <div style={{color:C.muted,fontSize:12}}>המנצח מקבל</div>
                  <div style={{color:"#fbbf24",fontSize:24,fontWeight:900}}>{totalBets+pot}₪</div>
                  <div style={{color:C.muted,fontSize:11}}>({pot}₪ קופה + {totalBets}₪ עלויות)</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                  {payers.map(i=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 4px",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{color:C.text,fontWeight:600}}>{pNames[i]}</span>
                      <span style={{color:C.red}}>{egBets[i]||0}₪</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 4px"}}>
                    <span style={{color:"#fbbf24",fontWeight:700}}>{pNames[egWinner]} (מנצח)</span>
                    <span style={{color:C.green,fontWeight:700}}>+{totalBets+pot}₪</span>
                  </div>
                </div>
                <button onClick={finishGame} style={{width:"100%",background:"linear-gradient(135deg,#fbbf24,#d97706)",border:"none",borderRadius:13,padding:15,color:"#000",fontWeight:900,fontSize:17,cursor:"pointer"}}>
                  🏆 לעמוד סיכום
                </button>
              </>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
