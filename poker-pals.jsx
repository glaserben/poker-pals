import { useState, useEffect, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const SUITS = ["♠","♥","♦","♣"];
const SUIT_COLORS = {"♠":"#2b2d42","♥":"#e63946","♦":"#e76f51","♣":"#2b2d42"};
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13,A:14};

const HAND_DATA = [
  {name:"Royal Flush",emoji:"👑",stars:10,desc:"A K Q J 10 all the same suit!"},
  {name:"Straight Flush",emoji:"🌈",stars:9,desc:"5 in a row, same suit!"},
  {name:"Four of a Kind",emoji:"🍀",stars:8,desc:"4 cards with the same number!"},
  {name:"Full House",emoji:"🏠",stars:7,desc:"3 of one + 2 of another!"},
  {name:"Flush",emoji:"💎",stars:6,desc:"All 5 cards same suit!"},
  {name:"Straight",emoji:"➡️",stars:5,desc:"5 cards in a row!"},
  {name:"Three of a Kind",emoji:"🎯",stars:4,desc:"3 cards same number!"},
  {name:"Two Pair",emoji:"👯",stars:3,desc:"2 different pairs!"},
  {name:"One Pair",emoji:"✌️",stars:2,desc:"2 cards same number!"},
  {name:"High Card",emoji:"☝️",stars:1,desc:"Nothing matches — biggest card counts!"},
];

const HAND_EXAMPLES = [
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

/* group highlight colors for matched cards */
const GROUP_COLORS = [
  {bg:"#dbeafe",border:"#3b82f6",glow:"#3b82f680"},
  {bg:"#fce7f3",border:"#ec4899",glow:"#ec489980"},
  {bg:"#d1fae5",border:"#10b981",glow:"#10b98180"},
  {bg:"#fef3c7",border:"#f59e0b",glow:"#f59e0b80"},
];

/* ═══════════════════════════════════════════
   DECK & EVAL HELPERS
   ═══════════════════════════════════════════ */
function makeDeck(){const d=[];for(const s of SUITS)for(const r of RANKS)d.push({r,s,id:r+s});return d;}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

function evalHand(cards){
  if(!cards||cards.length<5) return {rank:-1,name:"?"};
  const sorted=[...cards].sort((a,b)=>RV[b.r]-RV[a.r]);
  const vals=sorted.map(c=>RV[c.r]);
  const suits=sorted.map(c=>c.s);
  const isFlush=suits.every(s=>s===suits[0]);
  const isStr=vals[0]-vals[4]===4&&new Set(vals).size===5;
  const isWheel=vals[0]===14&&vals[1]===5&&vals[2]===4&&vals[3]===3&&vals[4]===2;
  const isStraight=isStr||isWheel;
  const counts={};vals.forEach(v=>counts[v]=(counts[v]||0)+1);
  const freq=Object.values(counts).sort((a,b)=>b-a);
  if(isFlush&&isStraight&&vals[0]===14&&!isWheel) return {rank:9,name:"Royal Flush"};
  if(isFlush&&isStraight) return {rank:8,name:"Straight Flush"};
  if(freq[0]===4) return {rank:7,name:"Four of a Kind"};
  if(freq[0]===3&&freq[1]===2) return {rank:6,name:"Full House"};
  if(isFlush) return {rank:5,name:"Flush"};
  if(isStraight) return {rank:4,name:"Straight"};
  if(freq[0]===3) return {rank:3,name:"Three of a Kind"};
  if(freq[0]===2&&freq[1]===2) return {rank:2,name:"Two Pair"};
  if(freq[0]===2) return {rank:1,name:"One Pair"};
  return {rank:0,name:"High Card"};
}

/* ═══════════════════════════════════════════
   HINT ENGINE — returns keep/discard + card groups
   ═══════════════════════════════════════════ */
function analyzeHand(cards){
  const counts={};const suitCounts={};
  cards.forEach(c=>{counts[c.r]=(counts[c.r]||0)+1;suitCounts[c.s]=(suitCounts[c.s]||0)+1;});
  const sorted=[...cards].sort((a,b)=>RV[b.r]-RV[a.r]);
  const vals=sorted.map(c=>RV[c.r]);
  const result=evalHand(cards);

  /* cardGroups: map card.id -> group index (for color coding) */
  const cardGroups={};
  let groupIdx=0;

  /* assign groups based on what matches */
  const pairRanks=Object.entries(counts).filter(([,v])=>v>=2).map(([k])=>k);
  pairRanks.forEach(pr=>{
    cards.filter(c=>c.r===pr).forEach(c=>{cardGroups[c.id]=groupIdx;});
    groupIdx++;
  });

  /* flush grouping */
  const flushSuit=Object.entries(suitCounts).find(([,v])=>v>=4);
  if(flushSuit&&pairRanks.length===0){
    cards.filter(c=>c.s===flushSuit[0]).forEach(c=>{cardGroups[c.id]=groupIdx;});
    groupIdx++;
  }

  /* straight grouping */
  const uvals=[...new Set(vals)].sort((a,b)=>a-b);
  let straightCards=null;
  for(let i=0;i<=uvals.length-4;i++){
    if(uvals[i+3]-uvals[i]<=4){
      straightCards=uvals.slice(i,i+4);break;
    }
  }
  if(straightCards&&pairRanks.length===0&&!flushSuit){
    cards.filter(c=>straightCards.includes(RV[c.r])).forEach(c=>{
      if(!cardGroups[c.id]&&cardGroups[c.id]!==0){cardGroups[c.id]=groupIdx;}
    });
  }

  /* Already great — keep everything */
  if(result.rank>=5){
    cards.forEach(c=>{if(!cardGroups[c.id]&&cardGroups[c.id]!==0)cardGroups[c.id]=0;});
    return {keep:cards.map(c=>c.id),discard:[],
      coachEmoji:"🤩",coachLine:"WOW! Don't change anything!",
      strength:result.rank/9,handName:result.name,cardGroups};
  }
  if(result.rank===7){
    const quadR=Object.entries(counts).find(([,v])=>v===4)[0];
    return {keep:cards.filter(c=>c.r===quadR).map(c=>c.id),
      discard:cards.filter(c=>c.r!==quadR).map(c=>c.id),
      coachEmoji:"🤩",coachLine:"Four matches! Swap the loner!",
      strength:0.85,handName:result.name,cardGroups};
  }
  if(result.rank===6){
    return {keep:cards.map(c=>c.id),discard:[],
      coachEmoji:"😍",coachLine:"Full House! Keep them all!",
      strength:0.75,handName:result.name,cardGroups};
  }
  if(result.rank===3){
    const tripR=Object.entries(counts).find(([,v])=>v===3)[0];
    return {keep:cards.filter(c=>c.r===tripR).map(c=>c.id),
      discard:cards.filter(c=>c.r!==tripR).map(c=>c.id),
      coachEmoji:"😊",coachLine:"Triple! Swap the other two!",
      strength:0.55,handName:"Three of a Kind",cardGroups};
  }
  if(result.rank===2){
    const prs=Object.entries(counts).filter(([,v])=>v===2).map(([k])=>k);
    return {keep:cards.filter(c=>prs.includes(c.r)).map(c=>c.id),
      discard:cards.filter(c=>!prs.includes(c.r)).map(c=>c.id),
      coachEmoji:"😊",coachLine:"Two pairs! Swap the odd one!",
      strength:0.4,handName:"Two Pair",cardGroups};
  }
  if(result.rank===1){
    const pairR=Object.entries(counts).find(([,v])=>v===2)[0];
    return {keep:cards.filter(c=>c.r===pairR).map(c=>c.id),
      discard:cards.filter(c=>c.r!==pairR).map(c=>c.id),
      coachEmoji:"🙂",coachLine:"A pair! Swap the other three!",
      strength:0.25,handName:"One Pair",cardGroups};
  }
  if(flushSuit){
    return {keep:cards.filter(c=>c.s===flushSuit[0]).map(c=>c.id),
      discard:cards.filter(c=>c.s!==flushSuit[0]).map(c=>c.id),
      coachEmoji:"🤔",coachLine:"Almost a flush! Swap the odd one!",
      strength:0.2,handName:"Flush Draw",cardGroups};
  }
  if(straightCards){
    const keepIds=[];const discIds=[];
    cards.forEach(c=>{
      if(straightCards.includes(RV[c.r])&&!keepIds.some(k=>{const kc=cards.find(x=>x.id===k);return kc&&RV[kc.r]===RV[c.r];})){
        keepIds.push(c.id);
      } else discIds.push(c.id);
    });
    if(keepIds.length===4&&discIds.length===1){
      return {keep:keepIds,discard:discIds,
        coachEmoji:"🤔",coachLine:"Almost a straight! Swap one!",
        strength:0.15,handName:"Straight Draw",cardGroups};
    }
  }
  const keepCards=sorted.slice(0,2).map(c=>c.id);
  const discCards=sorted.slice(2).map(c=>c.id);
  return {keep:keepCards,discard:discCards,
    coachEmoji:"😬",coachLine:"No matches. Swap three!",
    strength:0.05,handName:"High Card",cardGroups};
}

function cpuDiscard(cards){return analyzeHand(cards).discard;}

/* ═══════════════════════════════════════════
   CSS ANIMATIONS (injected once)
   ═══════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Lilita+One&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}

@keyframes floatUp {
  0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)}
}
@keyframes sinkDown {
  0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)}
}
@keyframes popIn {
  from{opacity:0;transform:scale(0.7) translateY(16px)}
  to{opacity:1;transform:scale(1) translateY(0)}
}
@keyframes selectedBounce {
  0%,100%{transform:translateY(14px) scale(0.93)} 50%{transform:translateY(18px) scale(0.91)}
}
@keyframes bigEmoji {
  0%{transform:scale(0.3) rotate(-20deg);opacity:0}
  60%{transform:scale(1.15) rotate(5deg);opacity:1}
  100%{transform:scale(1) rotate(0deg);opacity:1}
}
@keyframes meterFill {
  from{height:0%} to{height:var(--target-height)}
}
@keyframes confetti {
  0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}
  100%{opacity:0;transform:translateY(-160px) rotate(360deg) scale(0.2)}
}
@keyframes fadeUp {
  from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)}
}
@keyframes pulse {
  0%,100%{box-shadow:0 0 0 0 var(--pulse-color,#3b82f644)}
  50%{box-shadow:0 0 0 10px var(--pulse-color,#3b82f600)}
}
@keyframes bounce {
  0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)}
}
`;

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */

function PlayingCard({card,faceDown,action,groupColor,selected,onClick,disabled,animDelay=0}){
  /* action: "keep" | "discard" | "selected" | null */
  const isKeep=action==="keep";
  const isDiscard=action==="discard";
  const isSel=action==="selected"||selected;

  let bg="#fffef5";
  let border="#d4cfc0";
  let shadow="0 3px 10px #00000018";
  let anim="";
  let extraStyle={};

  if(faceDown){
    bg="linear-gradient(135deg,#4361ee,#7209b7)";border="#3a50d4";
  } else if(isSel){
    bg="#fde8ea";border="#e63946";shadow="0 6px 20px #e6394644";
    anim="selectedBounce 1.2s ease-in-out infinite";
  } else if(isKeep&&groupColor){
    bg=groupColor.bg;border=groupColor.border;shadow=`0 0 16px ${groupColor.glow}`;
    anim="floatUp 2s ease-in-out infinite";
    extraStyle={"--pulse-color":groupColor.glow};
  } else if(isKeep){
    bg="#d1fae5";border="#10b981";shadow="0 0 14px #10b98155";
    anim="floatUp 2s ease-in-out infinite";
  } else if(isDiscard){
    bg="#f3f4f6";border="#d1d5db";shadow="0 2px 6px #00000010";
    anim="sinkDown 1.5s ease-in-out infinite";
    extraStyle={opacity:0.6,filter:"saturate(0.3)"};
  }

  return (
    <div onClick={disabled?undefined:onClick} style={{
      width:74,height:106,borderRadius:14,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",cursor:disabled?"default":onClick?"pointer":"default",
      background:bg,border:`3px solid ${border}`,boxShadow:shadow,
      animation:anim?`popIn 0.4s ${animDelay}ms both, ${anim}`:(`popIn 0.4s ${animDelay}ms both`),
      fontFamily:"'Fredoka',sans-serif",userSelect:"none",flexShrink:0,
      position:"relative",transition:"background 0.3s, border 0.3s, opacity 0.3s",
      ...extraStyle,
    }}>
      {faceDown?(
        <div style={{fontSize:32,opacity:0.8}}>🂠</div>
      ):(
        <>
          <div style={{fontSize:22,fontWeight:700,color:SUIT_COLORS[card.s],lineHeight:1}}>{card.r}</div>
          <div style={{fontSize:28,lineHeight:1,marginTop:2}}>{card.s}</div>
          {isSel&&<div style={{
            position:"absolute",bottom:4,left:0,right:0,textAlign:"center",
            fontSize:10,fontWeight:700,color:"#e63946",letterSpacing:1,
          }}>SWAP</div>}
          {isDiscard&&!isSel&&<div style={{
            position:"absolute",bottom:6,left:0,right:0,textAlign:"center",fontSize:16,
          }}>👋</div>}
          {isKeep&&<div style={{
            position:"absolute",top:4,right:5,fontSize:14,
          }}>✨</div>}
        </>
      )}
    </div>
  );
}

function CoachFace({emoji,line,bgColor}){
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:14,
      background:bgColor||"#f0f4ff",borderRadius:24,padding:"12px 20px",
      marginBottom:14,animation:"fadeUp 0.4s both",
      border:"2.5px solid #e8e8e8",
    }}>
      <div style={{
        fontSize:52,lineHeight:1,flexShrink:0,
        animation:"bigEmoji 0.5s both",
      }}>{emoji}</div>
      <div style={{
        fontFamily:"'Lilita One'",fontSize:19,color:"#1a1a2e",
        lineHeight:1.3,
      }}>{line}</div>
    </div>
  );
}

function StrengthMeter({value}){
  /* value 0-1 */
  const pct=Math.max(5,Math.min(100,Math.round(value*100)));
  const hue=value*120; /* 0=red, 60=yellow, 120=green */
  const color=`hsl(${hue},75%,50%)`;
  const bgColor=`hsl(${hue},75%,92%)`;
  const labels=[
    {min:0,emoji:"😬",text:"Weak"},
    {min:0.15,emoji:"🤔",text:"Okay"},
    {min:0.35,emoji:"🙂",text:"Good"},
    {min:0.55,emoji:"😊",text:"Great"},
    {min:0.75,emoji:"🤩",text:"WOW!"},
  ];
  const label=labels.slice().reverse().find(l=>value>=l.min)||labels[0];

  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{
        width:36,height:120,borderRadius:18,background:"#e5e7eb",
        position:"relative",overflow:"hidden",border:"2px solid #d1d5db",
      }}>
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          background:`linear-gradient(to top, ${color}, ${bgColor})`,
          borderRadius:16,transition:"height 0.8s cubic-bezier(.34,1.56,.64,1)",
          height:`${pct}%`,
        }}/>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:28}}>{label.emoji}</div>
        <div style={{fontFamily:"'Lilita One'",fontSize:13,color}}>{label.text}</div>
      </div>
    </div>
  );
}

function BigButton({children,onClick,color="#2a9d8f",disabled}){
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily:"'Lilita One'",fontSize:24,
      padding:"18px 48px",background:disabled?"#ccc":color,
      color:disabled?"#888":"#fff",border:"none",borderRadius:60,
      cursor:disabled?"not-allowed":"pointer",
      boxShadow:disabled?"none":`0 6px 24px ${color}44`,
      transition:"all 0.15s",letterSpacing:0.5,width:"100%",maxWidth:340,
      animation:"fadeUp 0.4s both",
    }}>{children}</button>
  );
}

function SmallBtn({children,onClick,color="#888"}){
  return (
    <button onClick={onClick} style={{
      fontFamily:"'Fredoka'",fontSize:14,fontWeight:600,
      padding:"8px 18px",background:"transparent",
      color,border:`2px solid ${color}`,borderRadius:30,
      cursor:"pointer",transition:"all 0.15s",
    }}>{children}</button>
  );
}

function ChipDisplay({label,chips,color}){
  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"'Fredoka'",fontSize:11,color:"#fff9",marginBottom:2}}>{label}</div>
      <div style={{
        display:"inline-flex",alignItems:"center",gap:4,
        background:"#00000044",padding:"4px 14px",borderRadius:20,
      }}>
        <span style={{fontSize:14}}>🪙</span>
        <span style={{fontFamily:"'Lilita One'",fontSize:18,color:color||"#ffd60a"}}>${chips}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME SCREEN
   ═══════════════════════════════════════════ */
function HomeScreen({onNav,stats}){
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,padding:"28px 16px"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:72,animation:"bounce 2s infinite"}}>🐻</div>
        <h1 style={{fontFamily:"'Lilita One'",fontSize:36,color:"#1a1a2e",margin:"4px 0 0"}}>Poker Pals</h1>
        <p style={{fontFamily:"'Fredoka'",fontSize:15,color:"#888",margin:"4px 0 0"}}>Learn cards with Coach Bear!</p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:360}}>
        {[
          {key:"play",emoji:"🎮",label:"Play & Learn!",desc:"Coach Bear helps every move",color:"#2a9d8f"},
          {key:"hands",emoji:"📚",label:"Hand Rankings",desc:"Best to worst — tap to see!",color:"#4361ee"},
          {key:"quiz",emoji:"🧠",label:"Quiz Time!",desc:"Pick the winning hand!",color:"#7209b7"},
        ].map((item,i)=>(
          <div key={item.key} onClick={()=>onNav(item.key)} style={{
            display:"flex",alignItems:"center",gap:16,padding:"18px 22px",
            background:"#fff",borderRadius:22,cursor:"pointer",
            border:"2.5px solid #eee",boxShadow:"0 3px 14px #00000008",
            transition:"all 0.2s",animation:`fadeUp 0.4s ${i*100}ms both`,
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
          {stats.handsPlayed>0&&<span>🎮 <b style={{color:"#2a9d8f"}}>{stats.handsPlayed}</b> played</span>}
          {stats.wins>0&&<span>🏆 <b style={{color:"#4361ee"}}>{stats.wins}</b> wins</span>}
          {stats.quizTotal>0&&<span>🧠 <b style={{color:"#7209b7"}}>{stats.quizCorrect}{"/"}{stats.quizTotal}</b></span>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HAND RANKINGS SCREEN
   ═══════════════════════════════════════════ */
function HandsScreen({onBack}){
  const [open,setOpen]=useState(null);
  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <SmallBtn onClick={onBack}>← Back</SmallBtn>
        <h2 style={{fontFamily:"'Lilita One'",fontSize:22,color:"#4361ee",margin:0}}>📚 Hand Rankings</h2>
      </div>
      <CoachFace emoji="🐻" line="Best hands on top! Tap to see cards!" bgColor="#dbeafe"/>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {HAND_DATA.map((h,i)=>(
          <div key={i} onClick={()=>setOpen(open===i?null:i)} style={{
            background:"#fff",borderRadius:18,padding:"14px 16px",cursor:"pointer",
            border:open===i?"3px solid #4361ee":"2.5px solid #eee",
            transition:"all 0.2s",animation:`fadeUp 0.3s ${i*40}ms both`,
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
              <div style={{display:"flex",gap:1}}>
                {Array.from({length:5},(_,j)=>(
                  <span key={j} style={{fontSize:12,opacity:j<Math.ceil(h.stars/2)?1:0.15}}>⭐</span>
                ))}
              </div>
            </div>
            {open===i&&(
              <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",marginTop:12}}>
                {HAND_EXAMPLES[i].map((c,j)=><PlayingCard key={j} card={c} animDelay={j*60}/>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   QUIZ SCREEN
   ═══════════════════════════════════════════ */
function QuizScreen({onBack,onScore}){
  const [round,setRound]=useState(null);
  const [choice,setChoice]=useState(null);
  const [streak,setStreak]=useState(0);

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
        <SmallBtn onClick={onBack}>← Back</SmallBtn>
        <h2 style={{fontFamily:"'Lilita One'",fontSize:22,color:"#7209b7",margin:0}}>🧠 Which Wins?</h2>
      </div>
      {streak>=3&&<div style={{textAlign:"center",fontFamily:"'Lilita One'",color:"#e63946",fontSize:20,marginBottom:8}}>🔥 {streak} in a row!</div>}
      <CoachFace
        emoji={!choice?"🤔":choice===correct?"🎉":"🐻"}
        line={!choice?"Tap the winner!":choice===correct?"You got it!":"The rarer hand wins!"}
        bgColor={!choice?"#fef3c7":choice===correct?"#d1fae5":"#fde8ea"}
      />
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {["a","b"].map(side=>{
          const idx=round[side];const h=HAND_DATA[idx];
          const isRight=choice&&side===correct;const isWrong=choice&&side===choice&&side!==correct;
          return (
            <div key={side} onClick={()=>pick(side)} style={{
              background:isRight?"#d1fae5":isWrong?"#fde8ea":"#fff",
              border:isRight?"3px solid #10b981":isWrong?"3px solid #e63946":"2.5px solid #ddd",
              borderRadius:20,padding:16,cursor:choice?"default":"pointer",textAlign:"center",
              transition:"all 0.3s",transform:choice?isRight?"scale(1.02)":"scale(0.97)":"none",
            }}>
              <div style={{fontFamily:"'Lilita One'",fontSize:18,color:"#1a1a2e",marginBottom:8}}>{h.emoji} {h.name}</div>
              <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap"}}>
                {HAND_EXAMPLES[idx].map((c,j)=><PlayingCard key={j} card={c} animDelay={j*50}/>)}
              </div>
            </div>
          );
        })}
      </div>
      {choice&&(
        <div style={{textAlign:"center",marginTop:18}}>
          <BigButton onClick={newRound} color="#7209b7">Next! →</BigButton>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PLAY SCREEN — Five Card Draw, one-button flow
   ═══════════════════════════════════════════ */

/* phases: ready → dealt → showdown */
function PlayScreen({onBack,onResult}){
  const [phase,setPhase]=useState("ready");
  const [deck,setDeck]=useState([]);
  const [myCards,setMyCards]=useState([]);
  const [cpuCards,setCpuCards]=useState([]);
  const [selected,setSelected]=useState(new Set());
  const [myChips,setMyChips]=useState(100);
  const [cpuChips,setCpuChips]=useState(100);
  const [pot,setPot]=useState(0);
  const [analysis,setAnalysis]=useState(null);
  const [postSwapAnalysis,setPostSwapAnalysis]=useState(null);
  const [result,setResult]=useState(null);
  const [cpuDiscardCount,setCpuDiscardCount]=useState(0);
  const [swapped,setSwapped]=useState(false);
  const [coachState,setCoachState]=useState({emoji:"🐻",line:"Ready to play?",bg:"#f0f4ff"});
  const [animKey,setAnimKey]=useState(0);

  const currentAnalysis=swapped?postSwapAnalysis:analysis;

  const deal=()=>{
    const d=shuffle(makeDeck());
    const my=d.slice(0,5);const cpu=d.slice(5,10);
    setMyCards(my);setCpuCards(cpu);setDeck(d.slice(10));
    setSelected(new Set());setResult(null);setCpuDiscardCount(0);
    setSwapped(false);setPostSwapAnalysis(null);
    setMyChips(c=>c-5);setCpuChips(c=>c-5);setPot(10);
    setPhase("dealt");setAnimKey(k=>k+1);
    const a=analyzeHand(my);
    setAnalysis(a);
    setCoachState({emoji:a.coachEmoji,line:a.coachLine,bg:
      a.strength>0.5?"#d1fae5":a.strength>0.2?"#fef3c7":"#fde8ea"});
  };

  const toggleCard=(id)=>{
    if(phase!=="dealt"||swapped) return;
    const s=new Set(selected);
    if(s.has(id))s.delete(id);else{
      if(s.size>=3){setCoachState({emoji:"🙅",line:"Only swap up to 3!",bg:"#fde8ea"});return;}
      s.add(id);
    }
    setSelected(s);

    if(analysis){
      const selArr=[...s];
      const allGood=selArr.every(id2=>analysis.discard.includes(id2));
      const pickedKeep=selArr.some(id2=>analysis.keep.includes(id2));
      if(s.size===0){
        setCoachState({emoji:analysis.coachEmoji,line:analysis.coachLine,
          bg:analysis.strength>0.5?"#d1fae5":analysis.strength>0.2?"#fef3c7":"#fde8ea"});
      } else if(allGood&&s.size===analysis.discard.length){
        setCoachState({emoji:"⭐",line:"Perfect picks!",bg:"#d1fae5"});
      } else if(pickedKeep){
        setCoachState({emoji:"😨",line:"Keep that one! It matches!",bg:"#fde8ea"});
      } else {
        setCoachState({emoji:"👍",line:`Swapping ${s.size}. Tap the button!`,bg:"#fef3c7"});
      }
    }
  };

  const doSwap=()=>{
    const cpuDisc=cpuDiscard(cpuCards);
    const cpuKept=cpuCards.filter(c=>!cpuDisc.includes(c.id));
    setCpuDiscardCount(cpuDisc.length);
    let dk=[...deck];
    const cpuNew=dk.splice(0,cpuDisc.length);
    setCpuCards([...cpuKept,...cpuNew]);

    const selArr=[...selected];
    if(selArr.length===0){
      /* keep all */
      setDeck(dk);setSwapped(true);setAnimKey(k=>k+1);
      const pa=analyzeHand(myCards);setPostSwapAnalysis(pa);
      setCoachState({emoji:"💪",line:"Kept them all! Showdown time!",bg:"#d1fae5"});
      return;
    }

    const myKept=myCards.filter(c=>!selArr.includes(c.id));
    const myNew=dk.splice(0,selArr.length);
    const newHand=[...myKept,...myNew];
    setMyCards(newHand);setDeck(dk);setSelected(new Set());
    setSwapped(true);setAnimKey(k=>k+1);

    const pa=analyzeHand(newHand);setPostSwapAnalysis(pa);
    const oldRank=evalHand(myCards).rank;const newRank=evalHand(newHand).rank;
    if(newRank>oldRank){
      setCoachState({emoji:"🎉",line:"Your hand got BETTER!",bg:"#d1fae5"});
    } else if(newRank===oldRank){
      setCoachState({emoji:"🙂",line:"Same hand. Let's go!",bg:"#fef3c7"});
    } else {
      setCoachState({emoji:"😅",line:"Didn't improve. That's okay!",bg:"#fde8ea"});
    }
  };

  const showdown=()=>{
    const myR=evalHand(myCards);const cpuR=evalHand(cpuCards);
    let winner;
    if(myR.rank>cpuR.rank){
      winner="you";setMyChips(c=>c+pot);
      setCoachState({emoji:"🥳",line:"YOU WIN!!!",bg:"#d1fae5"});
    } else if(cpuR.rank>myR.rank){
      winner="cpu";setCpuChips(c=>c+pot);
      setCoachState({emoji:"🐻",line:"Robot wins. Next time!",bg:"#fde8ea"});
    } else {
      winner="tie";setMyChips(c=>c+pot/2);setCpuChips(c=>c+pot/2);
      setCoachState({emoji:"🤝",line:"It's a tie! Split the pot!",bg:"#fef3c7"});
    }
    setPot(0);setResult({winner,myHand:myR.name,cpuHand:cpuR.name});
    setPhase("showdown");onResult(winner==="you");
  };

  const fold=()=>{
    setCpuChips(c=>c+pot);setPot(0);
    setResult({winner:"fold"});
    setCoachState({emoji:"🧠",line:"Smart fold! Save your chips!",bg:"#fef3c7"});
    setPhase("showdown");onResult(false);
  };

  const reset=()=>{
    setPhase("ready");setMyCards([]);setCpuCards([]);setResult(null);
    setAnalysis(null);setPostSwapAnalysis(null);setSelected(new Set());
    setCpuDiscardCount(0);setSwapped(false);
    setCoachState({emoji:"🐻",line:myChips<5?"Out of chips! Resetting!":"Ready for another?",bg:"#f0f4ff"});
    if(myChips<5){setMyChips(100);setCpuChips(100);}
  };

  /* figure out card action for rendering */
  function cardAction(c){
    if(phase==="showdown"||!currentAnalysis) return null;
    if(selected.has(c.id)) return "selected";
    if(swapped) return null; /* after swap, no hints */
    if(currentAnalysis.discard.includes(c.id)) return "discard";
    if(currentAnalysis.keep.includes(c.id)) return "keep";
    return null;
  }
  function cardGroup(c){
    if(!currentAnalysis) return null;
    const gi=currentAnalysis.cardGroups[c.id];
    if(gi===undefined||gi===null) return null;
    return GROUP_COLORS[gi%GROUP_COLORS.length];
  }

  const isShowdown=phase==="showdown";

  return (
    <div style={{padding:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <SmallBtn onClick={onBack}>← Back</SmallBtn>
          <span style={{fontFamily:"'Lilita One'",fontSize:18,color:"#2a9d8f"}}>🎮 Five Card Draw</span>
        </div>
      </div>

      {/* Coach */}
      <CoachFace emoji={coachState.emoji} line={coachState.line} bgColor={coachState.bg}/>

      {/* Table + Meter side by side */}
      <div style={{display:"flex",gap:12,marginBottom:14}}>
        {/* Meter (only during play) */}
        {phase!=="ready"&&currentAnalysis&&(
          <div style={{flexShrink:0,animation:"fadeUp 0.5s both"}}>
            <StrengthMeter value={currentAnalysis.strength}/>
          </div>
        )}

        {/* Table */}
        <div style={{
          flex:1,background:"linear-gradient(170deg,#1a5c38,#14532d)",
          borderRadius:24,padding:"16px 10px",
          boxShadow:"inset 0 4px 30px #00000055,0 6px 24px #00000020",
          border:"4px solid #c9a85c",position:"relative",overflow:"hidden",
          minHeight:300,
        }}>
          {/* felt texture */}
          <div style={{position:"absolute",inset:0,opacity:0.03,
            backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"12px 12px",pointerEvents:"none"}}/>

          {/* CPU */}
          <div style={{textAlign:"center",marginBottom:12}}>
            <ChipDisplay label={"🤖 Robot"+(cpuDiscardCount>0&&phase!=="ready"?` (swapped ${cpuDiscardCount})`:"")} chips={cpuChips} color="#ff9f9f"/>
            <div style={{display:"flex",gap:5,justifyContent:"center",marginTop:6}}>
              {cpuCards.length>0?cpuCards.map((c,i)=>
                <PlayingCard key={c.id+animKey} card={c} faceDown={!isShowdown} animDelay={i*60}/>
              ):Array.from({length:5},(_,i)=>
                <div key={i} style={{width:74,height:106,borderRadius:14,border:"2px dashed #ffffff22",background:"#ffffff08"}}/>
              )}
            </div>
          </div>

          {/* Pot */}
          {pot>0&&(
            <div style={{textAlign:"center",margin:"6px 0 10px"}}>
              <span style={{
                fontFamily:"'Lilita One'",fontSize:20,color:"#ffd60a",
                background:"#00000055",padding:"5px 20px",borderRadius:22,
              }}>🏆 ${pot}</span>
            </div>
          )}

          {/* My cards */}
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap"}}>
              {myCards.length>0?myCards.map((c,i)=>(
                <PlayingCard key={c.id+animKey} card={c}
                  action={cardAction(c)}
                  groupColor={cardGroup(c)}
                  selected={selected.has(c.id)}
                  onClick={()=>toggleCard(c.id)}
                  disabled={phase!=="dealt"||swapped}
                  animDelay={i*80}
                />
              )):Array.from({length:5},(_,i)=>
                <div key={i} style={{width:74,height:106,borderRadius:14,border:"2px dashed #ffffff22",background:"#ffffff08"}}/>
              )}
            </div>
            <div style={{marginTop:8}}>
              <ChipDisplay label="🙋 You" chips={myChips}/>
            </div>
          </div>
        </div>
      </div>

      {/* Legend (only during card selection) */}
      {phase==="dealt"&&!swapped&&analysis&&(
        <div style={{
          display:"flex",gap:14,justifyContent:"center",marginBottom:10,
          fontFamily:"'Fredoka'",fontSize:12,color:"#777",flexWrap:"wrap",
          animation:"fadeUp 0.4s both",
        }}>
          <span>✨ Float up = Keep</span>
          <span>👋 Sink down = Swap</span>
          <span style={{color:"#e63946"}}>SWAP = You picked it</span>
        </div>
      )}

      {/* ONE BIG BUTTON at a time */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        {phase==="ready"&&(
          <BigButton onClick={deal} disabled={myChips<5}>
            {myChips<5?"Out of chips!":"Deal! 🃏"}
          </BigButton>
        )}

        {phase==="dealt"&&!swapped&&(
          <>
            <BigButton onClick={doSwap} color={selected.size>0?"#4361ee":"#2a9d8f"}>
              {selected.size>0?`Swap ${selected.size} Card${selected.size>1?"s":""}! 🔄`:"Keep All & Continue ✋"}
            </BigButton>
            <SmallBtn onClick={fold} color="#999">Fold 🫣</SmallBtn>
          </>
        )}

        {phase==="dealt"&&swapped&&(
          <BigButton onClick={showdown} color="#f59e0b">
            Showdown! 🃏
          </BigButton>
        )}

        {phase==="showdown"&&(
          <>
            {result&&result.winner!=="fold"&&(
              <div style={{
                background:result.winner==="you"?"linear-gradient(135deg,#d1fae5,#a7f3d0)":result.winner==="tie"?"#fef3c7":"#fde8ea",
                borderRadius:22,padding:18,textAlign:"center",fontFamily:"'Fredoka'",width:"100%",maxWidth:360,
                border:`3px solid ${result.winner==="you"?"#10b981":result.winner==="tie"?"#f59e0b":"#e63946"}`,
                position:"relative",overflow:"hidden",animation:"fadeUp 0.4s both",
              }}>
                {result.winner==="you"&&(
                  <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
                    {["🎉","⭐","🌟","✨","🎊","💫","🎉","⭐"].map((e,i)=>(
                      <span key={i} style={{
                        fontSize:28,position:"absolute",
                        left:`${8+i*12}%`,top:`${10+Math.random()*20}%`,
                        animation:`confetti 2s ${i*0.1}s both`,
                      }}>{e}</span>
                    ))}
                  </div>
                )}
                <div style={{fontSize:26,fontWeight:700,position:"relative",marginBottom:4}}>
                  {result.winner==="you"?"🎉 YOU WIN! 🎉":result.winner==="tie"?"🤝 Tie!":"🤖 Robot Wins"}
                </div>
                <div style={{fontSize:14,color:"#555",position:"relative"}}>
                  You: <b>{result.myHand}</b> — Robot: <b>{result.cpuHand}</b>
                </div>
              </div>
            )}
            <BigButton onClick={reset} color="#2a9d8f">
              {myChips<5?"Reset & Play Again! 🔄":"Next Hand! 🃏"}
            </BigButton>
          </>
        )}
      </div>

      {/* How to play (only on ready screen) */}
      {phase==="ready"&&!result&&(
        <div style={{
          background:"#f8f6f0",borderRadius:20,padding:"18px 20px",marginTop:16,
          fontFamily:"'Fredoka'",fontSize:15,color:"#666",lineHeight:1.7,
          border:"2px dashed #e0d8c8",animation:"fadeUp 0.5s 0.2s both",
        }}>
          <div style={{fontFamily:"'Lilita One'",fontSize:17,color:"#1a1a2e",marginBottom:6}}>📖 How to Play</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div>1️⃣ Get 5 cards</div>
            <div>2️⃣ Cards float up = keep them!</div>
            <div>3️⃣ Cards sink down = swap them!</div>
            <div>4️⃣ Flip and see who wins!</div>
          </div>
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
      <style>{GLOBAL_CSS}</style>
      {screen==="home"&&<HomeScreen onNav={setScreen} stats={stats}/>}
      {screen==="hands"&&<HandsScreen onBack={()=>setScreen("home")}/>}
      {screen==="quiz"&&<QuizScreen onBack={()=>setScreen("home")} onScore={(ok)=>setStats(s=>({...s,quizCorrect:s.quizCorrect+(ok?1:0),quizTotal:s.quizTotal+1}))}/>}
      {screen==="play"&&<PlayScreen onBack={()=>setScreen("home")} onResult={(won)=>setStats(s=>({...s,handsPlayed:s.handsPlayed+1,wins:s.wins+(won?1:0)}))}/>}
    </div>
  );
}
