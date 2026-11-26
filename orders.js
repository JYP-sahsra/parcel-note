"use strict";

// All records and prices in this module are synthetic, including weights and zone assignments.
const sampleOwners = new Map([["DEMO-1001","alpha"],["DEMO-1002","alpha"],["DEMO-2001","beta"],["DEMO-3001","empty"]]);
const sampleAt = "2026-11-26T09:30:00+09:00";
const snapshots = [
  {owner:"alpha",box:"A",rev:1,state:"inbound",lines:[["DEMO-1001",3]],kg:1.2,cm:[30,24,13],value:58},
  {owner:"alpha",box:"A",rev:2,state:"stored",lines:[["DEMO-1001",3],["DEMO-1002",1]],kg:2.1,cm:[32,25,18],value:88},
  {owner:"alpha",box:"B",rev:1,state:"stored",lines:[["DEMO-1002",2]],kg:1.4,cm:[28,20,10],value:42},
  {owner:"alpha",box:"C",rev:1,state:"stored",lines:[["DEMO-1001",2]],kg:1,cm:[22,18,10],value:38},
  {owner:"alpha",box:"C",rev:2,state:"sent",lines:[["DEMO-1001",2]],kg:1,cm:[22,18,10],value:38},
  {owner:"alpha",box:"D",rev:1,state:"reserved",lines:[["DEMO-1002",2]],kg:.8,cm:[20,16,10],value:25},
  {owner:"alpha",box:"E",rev:1,state:"inbound",lines:[["DEMO-1002",1]],kg:null,cm:null,value:25},
  {owner:"beta",box:"F",rev:1,state:"stored",lines:[["DEMO-2001",5]],kg:5,cm:[34,27,20],value:115},
  {owner:"empty",box:"G",rev:1,state:"sent",lines:[["DEMO-3001",3]],kg:2,cm:[30,24,13],value:47}
];
const sampleZones={CA:"near",MX:"near",SG:"near",DE:"mid",GB:"mid",FR:"mid",AU:"far",NZ:"far"};
const terms={YUN:"DDP",FEDEX:"DDU",MIR:"",IDO:""};
const carrierNames={YUN:"YunExpress",FEDEX:"FedEx",MIR:"MIR",IDO:"IDO"};
function carriers(cc){if(cc==="US")return ["YUN","FEDEX"];if(cc==="JP")return ["MIR"];if(["TW","HK","MO"].includes(cc))return ["IDO"];return ["FEDEX"];}
function stockFor(order,events=snapshots){
  const owner=sampleOwners.get(String(order).trim().toUpperCase());if(!owner)return null;
  const latest=new Map();
  for(const ev of events){if(ev.owner!==owner)continue;const prev=latest.get(ev.box);if(!prev||ev.rev>prev.rev)latest.set(ev.box,ev);}
  const boxes=Array.from(latest.values()).filter(b=>b.state==="stored");
  return {boxes,units:boxes.reduce((n,b)=>n+b.lines.reduce((v,line)=>v+line[1],0),0),orderCount:new Set(boxes.flatMap(b=>b.lines.map(line=>line[0]))).size,asOf:sampleAt};
}
function demoPrice(cc,carrier,boxes){
  if(!carriers(cc).includes(carrier)||!boxes?.length)return {reason:"unavailable"};
  const zone=sampleZones[cc];if(carrier==="FEDEX"&&cc!=="US"&&!zone)return {reason:"unmapped"};
  const currency=cc==="JP"?"JPY":["TW","HK","MO"].includes(cc)?"KRW":"USD";
  let freight=0,weight=0,declared=0;const details=[];
  for(const box of boxes){
    if(!Number.isFinite(box.kg)||box.kg<=0||!Array.isArray(box.cm)||box.cm.length!==3||box.cm.some(x=>!Number.isFinite(x)||x<=0))return {reason:"weightMissing"};
    const divisor=carrier==="FEDEX"?5000:6000;
    const kg=Math.ceil(Math.max(box.kg,box.cm.reduce((n,v)=>n*v,1)/divisor)*2-1e-9)/2;
    if(kg>30)return {reason:"outOfRange"};
    let cost;
    if(carrier==="YUN")cost=10+kg*4;
    else if(carrier==="MIR")cost=930+kg*275;
    else if(carrier==="IDO")cost=Math.ceil(kg/5)*(cc==="TW"?21000:19500);
    else {const sampleRate=cc==="US"?[14,4]:{near:[12,4],mid:[17,5],far:[22,6]}[zone];cost=sampleRate[0]+sampleRate[1]*kg;}
    if(cc==="US"&&carrier==="FEDEX"&&(!Number.isFinite(box.value)||box.value<0))return {reason:"valueMissing"};
    freight+=cost;weight+=kg;declared+=box.value||0;details.push({kg,cost});
  }
  const local=cc==="US"&&carrier==="FEDEX"?Math.round(declared*.10*100)/100:null;
  return {currency,weight,freight,local,total:freight+(local??0),details,scope:cc==="US"?(carrier==="YUN"?"included":"estimatedLocal"):"freightOnly"};
}
const orderLabels={
ko:{title:"주문번호로 예상 배송비 조회",intro:"주문번호 하나로 현재 보관 중인 전체 재고를 모아 목적지별 국제배송비를 확인하세요.",label:"주문번호",placeholder:"예: DEMO-1001",find:"보관 재고 조회",sample:"예시 주문 사용",preview:"검토용 · 가상 재고와 예시 운임",privacy:"이 공개 화면은 예시 주문만 조회합니다. 실제 주문번호를 입력할 필요가 없습니다.",dest:"배송 국가",other:"기타 국가",code:"도착 국가 코드 (영문 2자리)",carrier:"배송사",stock:"현재 보관 재고",summary:"예상 배송비",orders:"주문",units:"상품",boxes:"박스",when:"재고 기준",empty:"현재 발송 가능한 보관 재고가 없습니다.",unknown:"조회할 수 없는 주문입니다. 예시 주문으로 확인해 주세요.",before:"주문번호를 조회하면 고객의 전체 보관 재고가 표시됩니다.",select:"재고를 조회하면 금액이 표시됩니다.",manual:"수량 직접 입력 계산기",terms:"운임에 포함되는 항목",freight:"국제운임",local:"예상 현지 비용",total:"예상 합계",weight:"과금 중량 합계",included:"관부가세 포함 예시",estimatedLocal:"국제운임과 수령 시 현지 비용 추정치를 합산했습니다.",freightOnly:"국제운임 예시입니다. 관부가세와 지역 할증은 별도 확인 대상입니다.",unavailable:"견적을 제공할 수 없습니다.",unmapped:"이 국가의 FedEx 권역 요율은 데모에 없습니다.",weightMissing:"박스의 실중량·치수 확인이 필요합니다.",valueMissing:"신고 상품금액 확인이 필요합니다.",outOfRange:"박스 중량이 요율표 범위를 벗어났습니다.",detail:"박스별 산출",box:"박스",lang:"English",sampleTip:"예시 주문 DEMO-1001과 DEMO-1002는 같은 고객입니다. DEMO-3001은 보관 재고가 없습니다.",method:"포장된 박스별로 실중량과 부피중량을 비교한 뒤 운임을 합산합니다. 입고 전, 발송 요청 중, 발송 완료 수량은 제외합니다.",zone:"권역",badCountry:"국가 코드를 영문 두 자리로 입력하세요.",share:"이 조회 화면 링크 복사",copied:"주문번호가 없는 조회 화면 주소입니다.",demo:"예시",internal:"내부 운임 검산 · 가상 재고",internalHelp:"보관 재고는 예시입니다. 원표 기준 금액과 적용 한계는 결과에 표시합니다."},
en:{title:"Estimate shipping by order number",intro:"Use one order to estimate international shipping for everything currently stored for the same customer.",label:"Order number",placeholder:"e.g. DEMO-1001",find:"Look up inventory",sample:"Use sample order",preview:"Preview · sample stock and rates",privacy:"This public preview accepts sample orders only. Please use a demo order.",dest:"Destination",other:"Other country",code:"Two-letter destination code",carrier:"Carrier",stock:"Stored inventory",summary:"Shipping estimate",orders:"Orders",units:"Items",boxes:"Boxes",when:"Stock as of",empty:"No stored items are available to ship.",unknown:"Order unavailable. Try a sample order.",before:"Look up an order to see all stored inventory for its customer.",select:"Look up inventory to see a quote.",manual:"Manual quantity calculator",terms:"What's included",freight:"International freight",local:"Estimated local charges",total:"Estimated total",weight:"Total chargeable weight",included:"Example includes import charges",estimatedLocal:"Includes freight and an estimate of charges payable on receipt.",freightOnly:"Example freight only. Duties, taxes and area surcharges require confirmation.",unavailable:"No quote available.",unmapped:"This destination has no FedEx zone rate in the demo.",weightMissing:"Package weight and dimensions are required.",valueMissing:"Declared merchandise value is required.",outOfRange:"A box exceeds the rate-table range.",detail:"Cost by box",box:"Box",lang:"한국어",sampleTip:"DEMO-1001 and DEMO-1002 belong to the same sample customer. DEMO-3001 has no stored inventory.",method:"Freight is calculated per packed box using actual and volumetric weight. Inbound, reserved for dispatch and shipped units are excluded.",zone:"Zone",badCountry:"Enter a two-letter country code.",share:"Copy lookup page link",copied:"This link opens the lookup page without an order number.",demo:"Example",internal:"Internal rate check · sample stock",internalHelp:"Inventory is synthetic. Rate source limitations are displayed with the quote."}
};
function mountOrders(priceProvider=demoPrice,internal=false){
  const el=id=>document.getElementById(id);
  let lang="ko",stock=null,current="",carrier="",status="before",shared=false;
  const regions=["US","JP","TW","HK","MO","CA","FR","AU","GB","DE","SG","NZ","MX"];
  function cc(){return el("country").value==="other"?el("countryCode").value.trim().toUpperCase():el("country").value;}
  function line(parent,key,value){const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=key;dd.textContent=value;parent.append(dt,dd);}
  function redraw(){
    const t=orderLabels[lang];document.documentElement.lang=lang;document.title=t.title+" · Parcel Note";
    document.querySelectorAll("[data-key]").forEach(n=>n.textContent=t[n.dataset.key]);el("badge").textContent=internal?t.internal:t.preview;el("privacy").textContent=internal?t.internalHelp:t.privacy;
    el("order").placeholder=t.placeholder;const country=cc();el("custom").hidden=el("country").value!=="other";
    const routes=carriers(country);if(!routes.includes(carrier))carrier=routes[0];const cn={YUN:"윤",FEDEX:"페덱스",MIR:"미르",IDO:"아이두"};
    el("carriers").replaceChildren(...routes.map(k=>{const b=document.createElement("button");b.type="button";b.textContent=(lang==="ko"?cn[k]+" · ":"")+carrierNames[k]+(country==="US"?" "+terms[k]:"");b.setAttribute("aria-pressed",String(k===carrier));b.onclick=()=>{carrier=k;redraw()};return b;}));
    el("inv").replaceChildren();el("costs").replaceChildren();el("boxes").replaceChildren();el("extras").hidden=true;el("basis").textContent="";el("money").textContent="—";el("notice").textContent=t[status]||"";el("shareAddress").hidden=!shared;el("shareNotice").textContent=shared?t.copied:"";el("rateNote").textContent=t.select;
    if(!stock)return;
    for(const [k,v] of [["orders",stock.orderCount],["units",stock.units],["boxes",stock.boxes.length]])line(el("inv"),t[k],v);
    line(el("inv"),t.when,stock.asOf.replace("T"," ").replace("+09:00"," KST"));
    if(!stock.boxes.length){el("rateNote").textContent=t.empty;return;}
    if(!/^[A-Z]{2}$/.test(country)){el("rateNote").textContent=t.badCountry;return;}
    const q=priceProvider(country,carrier,stock.boxes);
    if(q.reason){el("rateNote").textContent=t[q.reason]||t.unavailable;el("basis").textContent=q.note||"";return;}
    const fmt=v=>new Intl.NumberFormat(lang,{style:"currency",currency:q.currency,currencyDisplay:"code",maximumFractionDigits:["JPY","KRW"].includes(q.currency)?0:2}).format(v);
    el("money").textContent=fmt(q.total);el("rateNote").textContent=q.scopeNote||t[q.scope];line(el("costs"),t.freight,fmt(q.freight));if(q.local!==null)line(el("costs"),t.local,fmt(q.local));line(el("costs"),t.weight,q.weight+" kg");el("extras").hidden=false;el("basis").textContent=q.note||"";
    q.details.forEach((d,i)=>line(el("boxes"),t.box+" "+(i+1)+" · "+d.kg+" kg",fmt(d.cost)));
  }
  function language(){const old=el("country").value||"US",dn=new Intl.DisplayNames([lang],{type:"region"});el("country").replaceChildren(...regions.map(c=>new Option(dn.of(c),c)),new Option(orderLabels[lang].other,"other"));el("country").value=old;redraw();}
  function lookup(){current=el("order").value.trim().toUpperCase();stock=stockFor(current);status=stock?(stock.units?"":"empty"):"unknown";redraw();}
  el("lookup").onsubmit=e=>{e.preventDefault();lookup()};
  el("order").oninput=()=>{if(el("order").value.trim().toUpperCase()!==current){stock=null;status="before";redraw()}};
  el("sampleButton").onclick=()=>{el("order").value="DEMO-1001";lookup()};el("lang").onclick=()=>{lang=lang==="ko"?"en":"ko";language()};el("country").onchange=()=>{carrier="";redraw()};el("countryCode").oninput=redraw;
  el("shareButton").onclick=async()=>{if(!/^https?:$/.test(location.protocol))return;const url=new URL(location.href);url.hash="";url.search="";el("shareAddress").value=url.href;shared=true;redraw();try{await navigator.clipboard.writeText(url.href)}catch{el("shareAddress").select()}};
  el("shareButton").hidden=internal||!/^https?:$/.test(location.protocol);language();
}
if(typeof module!=="undefined"&&module.exports)module.exports={stockFor,demoPrice,carriers,snapshots};
