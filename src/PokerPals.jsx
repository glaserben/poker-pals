import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════ */
const SUITS = ["♠","♥","♦","♣"];
const SUIT_COLORS = {"♠":"#2b2d42","♥":"#e63946","♦":"#e76f51","♣":"#2b2d42"};
const SUIT_BG = {"♠":"#edf2f4","♥":"#fde8ea","♦":"#fde8ea","♣":"#edf2f4"};
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13,A:14};
const FACE_NAMES = {J:"Jack",Q:"Queen",K:"King",A:"Ace"};

const HAND_DATA = [
  {name:"Royal Flush",emoji:"👑",stars:10,desc:"A K Q J 10 all the same suit!",tip:"The BEST hand possible!"},
  {name:"Straight Flush",emoji:"🌈",stars:9,desc:"5 in a row, same suit!",tip:"Almost impossible to beat!"},
  {name:"Four of a Kind",emoji:"🍀",stars:8,desc:"4 cards with the same number!",tip:"Super rare and super strong!"},
  {name:"Full House",emoji:"🏠",stars:7,desc:"3 of one + 2 of another!",tip:"Like a triple and a pair had a baby!"},
  {name:"Flush",emoji:"💎",stars:6,desc:"All 5 cards same suit!",tip:"Look at the suit symbols — all matching!"},
  {name:"Straight",emoji:"➡️",stars:5,desc:"5 cards in a row!",tip:"The numbers go in order like counting!"},
  {name:"Three of a Kind",emoji:"🎯",stars:4,desc:"3 cards same number!",tip:"Trips! A solid hand!"},
  {name:"Two Pair",emoji:"👯",stars:3,desc:"2 different pairs!",tip:"Double trouble for your opponent!"},
  {name:"One Pair",emoji:"✌️",stars:2,desc:"2 cards same number!",tip:"Most common winning hand!"},
  {name:"High Card",emoji:"☝️",stars:1,desc:"Nothing matches — biggest card counts!",tip:"Sometimes this is all you get!"},
];

function makeDeck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({r,s,id:r+s});return d;}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function cardName(c){return `${FACE_NAMES[c.r]||c.r} of ${c.s==="♠"?"Spades":c.s==="♥"?"Hearts":c.s==="♦"?"Diamonds":"Clubs"}`;}

/* ── Hand evaluator ── */
function evalHand(cards){
  if(!cards||cards.length<5) return {rank:-1,name:"?",hCards:[]};
  const sorted=[...cards].sort((a,b)=>RV[b.r]-RV[a.r]);
  const vals=sorted.map(c=>RV[c.r]);
  const suits=sorted.map(c=>c.s);
  const isFlush=suits.every(s=>s===suits[0]);
  const isStr=vals[0]-vals[4]===4&&new Set(vals).size===5;
  const isWheel=vals[0]===14&&vals[1]===5&&vals[2]===4&&vals[3]===3&&vals[4]===2;
  const isStraight=isStr||isWheel;
  const counts={};vals.forEach(v=>counts[v]=(counts[v]||0)+1);
  const freq=Object.entries(counts).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);

  if(isFlush&&isStraight&&vals[0]===14&&!isWheel) return {rank:9,name:"Royal Flush",hCards:sorted};
  if(isFlush&&isStraight) return {rank:8,name:"Straight Flush",hCards:sorted};
  if(freq[0][1]===4) return {rank:7,name:"Four of a Kind",hCards:sorted};
  if(freq[0][1]===3&&freq[1][1]===2) return {rank:6,name:"Full House",hCards:sorted};
  if(isFlush) return {rank:5,name:"Flush",hCards:sorted};
  if(isStraight) return {rank:4,name:"Straight",hCards:sorted};
  if(freq[0][1]===3) return {rank:3,name:"Three of a Kind",hCards:sorted};
  if(freq[0][1]===2&&freq[1][1]===2) return {rank:2,name:"Two Pair",hCards:sorted};
  if(freq[0][1]===2) return {rank:1,name:"One Pair",hCards:sorted};
  return {rank:0,name:"High Card",hCards:sorted};
}

/* ═══════════════════════════════════════════
   HINT ENGINE — the brain of the teacher
   ═══════════════════════════════════════════ */
function analyzeHand(cards){
  const counts={};const suitCounts={};
  cards.forEach(c=>{counts[c.r]=(counts[c.r]||0)+1;suitCounts[c.s]=(suitCounts[c.s]||0)+1;});
  const sorted=[...cards].sort((a,b)=>RV[b.r]-RV[a.r]);
  const vals=sorted.map(c=>RV[c.r]);
  const result=evalHand(cards);

  // Already great — keep everything
  if(result.rank>=5){
    return {keep:cards.map(c=>c.id),discard:[],
      hint:`WOW! You have a ${result.name}! 🎉 Don't change ANYTHING — this hand is amazing!`,
      strength:"amazing",handName:result.name};
  }

  // Four of a kind — keep the 4, discard the loner
  if(result.rank===7){
    const quadR=Object.entries(counts).find(([,v])=>v===4)[0];
    const keep=cards.filter(c=>c.r===quadR).map(c=>c.id);
    const disc=cards.filter(c=>c.r!==quadR).map(c=>c.id);
    return {keep,discard:disc,hint:`Four of a Kind! Keep all four ${quadR}s! Toss the extra card and hope for a lucky draw!`,strength:"amazing",handName:result.name};
  }

  // Full House — keep it all
  if(result.rank===6){
    return {keep:cards.map(c=>c.id),discard:[],hint:`Full House! Three + Two = a very strong hand! Keep it all!`,strength:"great",handName:result.name};
  }

  // Three of a kind — keep the trips, toss 2
  if(result.rank===3){
    const tripR=Object.entries(counts).find(([,v])=>v===3)[0];
    const keep=cards.filter(c=>c.r===tripR).map(c=>c.id);
    const disc=cards.filter(c=>c.r!==tripR).map(c=>c.id);
    return {keep,discard:disc,
      hint:`Three ${tripR}s! 🎯 Keep your triple and throw away the other 2 cards. Maybe you'll get a Full House!`,
      strength:"great",handName:"Three of a Kind"};
  }

  // Two Pair — keep both pairs, toss the odd one
  if(result.rank===2){
    const pairRanks=Object.entries(counts).filter(([,v])=>v===2).map(([k])=>k);
    const keep=cards.filter(c=>pairRanks.includes(c.r)).map(c=>c.id);
    const disc=cards.filter(c=>!pairRanks.includes(c.r)).map(c=>c.id);
    return {keep,discard:disc,
      hint:`Two pairs! Keep both pairs and toss the leftover card. You might get a Full House!`,
      strength:"good",handName:"Two Pair"};
  }

  // One Pair — keep the pair, toss 3
  if(result.rank===1){
    const pairR=Object.entries(counts).find(([,v])=>v===2)[0];
    const keep=cards.filter(c=>c.r===pairR).map(c=>c.id);
    const disc=cards.filter(c=>c.r!==pairR).map(c=>c.id);
    return {keep,discard:disc,
      hint:`A pair of ${pairR}s! ✌️ Keep your pair and swap the other 3 — maybe you'll get more matches!`,
      strength:"okay",handName:"One Pair"};
  }

  // Check for 4-card flush draw
  const flushSuit=Object.entries(suitCounts).find(([,v])=>v===4);
  if(flushSuit){
    const keep=cards.filter(c=>c.s===flushSuit[0]).map(c=>c.id);
    const disc=cards.filter(c=>c.s!==flushSuit[0]).map(c=>c.id);
    return {keep,discard:disc,
      hint:`Almost a Flush! 💎 You have 4 ${flushSuit[0]==="♠"?"Spades":flushSuit[0]==="♥"?"Hearts":flushSuit[0]==="♦"?"Diamonds":"Clubs"}! Keep them and throw away the odd one — you might complete it!`,
      strength:"hopeful",handName:"Flush Draw"};
  }

  // Check for 4-card straight draw (open-ended)
  const uvals=[...new Set(vals)].sort((a,b)=>a-b);
  for(let i=0;i<=uvals.length-4;i++){
    if(uvals[i+3]-uvals[i]===3||uvals[i+3]-uvals[i]===4){
      const seqVals=uvals.slice(i,i+4);
      const keep=[];const disc=[];
      cards.forEach(c=>{
        if(seqVals.includes(RV[c.r])&&!keep.some(k=>{const kc=cards.find(x=>x.id===k);return RV[kc.r]===RV[c.r];})){
          keep.push(c.id);
        } else disc.push(c.id);
      });
      if(keep.length===4&&disc.length===1){
        return {keep,discard:disc,
          hint:`Almost a Straight! ➡️ You have 4 cards in a row! Keep them and hope the missing number shows up!`,
          strength:"hopeful",handName:"Straight Draw"};
      }
    }
  }

  // High card — keep the 2 highest, toss 3
  const keepCards=sorted.slice(0,2).map(c=>c.id);
  const discCards=sorted.slice(2).map(c=>c.id);
  const highName=FACE_NAMES[sorted[0].r]||sorted[0].r;
  return {keep:keepCards,discard:discCards,
    hint:`No matches yet! Keep your 2 biggest cards (${highName} is your best!) and swap the rest. Fresh cards = fresh chances! 🤞`,
    strength:"weak",handName:"High Card"};
}

/* CPU discard AI */
function cpuDiscard(cards){
  const a=analyzeHand(cards);
  return a.discard;
}

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */
const fonts = `@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Lilita+One&family=Gaegu:wght@400;700&display=swap');`;

const STRENGTH_COLORS = {
  amazing: {bg:"#d4edda",border:"#2a9d8f",text:"#155724",glow:"#2a9d8f"},
  great:   {bg:"#d4edda",border:"#38b000",text:"#155724",glow:"#38b000"},
  good:    {bg:"#fff3cd",border:"#ffc107",text:"#856404",glow:"#ffc107"},
  okay:    {bg:"#fff3cd",border:"#f4a261",text:"#856404",glow:"#f4a261"},
  hopeful: {bg:"#e8daef",border:"#7209b7",text:"#4a235a",glow:"#7209b7"},
  weak:    {bg:"#fde8ea",border:"#e63946",text:"#721c24",glow:"#e63946"},
};

function PlayingCard({card,faceDown,selected,hintDiscard,hintKeep,onClick,disabled,isNew,delay=0}){
  const w=78,h=112;
  let borderColor="#d4cfc0";let shadow="0 3px 10px #00000015";let glow="";let transform="";
  if(selected){borderColor="#f72585";shadow="0 0 18px #f7258588";transform="translateY(-10px) scale(1.06)";}
  else if(hintDiscard){borderColor="#e6394688";shadow="0 0 14px #e6394644";glow="inset 0 0 20px #e639460e";}
  else if(hintKeep){borderColor="#2a9d8f88";shadow="0 0 14px #2a9d8f44";glow="inset 0 0 20px #2a9d8f0e";}

  return (
    <div onClick={disabled?undefined:onClick} style={{
      width:w,height:h,borderRadius:14,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",cursor:disabled?"default":onClick?"pointer":"default",
      background:faceDown?"linear-gradient(135deg,#4361ee,#7209b7)":"#fffef5",
      border:`3px solid ${faceDown?"#3a50d4":borderColor}`,
      boxShadow:shadow,transition:"all 0.3s cubic-bezier(.34,1.56,.64,1)",
      transform,fontFamily:"'Fredoka',sans-serif",userSelect:"none",flexShrink:0,
      position:"relative",overflow:"hidden",
      animation:isNew?`cardPop 0.4s ${delay}ms both`:undefined,
    }}>
      {faceDown?(
        <div style={{fontSize:36,opacity:0.8}}>🂠</div>
      ):(
        <>
          {hintDiscard && !selected && (
            <div style={{position:"absolute",top:4,right:6,fontSize:12,opacity:0.7}}>👋</div>
          )}
          {hintKeep && !selected && (
            <div style={{position:"absolute",top:4,right:6,fontSize:12,opacity:0.7}}>✅</div>
          )}
          <div style={{fontSize:22,fontWeight:700,color:SUIT_COLORS[card.s],lineHeight:1}}>{card.r}</div>
          <div style={{fontSize:28,lineHeight:1,marginTop:2}}>{card.s}</div>
          {selected && (
            <div style={{position:"absolute",bottom:4,fontSize:10,color:"#f72585",fontWeight:700,letterSpacing:0.5}}>
              SWAP
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CoachBubble({text,strength,emoji="🐻",show=true}){
  const c=STRENGTH_COLORS[strength]||{bg:"#f0f4ff",border:"#4361ee",text:"#1a1a2e"};
  if(!show) return null;
  return (
    <div style={{
      display:"flex",gap:12,alignItems:"flex-start",
      animation:"fadeUp 0.4s both",marginBottom:12,
    }}>
      <div style={{
        width:48,height:48,borderRadius:"50%",background:"#fff3cd",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:28,flexShrink:0,border:"3px solid #f4a261",
        boxShadow:"0 3px 10px #00000015",
      }}>{emoji}</div>
      <div style={{
        flex:1,background:c.bg,border:`2.5px solid ${c.border}`,
        borderRadius:"4px 18px 18px 18px",padding:"12px 16px",
        fontFamily:"'Fredoka'",fontSize:15,color:c.text,lineHeight:1.55,
        boxShadow:"0 3px 12px #00000010",
      }}>{text}</div>
    </div>
  );
}

function ChipStack({chips}){
  return (
    <div style={{
      display:"inline-flex",alignItems:"center",gap:6,
      background:"#1a5c38",padding:"6px 16px",borderRadius:30,
      border:"2px solid #c9a85c",
    }}>
      <span style={{fontSize:18}}>🪙</span>
      <span style={{fontFamily:"'Lilita One'",fontSize:20,color:"#ffd60a"}}>${chips}</span>
    </div>
  );
}

function Btn({children,onClick,color="#4361ee",disabled,size="md",outline}){
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily:"'Lilita One'",fontSize:size==="lg"?22:size==="sm"?14:17,
      padding:size==="lg"?"14px 36px":size==="sm"?"8px 18px":"11px 26px",
      background:disabled?"#ccc":outline?"transparent":color,
      color:outline?color:disabled?"#888":"#fff",
      border:outline?`2.5px solid ${color}`:"none",borderRadius:50,
      cursor:disabled?"not-allowed":"pointer",
      boxShadow:disabled?"none":"0 4px 14px #00000018",
      transition:"all 0.15s",letterSpacing:0.5,
    }}>{children}</button>
  );
}

/* ═══════════════════════════════════════════
   SCREENS
   ═══════════════════════════════════════════ */

/* ── HOME ── */
function HomeScreen({onNav,stats}){
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"24px 16px"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:4,animation:"bounce 2s infinite"}}>🐻</div>
        <h1 style={{fontFamily:"'Lilita One'",fontSize:34,color:"#1a1a2e",margin:0}}>Poker Pals</h1>
        <p style={{fontFamily:"'Fredoka'",fontSize:15,color:"#888",margin:"4px 0 0"}}>Learn Five Card Draw with Coach Bear!</p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:360}}>
        {[
          {key:"play",emoji:"🎮",label:"Play & Learn!",desc:"Coach Bear guides every move",color:"#2a9d8f"},
          {key:"hands",emoji:"📚",label:"Hand Rankings",desc:"See all the hands from best to worst",color:"#4361ee"},
          {key:"quiz",emoji:"🧠",label:"Quiz Time!",desc:"Which hand wins? Test yourself!",color:"#7209b7"},
        ].map(item=>(
          <div key={item.key} onClick={()=>onNav(item.key)} style={{
            display:"flex",alignItems:"center",gap:16,padding:"18px 22px",
            background:"#fff",borderRadius:22,cursor:"pointer",
            border:"2.5px solid #eee",boxShadow:"0 3px 14px #00000008",
            transition:"all 0.2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateX(6px)";e.currentTarget.style.borderColor=item.color;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="#eee";}}
          >
            <div style={{
              width:56,height:56,borderRadius:18,background:item.color,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,
            }}>{item.emoji}</div>
            <div>
              <div style={{fontFamily:"'Lilita One'",fontSize:19,color:"#1a1a2e"}}>{item.label}</div>
              <div style={{fontFamily:"'Fredoka'",fontSize:13,color:"#999"}}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {(stats.handsPlayed>0||stats.quizTotal>0) && (
        <div style={{
          background:"#fff",borderRadius:18,padding:"14px 28px",
          fontFamily:"'Fredoka'",fontSize:14,color:"#555",
          border:"2px solid #eee",display:"flex",gap:20,flexWrap:"wrap",justifyContent:"center",
        }}>
          {stats.handsPlayed>0&&<span>🎮 <b style={{color:"#2a9d8f"}}>{stats.handsPlayed}</b> hands played</span>}
          {stats.wins>0&&<span>🏆 <b style={{color:"#4361ee"}}>{stats.wins}</b> wins</span>}
          {stats.quizTotal>0&&<span>🧠 <b style={{color:"#7209b7"}}>{stats.quizCorrect}/{stats.quizTotal}</b> quiz</span>}
        </div>)}
      </div>
    </div>
  );
}

/* ── HAND RANKINGS ── */
function HandsScreen({onBack}){
  const [open,setOpen]=useState(null);
  const examples=[
    [{r:"A",s:"♠"},{r:"K",s:"♠"},{r:"Q",s:"♠"},{r:"J",s:"♠"},{r:"10",s:"♠"}],
    [{r:"5",s:"♥"},{r:"6",s:"♥"},{r:"7",s:"♥"},{r:"8",s:"♥"},{r:"9",s:"♥"}],
    [{r:"K",s:"♠"},{r:"K",s:"♥"},{r:"K",s:"♦"},{r:"K",s:"♣"},{r:"3",s:"♠"}],
    [{r:"Q",s:"♠"},{r:"Q",s:"♥"},{r:"Q",s:"♦"},{r:"7",s:"♣"},{r:"7",s:"♠"}],
    [{r:"2",s:"♦"},{r:"5",s:"♦"},{r:"8",s:"♦"},{r:"J",s:"♦"},{r:"A",s:"♦"}],
    [{r:"4",s:"♠"},{r:"5",s:"♥"},{r:"6",s:"♦"},{r:"7",s:"♣"},{r:"8",s:"♠"}],
    [{r:"9",s:"♠"},{r:"9",s:"♥"},{r:"9",s:"♦"},{r:"4",s:"♣"},{r:"J",s:"♠"}],
    [{r:"5",s:"♠"},{r:"5",s:"♥"},{r:"J",s:"♦"},{r:"J",s:"♣"},{r:"A",s:"♠"}],
    [{r:"8",s:"♠"},{r:"8",s:"♥"},{r:"3",s:"♦"},{r:"K",s:"♣"},{r:"A",s:"♠"}],
    [{r:"2",s:"♠"},{r:"5",s:"♥"},{r:"9",s:"♦"},{r:"J",s:"♣"},{r:"A",s:"♠"}],
  ];
  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <Btn onClick={onBack} color="#888" size="sm">← Back</Btn>
        <h2 style={{fontFamily:"'Lilita One'",fontSize:22,color:"#4361ee",margin:0}}>📚 Hand Rankings</h2>
      </div>
      <CoachBubble text="Here are ALL the poker hands from BEST ⬆️ to WORST ⬇️. Tap any hand to see what it looks like!" strength="good" />
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {HAND_DATA.map((h,i)=>(
          <div key={i} onClick={()=>setOpen(open===i?null:i)} style={{
            background:"#fff",borderRadius:18,padding:"14px 16px",cursor:"pointer",
            border:open===i?"3px solid #4361ee":"2.5px solid #eee",
            boxShadow:open===i?"0 4px 20px #4361ee1a":"0 2px 8px #00000008",transition:"all 0.2s",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{
                width:40,height:40,borderRadius:12,
                background:`hsl(${260-i*24},65%,52%)`,color:"#fff",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                fontFamily:"'Lilita One'",flexShrink:0,
              }}>#{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Lilita One'",fontSize:16,color:"#1a1a2e"}}>{h.emoji} {h.name}</div>
                <div style={{fontFamily:"'Fredoka'",fontSize:13,color:"#888"}}>{h.desc}</div>
              </div>
            </div>
            {open===i&&(
              <div style={{marginTop:12}}>
                <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",marginBottom:8}}>
                  {examples[i].map((c,j)=><PlayingCard key={j} card={c}/>)}
                </div>
                <div style={{fontFamily:"'Fredoka'",fontSize:13,color:"#4361ee",textAlign:"center",fontStyle:"italic"}}>{h.tip}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── QUIZ ── */
function QuizScreen({onBack,onScore}){
  const [round,setRound]=useState(null);
  const [choice,setChoice]=useState(null);
  const [streak,setStreak]=useState(0);

  const examples=[
    [{r:"A",s:"♠"},{r:"K",s:"♠"},{r:"Q",s:"♠"},{r:"J",s:"♠"},{r:"10",s:"♠"}],
    [{r:"5",s:"♥"},{r:"6",s:"♥"},{r:"7",s:"♥"},{r:"8",s:"♥"},{r:"9",s:"♥"}],
    [{r:"K",s:"♠"},{r:"K",s:"♥"},{r:"K",s:"♦"},{r:"K",s:"♣"},{r:"3",s:"♠"}],
    [{r:"Q",s:"♠"},{r:"Q",s:"♥"},{r:"Q",s:"♦"},{r:"7",s:"♣"},{r:"7",s:"♠"}],
    [{r:"2",s:"♦"},{r:"5",s:"♦"},{r:"8",s:"♦"},{r:"J",s:"♦"},{r:"A",s:"♦"}],
    [{r:"4",s:"♠"},{r:"5",s:"♥"},{r:"6",s:"♦"},{r:"7",s:"♣"},{r:"8",s:"♠"}],
    [{r:"9",s:"♠"},{r:"9",s:"♥"},{r:"9",s:"♦"},{r:"4",s:"♣"},{r:"J",s:"♠"}],
    [{r:"5",s:"♠"},{r:"5",s:"♥"},{r:"J",s:"♦"},{r:"J",s:"♣"},{r:"A",s:"♠"}],
    [{r:"8",s:"♠"},{r:"8",s:"♥"},{r:"3",s:"♦"},{r:"K",s:"♣"},{r:"A",s:"♠"}],
    [{r:"2",s:"♠"},{r:"5",s:"♥"},{r:"9",s:"♦"},{r:"J",s:"♣"},{r:"A",s:"♠"}],
  ];

  const newRound=useCallback(()=>{
    const i1=Math.floor(Math.random()*10);let i2=i1;while(i2===i1)i2=Math.floor(Math.random()*10);
    setRound({a:i1,b:i2});setChoice(null);
  },[]);
  useEffect(()=>{newRound();},[newRound]);
  if(!round) return null;

  const correct=round.a<round.b?"a":"b";
  const pick=(side)=>{if(choice)return;setChoice(side);const ok=side===correct;onScore(ok);setStreak(ok?streak+1:0);};

  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <Btn onClick={onBack} color="#888" size="sm">← Back</Btn>
        <h2 style={{fontFamily:"'Lilita One'",fontSize:22,color:"#7209b7",margin:0}}>🧠 Which Hand Wins?</h2>
      </div>
      {streak>=3&&<div style={{textAlign:"center",fontFamily:"'Lilita One'",color:"#e63946",fontSize:18,marginBottom:8}}>🔥 {streak} in a row!</div>}
      <CoachBubble text={choice?choice===correct?"You got it! 🎉":"Not quite — the hand that's harder to get is the winner! Look at the rankings if you need help.":"Tap the hand you think would WIN in a showdown!"} strength={choice?choice===correct?"great":"weak":"good"} />
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {["a","b"].map(side=>{
          const idx=round[side];const h=HAND_DATA[idx];
          const isRight=choice&&side===correct;const isWrong=choice&&side===choice&&side!==correct;
          return (
            <div key={side} onClick={()=>pick(side)} style={{
              background:isRight?"#d4edda":isWrong?"#f8d7da":"#fff",
              border:isRight?"3px solid #2a9d8f":isWrong?"3px solid #e63946":"2.5px solid #ddd",
              borderRadius:20,padding:18,cursor:choice?"default":"pointer",textAlign:"center",
              transition:"all 0.2s",transform:choice?isRight?"scale(1.02)":"scale(0.98)":"none",
            }}>
              <div style={{fontFamily:"'Lilita One'",fontSize:18,color:"#1a1a2e",marginBottom:8}}>{h.emoji} {h.name}</div>
              <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",marginBottom:6}}>
                {examples[idx].map((c,j)=><PlayingCard key={j} card={c}/>)}
              </div>
              <div style={{fontFamily:"'Fredoka'",fontSize:13,color:"#888"}}>{h.desc}</div>
            </div>
          );
        })}
      </div>
      {choice&&(
        <div style={{textAlign:"center",marginTop:18}}>
          <Btn onClick={newRound} color="#7209b7" size="lg">Next Question →</Btn>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PLAY SCREEN — Five Card Draw with Coach
   ═══════════════════════════════════════════ */
function PlayScreen({onBack,onResult}){
  const [phase,setPhase]=useState("ready");
  // ready → dealt → discarding → drawing → showdown
  const [deck,setDeck]=useState([]);
  const [myCards,setMyCards]=useState([]);
  const [cpuCards,setCpuCards]=useState([]);
  const [selected,setSelected]=useState(new Set());
  const [myChips,setMyChips]=useState(100);
  const [cpuChips,setCpuChips]=useState(100);
  const [pot,setPot]=useState(0);
  const [analysis,setAnalysis]=useState(null);
  const [coachMsg,setCoachMsg]=useState({text:"Hey there! 🐻 Ready to play some Five Card Draw? I'll help you every step of the way! Tap Deal to start!",strength:"good",emoji:"🐻"});
  const [showHints,setShowHints]=useState(true);
  const [result,setResult]=useState(null);
  const [cpuDiscarded,setCpuDiscarded]=useState(0);
  const [isNew,setIsNew]=useState(false);

  const deal=()=>{
    const d=shuffle(makeDeck());
    const my=d.slice(0,5);const cpu=d.slice(5,10);
    setMyCards(my);setCpuCards(cpu);setDeck(d.slice(10));
    setSelected(new Set());setResult(null);setCpuDiscarded(0);setIsNew(true);
    const ante=5;
    setMyChips(c=>c-ante);setCpuChips(c=>c-ante);setPot(ante*2);
    setPhase("dealt");
    setTimeout(()=>{
      const a=analyzeHand(my);
      setAnalysis(a);
      setCoachMsg({
        text:`You got your 5 cards! Let me take a look... You have: ${a.handName}! ${a.hint}`,
        strength:a.strength,emoji:"🐻",
      });
      setIsNew(false);
    },600);
  };

  const toggleCard=(id)=>{
    if(phase!=="dealt"&&phase!=="discarding") return;
    setPhase("discarding");
    const s=new Set(selected);
    if(s.has(id))s.delete(id);else{if(s.size>=3){setCoachMsg({text:"You can only swap up to 3 cards! Tap a selected card to unselect it.",strength:"weak",emoji:"🐻"});return;}s.add(id);}
    setSelected(s);
    // Update coach based on selection
    if(analysis){
      const selArr=[...s];
      const allHintDisc=selArr.every(id=>analysis.discard.includes(id));
      const selHintKeep=selArr.some(id=>analysis.keep.includes(id));
      if(s.size===0){
        setCoachMsg({text:`Tap the cards you want to swap! ${analysis.hint}`,strength:analysis.strength,emoji:"🐻"});
      } else if(allHintDisc&&s.size===analysis.discard.length){
        setCoachMsg({text:"Perfect picks! 🌟 That's exactly what I would do! Hit 'Swap Cards' when you're ready!",strength:"great",emoji:"🐻"});
      } else if(allHintDisc){
        setCoachMsg({text:`Good choices so far! ${analysis.discard.length>s.size?`You could swap ${analysis.discard.length-s.size} more!`:""}`,strength:"good",emoji:"🐻"});
      } else if(selHintKeep){
        setCoachMsg({text:"Hmm, are you sure? 🤔 That card is part of your best hand! You might want to keep it! Look for the 👋 cards instead.",strength:"weak",emoji:"🐻"});
      } else {
        setCoachMsg({text:`You've picked ${s.size} card${s.size>1?"s":""} to swap. Hit 'Swap Cards' when ready, or tap cards to change your mind!`,strength:"okay",emoji:"🐻"});
      }
    }
  };

  const doDiscard=()=>{
    setIsNew(true);
    // CPU discard
    const cpuDisc=cpuDiscard(cpuCards);
    const cpuKept=cpuCards.filter(c=>!cpuDisc.includes(c.id));
    setCpuDiscarded(cpuDisc.length);
    let deckCopy=[...deck];
    const cpuNew=deckCopy.splice(0,cpuDisc.length);
    const newCpu=[...cpuKept,...cpuNew];
    setCpuCards(newCpu);

    // My discard
    const selArr=[...selected];
    const myKept=myCards.filter(c=>!selArr.includes(c.id));
    const myNew=deckCopy.splice(0,selArr.length);
    const newMy=[...myKept,...myNew];
    setMyCards(newMy);setDeck(deckCopy);setSelected(new Set());
    setPhase("drawing");

    setTimeout(()=>{
      const newA=analyzeHand(newMy);
      const improved=evalHand(newMy).rank>(analysis?evalHand(myCards).rank:-1);
      setAnalysis(newA);
      setCoachMsg({
        text:`You swapped ${selArr.length} card${selArr.length!==1?"s":""}${cpuDisc.length>0?` and the robot swapped ${cpuDisc.length}`:""}.${improved?` 🎉 Your hand got BETTER! You now have: ${newA.handName}!`:` You now have: ${newA.handName}. ${newA.strength==="weak"?"That's okay — not every draw works out!":"Not bad!"}`} Ready for the showdown?`,
        strength:improved?"great":newA.strength,emoji:"🐻",
      });
      setIsNew(false);
    },500);
  };

  const keepAll=()=>{
    setSelected(new Set());
    setIsNew(true);
    // CPU still discards
    const cpuDisc=cpuDiscard(cpuCards);
    const cpuKept=cpuCards.filter(c=>!cpuDisc.includes(c.id));
    setCpuDiscarded(cpuDisc.length);
    let deckCopy=[...deck];
    const cpuNew=deckCopy.splice(0,cpuDisc.length);
    setCpuCards([...cpuKept,...cpuNew]);
    setDeck(deckCopy);
    setPhase("drawing");
    setTimeout(()=>{
      setCoachMsg({text:`You kept all your cards! Smart if you like your hand! The robot swapped ${cpuDisc.length} card${cpuDisc.length!==1?"s":""}. Ready for the showdown?`,strength:analysis?.strength||"good",emoji:"🐻"});
      setIsNew(false);
    },400);
  };

  const showdown=()=>{
    const myR=evalHand(myCards);const cpuR=evalHand(cpuCards);
    let winner,msg;
    if(myR.rank>cpuR.rank){
      winner="you";
      setMyChips(c=>c+pot);
      msg=`🎉🎉🎉 YOU WIN! Your ${myR.name} beats the robot's ${cpuR.name}! You won $${pot}! Amazing!`;
    } else if(cpuR.rank>myR.rank){
      winner="cpu";
      setCpuChips(c=>c+pot);
      msg=`The robot wins this one with ${cpuR.name}. Your ${myR.name} wasn't strong enough. That's okay — let's try again!`;
    } else {
      winner="tie";
      setMyChips(c=>c+pot/2);setCpuChips(c=>c+pot/2);
      msg=`It's a tie! You both had ${myR.name}. The pot gets split. What a match!`;
    }
    setPot(0);
    setResult({winner,myHand:myR.name,cpuHand:cpuR.name});
    setCoachMsg({text:msg,strength:winner==="you"?"amazing":winner==="tie"?"good":"weak",emoji:winner==="you"?"🎉":"🐻"});
    setPhase("showdown");
    onResult(winner==="you");
  };

  const fold=()=>{
    setCpuChips(c=>c+pot);setPot(0);
    setResult({winner:"fold"});
    setCoachMsg({text:"You folded! That's okay — smart players fold when their hand is weak. Saving chips for a better hand is a PRO move! 🧠",strength:"okay",emoji:"🐻"});
    setPhase("showdown");
    onResult(false);
  };

  const isShowdown=phase==="showdown";

  return (
    <div style={{padding:16}}>
      <style>{`
        @keyframes cardPop { from{opacity:0;transform:translateY(20px) scale(0.8)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes confettiBurst { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-120px) scale(0.3)} }
      `}</style>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Btn onClick={onBack} color="#888" size="sm">← Back</Btn>
          <h2 style={{fontFamily:"'Lilita One'",fontSize:20,color:"#2a9d8f",margin:0}}>🎮 Five Card Draw</h2>
        </div>
        <label style={{fontFamily:"'Fredoka'",fontSize:13,color:"#888",display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
          <input type="checkbox" checked={showHints} onChange={e=>setShowHints(e.target.checked)} style={{width:18,height:18,accentColor:"#2a9d8f"}}/>
          Show Hints
        </label>
      </div>

      {/* Coach */}
      <CoachBubble text={coachMsg.text} strength={coachMsg.strength} emoji={coachMsg.emoji}/>

      {/* Table */}
      <div style={{
        background:"linear-gradient(170deg,#1a5c38,#14532d)",
        borderRadius:28,padding:"20px 14px",marginBottom:14,
        boxShadow:"inset 0 4px 30px #00000055,0 6px 24px #00000020",
        border:"4px solid #c9a85c",position:"relative",overflow:"hidden",
      }}>
        {/* Felt texture overlay */}
        <div style={{position:"absolute",inset:0,opacity:0.04,
          backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"12px 12px",pointerEvents:"none"}}/>

        {/* CPU area */}
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Fredoka'",fontSize:13,color:"#fff9",marginBottom:6}}>
            🤖 Robot {cpuDiscarded>0&&phase!=="dealt"?`(swapped ${cpuDiscarded})`:""}
          </div>
          <div style={{display:"flex",gap:6,justifyContent:"center"}}>
            {cpuCards.length>0?cpuCards.map((c,i)=>
              <PlayingCard key={c.id} card={c} faceDown={!isShowdown}/>
            ):Array.from({length:5},(_,i)=>
              <div key={i} style={{width:78,height:112,borderRadius:14,border:"2px dashed #ffffff22",background:"#ffffff08"}}/>
            )}
          </div>
          <div style={{marginTop:8}}><ChipStack chips={cpuChips}/></div>
        </div>

        {/* Pot */}
        {pot>0&&(
          <div style={{textAlign:"center",margin:"8px 0 14px"}}>
            <span style={{
              fontFamily:"'Lilita One'",fontSize:22,color:"#ffd60a",
              background:"#00000055",padding:"6px 22px",borderRadius:24,
              boxShadow:"0 0 20px #ffd60a22",
            }}>🏆 Pot: ${pot}</span>
          </div>
        )}

        {/* My cards */}
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Fredoka'",fontSize:13,color:"#fff9",marginBottom:8}}>🙋 Your Cards {phase==="discarding"&&selected.size>0?`(${selected.size} selected to swap)`:""}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {myCards.length>0?myCards.map((c,i)=>(
              <PlayingCard key={c.id} card={c}
                selected={selected.has(c.id)}
                hintDiscard={showHints&&analysis?.discard.includes(c.id)&&!selected.has(c.id)&&(phase==="dealt"||phase==="discarding")}
                hintKeep={showHints&&analysis?.keep.includes(c.id)&&!selected.has(c.id)&&(phase==="dealt"||phase==="discarding")}
                onClick={()=>toggleCard(c.id)}
                disabled={phase!=="dealt"&&phase!=="discarding"}
                isNew={isNew} delay={i*80}
              />
            )):Array.from({length:5},(_,i)=>
              <div key={i} style={{width:78,height:112,borderRadius:14,border:"2px dashed #ffffff22",background:"#ffffff08"}}/>
            )}
          </div>
          <div style={{marginTop:10}}><ChipStack chips={myChips}/></div>
        </div>
      </div>

      {/* Hint legend */}
      {showHints&&(phase==="dealt"||phase==="discarding")&&analysis&&(
        <div style={{
          display:"flex",gap:16,justifyContent:"center",marginBottom:10,
          fontFamily:"'Fredoka'",fontSize:13,color:"#666",flexWrap:"wrap",
        }}>
          <span>✅ = Keep</span>
          <span>👋 = Swap this one</span>
          <span style={{color:"#f72585"}}>SWAP = You picked it</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:14}}>
        {phase==="ready"&&(
          <Btn onClick={deal} color="#2a9d8f" size="lg" disabled={myChips<5}>
            {myChips<5?"Out of chips!":"Deal Cards! 🃏"}
          </Btn>
        )}
        {(phase==="dealt"||phase==="discarding")&&(
          <>
            <Btn onClick={doDiscard} color="#4361ee" size="lg" disabled={selected.size===0}>
              Swap {selected.size} Card{selected.size!==1?"s":""} 🔄
            </Btn>
            <Btn onClick={keepAll} color="#2a9d8f" outline>Keep All ✋</Btn>
            <Btn onClick={fold} color="#888" size="sm">Fold 🫣</Btn>
          </>
        )}
        {phase==="drawing"&&(
          <>
            <Btn onClick={()=>{setPot(p=>p+10);setMyChips(c=>c-5);setCpuChips(c=>c-5);setCoachMsg({text:"You raised $5! Bold move! 💪 Now let's see who wins!",strength:"good",emoji:"🐻"});}} color="#f72585" disabled={myChips<5}>Bet $5 🪙</Btn>
            <Btn onClick={showdown} color="#ffd60a" size="lg"><span style={{color:"#1a1a2e"}}>Showdown! 🃏</span></Btn>
          </>
        )}
        {phase==="showdown"&&(
          <Btn onClick={()=>{setPhase("ready");setMyCards([]);setCpuCards([]);setResult(null);setAnalysis(null);setSelected(new Set());setCpuDiscarded(0);
            setCoachMsg({text:myChips<5?"Uh oh, you're out of chips! But that's how you learn! 🐻":"Great game! Ready for another hand? Tap Deal!",strength:"good",emoji:"🐻"});
          }} color="#2a9d8f" size="lg">
            {myChips<5?"Start Over 🔄":"New Hand! 🃏"}
          </Btn>
        )}
      </div>

      {/* Result banner */}
      {result&&result.winner!=="fold"&&(
        <div style={{
          background:result.winner==="you"?"linear-gradient(135deg,#d4edda,#c3e6cb)":result.winner==="tie"?"#fff3cd":"#f8d7da",
          borderRadius:20,padding:18,textAlign:"center",fontFamily:"'Fredoka'",
          border:`3px solid ${result.winner==="you"?"#2a9d8f":result.winner==="tie"?"#ffc107":"#e63946"}`,
          marginBottom:12,boxShadow:"0 4px 20px #00000012",position:"relative",overflow:"hidden",
        }}>
          {result.winner==="you"&&(
            <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
              {["🎉","⭐","🌟","✨","🎊"].map((e,i)=>(
                <span key={i} style={{
                  fontSize:24,position:"absolute",
                  left:`${15+i*18}%`,top:"10%",
                  animation:`confettiBurst 1.5s ${i*0.15}s both`,
                }}>{e}</span>
              ))}
            </div>
          )}
          <div style={{fontSize:22,fontWeight:700,marginBottom:4,position:"relative"}}>
            {result.winner==="you"?"🎉 YOU WIN! 🎉":result.winner==="tie"?"🤝 Tie Game!":"🤖 Robot Wins!"}
          </div>
          <div style={{fontSize:14,color:"#555",position:"relative"}}>
            You: <b>{result.myHand}</b> &nbsp;vs&nbsp; Robot: <b>{result.cpuHand}</b>
          </div>
        </div>
      )}

      {/* How to play reminder */}
      {phase==="ready"&&(
        <div style={{
          background:"#f8f6f0",borderRadius:18,padding:"16px 18px",
          fontFamily:"'Fredoka'",fontSize:14,color:"#666",lineHeight:1.6,
          border:"2px dashed #e0d8c8",
        }}>
          <div style={{fontFamily:"'Lilita One'",fontSize:16,color:"#1a1a2e",marginBottom:6}}>📖 How Five Card Draw Works:</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div>1️⃣ <b>Deal</b> — You and the robot each get 5 cards</div>
            <div>2️⃣ <b>Look</b> — Coach Bear tells you what you have</div>
            <div>3️⃣ <b>Swap</b> — Pick cards to throw away and get new ones</div>
            <div>4️⃣ <b>Showdown</b> — Flip the cards and see who wins!</div>
          </div>
        </div>
      )}

      {myChips<=0&&phase==="showdown"&&(
        <div style={{textAlign:"center",marginTop:10}}>
          <Btn onClick={()=>{setMyChips(100);setCpuChips(100);}} color="#4361ee">Reset Chips to $100 🔄</Btn>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════ */
export default function PokerPals(){
  const [screen,setScreen]=useState("home");
  const [stats,setStats]=useState({handsPlayed:0,wins:0,quizCorrect:0,quizTotal:0});

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#fef9ef,#f0e6d3)",maxWidth:540,margin:"0 auto",paddingBottom:40}}>
      <style>{fonts}{`
        @keyframes cardPop { from{opacity:0;transform:translateY(20px) scale(0.8)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes confettiBurst { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-100px) scale(0.2)} }
        * { box-sizing: border-box; }
      `}</style>
      {screen==="home"&&<HomeScreen onNav={setScreen} stats={stats}/>}
      {screen==="hands"&&<HandsScreen onBack={()=>setScreen("home")}/>}
      {screen==="quiz"&&<QuizScreen onBack={()=>setScreen("home")} onScore={(ok)=>setStats(s=>({...s,quizCorrect:s.quizCorrect+(ok?1:0),quizTotal:s.quizTotal+1}))}/>}
      {screen==="play"&&<PlayScreen onBack={()=>setScreen("home")} onResult={(won)=>setStats(s=>({...s,handsPlayed:s.handsPlayed+1,wins:s.wins+(won?1:0)}))}/>}
    </div>
  );
}
