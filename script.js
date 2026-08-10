/* ---------------- storage helpers (瀏覽器 localStorage，資料存在使用者自己的裝置上) ---------------- */
const STORAGE_PREFIX = 'beiya-workshop:';
async function loadKey(key, fallback){
  try{
    const raw = localStorage.getItem(STORAGE_PREFIX+key);
    if(raw) return JSON.parse(raw);
    return fallback;
  }catch(e){ console.error('storage get failed', e); return fallback; }
}
async function saveKey(key, value){
  try{
    localStorage.setItem(STORAGE_PREFIX+key, JSON.stringify(value));
    return true;
  }catch(e){ console.error('storage set failed', e); toast('儲存失敗，可能是瀏覽器儲存空間已滿'); return false; }
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),1800);
}

/* ---------------- state ---------------- */
let state = {
  tab: 'furnace',
  recipes: [],   // {id,name,time,inputQty,outputQty,fuels:[fuelName,...]}
  fuels: [],     // {id,name,seconds}  -- 一份燃料能持續燃燒幾秒
  lookbook: [],  // {id,name,category,building,materials:[{name,qty}],satiety,hydration,effect}
  markers: [],   // {id,name,cat,x,y,note}
  loaded:false
};

const SCHEMA_VERSION = 2;

const DEFAULT_FUELS = [
  {name:'茅草', seconds:60},
  {name:'煤炭', seconds:180},
  {name:'蒸氣石', seconds:300},
  {name:'魔晶', seconds:31},
];

const DEFAULT_RECIPES = [
  {name:'石灰', time:3, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'水泥', time:3, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'玻璃', time:3, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'磚頭', time:3, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'鐵錠', time:10, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'銀錠', time:10, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'金錠', time:15, inputQty:1, outputQty:1, fuels:['茅草','煤炭']},
  {name:'水晶', time:20, inputQty:2, outputQty:1, fuels:['茅草','煤炭']},
  {name:'黑曜石', time:30, inputQty:2, outputQty:1, fuels:['茅草','煤炭']},
  {name:'瓦雷亞石', time:35, inputQty:2, outputQty:1, fuels:['茅草','煤炭']},
  {name:'深海鋼錠', time:30, inputQty:2, outputQty:1, fuels:['茅草','煤炭']},
  {name:'精煉鋼鐵', time:90, inputQty:10, outputQty:1, fuels:['蒸氣石']},
  {name:'精煉橡膠', time:90, inputQty:10, outputQty:1, fuels:['蒸氣石']},
  {name:'精煉煤炭', time:90, inputQty:10, outputQty:1, fuels:['蒸氣石']},
  {name:'黏土', time:100, inputQty:1, outputQty:50, fuels:['魔晶']},
  {name:'沙子', time:100, inputQty:1, outputQty:50, fuels:['魔晶']},
  {name:'木頭', time:15, inputQty:1, outputQty:50, fuels:['魔晶']},
  {name:'樹脂', time:210, inputQty:1, outputQty:50, fuels:['魔晶']},
  {name:'石頭', time:21, inputQty:1, outputQty:50, fuels:['魔晶']},
  {name:'海獸骸骨', time:420, inputQty:1, outputQty:50, fuels:['魔晶']},
];

const CATS = [
  {id:'ore',label:'礦石／礦脈',cls:'cat-ore'},
  {id:'plant',label:'植物／草藥',cls:'cat-plant'},
  {id:'animal',label:'特殊生物',cls:'cat-animal'},
  {id:'special',label:'神獸／特殊點',cls:'cat-special'},
  {id:'chest',label:'寶箱／遺跡',cls:'cat-chest'},
  {id:'other',label:'其他',cls:'cat-other'},
];

async function init(){
  const schemaVersion = await loadKey('schemaVersion', 0);
  state.recipes  = await loadKey('recipes', []);
  state.fuels    = await loadKey('fuels', []);
  state.lookbook = await loadKey('lookbook', []);
  state.markers  = await loadKey('markers', []);

  if(schemaVersion < SCHEMA_VERSION){
    // 資料結構升級：套用新版預設燃料燃燒時間與配方（僅在使用者尚未自行建立資料，或版本落後時寫入）
    if(state.fuels.length===0 || !state.fuels[0].seconds){
      state.fuels = DEFAULT_FUELS.map(f=>({id:uid(), ...f}));
      await saveKey('fuels', state.fuels);
    }
    if(state.recipes.length===0 || state.recipes[0].fuel!==undefined){
      state.recipes = DEFAULT_RECIPES.map(r=>({id:uid(), ...r}));
      await saveKey('recipes', state.recipes);
    }
    await saveKey('schemaVersion', SCHEMA_VERSION);
  }

  state.loaded = true;
  render();
}

/* ---------------- nav ---------------- */
const NAV_ICONS = {
  furnace: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2c-1 3-4 4.5-4 8a4 4 0 0 0 8 0c0-1.2-.4-2-1-2.7.1 1-.3 1.7-1 1.7-1 0-1-1-1-1.7 0-1.3-.6-2.4-1-3.3Z"/><path d="M6 14a6 6 0 0 0 12 0"/><path d="M4 20h16"/></svg>',
  lookbook: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 19V5.5"/><path d="M8 8h8M8 12h6"/></svg>',
  map: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4 3 6.5v14L9 18l6 2.5 6-2.5v-14L15 6.5 9 4Zm0 0v14m6-11.5V17"/></svg>'
};
const NAV_LABELS = {furnace:'熔爐計算',lookbook:'食譜查詢',map:'地圖標記'};

function renderNav(){
  const items = ['furnace','lookbook','map'].map(id=>`
    <div class="navitem ${state.tab===id?'active':''}" data-tab="${id}" onclick="setTab('${id}')">
      ${NAV_ICONS[id]}<span>${NAV_LABELS[id]}</span>
    </div>`).join('');

  document.getElementById('sideNav').innerHTML = `
    <div class="brand">
      <div class="mark">
        <img src="logo/logo-mark.svg" alt="貝雅工坊" width="26" height="26" style="border-radius:6px;flex:none;">
        貝雅工坊
      </div>
      <div class="sub">烏托邦：起源 · 助手</div>
    </div>
    ${items}
    <div style="margin-top:auto;padding:16px 20px 0 20px;border-top:1px solid var(--border-soft);">
      <div style="font-size:10.5px;color:var(--text-faint);line-height:1.6;margin-bottom:10px;">資料儲存在你目前這個瀏覽器裡，換裝置或清除瀏覽資料會消失。</div>
      <button class="ghost danger small" style="width:100%;" onclick="resetAllData()">清除所有資料</button>
    </div>
  `;
  document.getElementById('mobileNav').innerHTML = `
    <div class="mobile-brand">
      <img src="logo/logo-mark.svg" alt="貝雅工坊" width="22" height="22" style="border-radius:5px;flex:none;">
      <span>貝雅工坊</span>
    </div>
    <div class="mobile-tabs-row">${items}</div>
  `;
}
async function resetAllData(){
  if(!confirm('確定要清除所有配方、燃料設定與地圖標記嗎？此動作無法復原。')) return;
  ['recipes','fuels','lookbook','markers','schemaVersion'].forEach(k=>localStorage.removeItem(STORAGE_PREFIX+k));
  location.reload();
}
function setTab(t){ state.tab=t; render(); }

/* ---------------- render root ---------------- */
function render(){
  renderNav();
  const main = document.getElementById('main');
  if(!state.loaded){ main.innerHTML = `<div class="empty">載入中…</div>`; return; }
  if(state.tab==='furnace') renderFurnace(main);
  if(state.tab==='lookbook') renderLookbook(main);
  if(state.tab==='map') renderMap(main);
}

/* ================= TAB 1: 熔爐計算 ================= */
let calcSel = {recipeId:null, matQty:1, wantQty:0, fuelName:null};
let furnaceSearch = '';

function renderFurnace(main){
  const filtered = state.recipes.filter(r=>r.name.toLowerCase().includes(furnaceSearch.toLowerCase()));
  const recipe = state.recipes.find(r=>r.id===calcSel.recipeId);

  if(recipe){
    if(calcSel.fuelName===null || !recipe.fuels.includes(calcSel.fuelName)){
      calcSel.fuelName = recipe.fuels[0] || null;
    }
    // 以目前的原料數量為基準，同步算出可取得的成品數量
    const numBatches = Math.ceil((calcSel.matQty||0) / recipe.inputQty);
    calcSel.wantQty = numBatches * recipe.outputQty;
  }

  const fuelOptions = recipe ? recipe.fuels.map(fname=>{
    const f = state.fuels.find(x=>x.name===fname);
    return `<option value="${escapeHtml(fname)}" ${calcSel.fuelName===fname?'selected':''}>${escapeHtml(fname)}${f?`（每份燒 ${f.seconds} 秒）`:'（尚未設定燃燒秒數）'}</option>`;
  }).join('') : '';

  main.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Furnace Calculator</div>
      <h1>熔爐計算</h1>
      <p>選一個配方，輸入「放入的原料數量」或「想取得的成品數量」其中一格，另一格會自動幫你算出來，同時算出總時間跟燃料需求。</p>
    </div>

    <div class="panel">
      <h3>選擇配方</h3>
      <div class="searchbar" style="margin-bottom:10px;">
        <input type="text" id="fr_search" placeholder="搜尋配方名稱…" value="${escapeHtml(furnaceSearch)}">
        <button onclick="openRecipeManager(null)">管理配方</button>
      </div>
      <div id="recipeChipsWrap">${renderRecipeChips(filtered)}</div>
    </div>

    ${recipe ? `
    <div class="panel">
      <h3>${escapeHtml(recipe.name)} <span class="tag copper">${recipe.time}秒／批</span><span class="tag steel">${recipe.inputQty}:${recipe.outputQty}</span></h3>
      <div class="row">
        <div class="field">
          <label>你放入的原料數量</label>
          <input type="number" id="f_matqty" min="0" step="1" value="${calcSel.matQty}">
        </div>
        <div class="field">
          <label>你想取得的成品數量</label>
          <input type="number" id="f_wantqty" min="0" step="1" value="${calcSel.wantQty}">
        </div>
        <div class="field">
          <label>使用燃料</label>
          <select id="f_fueltype">${fuelOptions || '<option>此配方尚未設定可用燃料</option>'}</select>
        </div>
      </div>
      <div class="disclaimer" id="res_batches"></div>
    </div>

    <div class="panel">
      <h3>結果</h3>
      <div class="gauge-wrap">
        <div class="gauge-track"><div class="gauge-fill" id="res_gauge" style="width:0%"></div></div>
        <div class="gauge-labels">
          <div class="stat">
            <div class="num mono" id="res_time">-</div>
            <div class="lbl">總煉製時間</div>
          </div>
          <div class="stat">
            <div class="num mono" id="res_output">-</div>
            <div class="lbl">總產出數量</div>
          </div>
          <div class="stat fuel">
            <div class="num mono" id="res_fuel">-</div>
            <div class="lbl" id="res_fuel_label">燃料需求</div>
          </div>
        </div>
      </div>
    </div>
    ` : `<div class="empty">先在上面選一個配方，就會顯示計算結果</div>`}
  `;

  document.getElementById('fr_search').oninput = e=>{
    furnaceSearch = e.target.value;
    const list = state.recipes.filter(r=>r.name.toLowerCase().includes(furnaceSearch.toLowerCase()));
    document.getElementById('recipeChipsWrap').innerHTML = renderRecipeChips(list);
  };
  const mq = document.getElementById('f_matqty');
  if(mq) mq.oninput = e=>{
    calcSel.matQty = Math.max(0, parseFloat(e.target.value)||0);
    updateFurnaceResults('mat');
  };
  const wq = document.getElementById('f_wantqty');
  if(wq) wq.oninput = e=>{
    calcSel.wantQty = Math.max(0, parseFloat(e.target.value)||0);
    updateFurnaceResults('want');
  };
  const ft = document.getElementById('f_fueltype');
  if(ft) ft.onchange = e=>{ calcSel.fuelName = e.target.value; updateFurnaceResults('mat'); };

  if(recipe) updateFurnaceResults('mat', true);
}

function renderRecipeChips(list){
  if(!list.length) return `<span style="color:var(--text-faint);font-size:12.5px;">找不到配方，點右邊「管理配方」新增一個。</span>`;
  return list.map(r=>`
    <span class="recipe-chip ${calcSel.recipeId===r.id?'active':''}" onclick="pickRecipe('${r.id}')">
      ${escapeHtml(r.name)} <span class="mono" style="opacity:.6">· ${r.time}秒／${r.inputQty}:${r.outputQty}</span>
    </span>`).join('');
}

/* 重新計算結果，只更新數字與另一格輸入值，不重繪整頁（避免輸入格失焦、一次只能打一個字） */
function updateFurnaceResults(source, skipFieldSync){
  const recipe = state.recipes.find(r=>r.id===calcSel.recipeId);
  if(!recipe) return;

  let numBatches;
  if(source==='want'){
    numBatches = Math.ceil((calcSel.wantQty||0) / recipe.outputQty);
    calcSel.matQty = numBatches * recipe.inputQty;
    if(!skipFieldSync){
      const mq = document.getElementById('f_matqty');
      if(mq) mq.value = calcSel.matQty;
    }
  }else{
    numBatches = Math.ceil((calcSel.matQty||0) / recipe.inputQty);
    calcSel.wantQty = numBatches * recipe.outputQty;
    if(!skipFieldSync){
      const wq = document.getElementById('f_wantqty');
      if(wq) wq.value = calcSel.wantQty;
    }
  }

  const totalTime = numBatches * recipe.time;
  const totalOutput = numBatches * recipe.outputQty;
  const fuel = state.fuels.find(f=>f.name===calcSel.fuelName);
  const fuelCount = fuel && fuel.seconds>0 ? Math.ceil(totalTime / fuel.seconds) : 0;

  const timeEl = document.getElementById('res_time');
  const outEl = document.getElementById('res_output');
  const fuelEl = document.getElementById('res_fuel');
  const fuelLblEl = document.getElementById('res_fuel_label');
  const gaugeEl = document.getElementById('res_gauge');
  const batchEl = document.getElementById('res_batches');
  if(timeEl) timeEl.textContent = formatDuration(totalTime);
  if(outEl) outEl.textContent = totalOutput;
  if(fuelEl) fuelEl.innerHTML = `${fuelCount} <span style="font-size:13px;opacity:.7">份</span>`;
  if(fuelLblEl) fuelLblEl.textContent = `${fuel?fuel.name:'燃料'}需求`;
  if(gaugeEl) gaugeEl.style.width = (totalTime>0?100:0)+'%';
  if(batchEl) batchEl.textContent = `每批消耗 ${recipe.inputQty} 個原料、產出 ${recipe.outputQty} 個成品，共需 ${numBatches} 批。`;
}

function pickRecipe(id){
  calcSel.recipeId = id;
  calcSel.fuelName = null;
  render();
}

/* ---- 配方管理彈窗（新增／編輯／刪除／管理燃料燒秒數） ---- */
function openRecipeManager(editId){
  const editing = editId ? state.recipes.find(r=>r.id===editId) : null;
  const listHtml = state.recipes.map(r=>`
    <div class="list-row">
      <div class="main">
        <div class="title">${escapeHtml(r.name)}</div>
        <div class="sub">${r.time}秒／批 · 原料:產物 = ${r.inputQty}:${r.outputQty} · 燃料：${r.fuels.map(escapeHtml).join('、')||'（無）'}</div>
      </div>
      <div class="acts">
        <button class="small" onclick="openRecipeManager('${r.id}')">編輯</button>
        <button class="small danger" onclick="deleteRecipe('${r.id}')">刪除</button>
      </div>
    </div>`).join('') || `<div class="empty">尚無配方</div>`;

  const fuelChecks = state.fuels.map(f=>`
    <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:13px;color:var(--text);margin-bottom:6px;">
      <input type="checkbox" class="fuel-check" value="${escapeHtml(f.name)}" ${editing && editing.fuels.includes(f.name)?'checked':''} style="width:auto;">
      ${escapeHtml(f.name)}（${f.seconds}秒／份）
    </label>`).join('') || `<div style="font-size:12.5px;color:var(--text-faint);">尚無燃料，請先到下方新增</div>`;

  showModal(`
    <h3>${editing?'編輯配方':'配方管理'}</h3>
    <div style="max-height:180px;overflow:auto;border:1px solid var(--border-soft);border-radius:6px;padding:0 8px;margin-bottom:16px;">
      ${editing ? '' : listHtml}
    </div>
    <h3 style="font-size:14px;margin-bottom:10px;">${editing?'編輯此配方':'新增配方'}</h3>
    <div class="field"><label>物品名稱</label><input type="text" id="rc_name" value="${escapeHtml(editing?editing.name:'')}" placeholder="例如：鐵錠"></div>
    <div class="row">
      <div class="field"><label>每批所需時間（秒）</label><input type="number" id="rc_time" min="0" step="0.1" value="${editing?editing.time:''}"></div>
      <div class="field"><label>原料：產物比例</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="number" id="rc_in" min="0.01" step="0.01" value="${editing?editing.inputQty:1}" style="width:70px;">
          <span class="mono">:</span>
          <input type="number" id="rc_out" min="0.01" step="0.01" value="${editing?editing.outputQty:1}" style="width:70px;">
        </div>
      </div>
    </div>
    <div class="field"><label>可用燃料</label>${fuelChecks}</div>
    <div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap;">
      <button class="primary" onclick="saveRecipe('${editId||''}')">${editing?'儲存變更':'新增配方'}</button>
      ${editing?`<button class="ghost" onclick="openRecipeManager(null)">返回列表</button>`:''}
      <button class="ghost" onclick="openFuelManager()">管理燃料燒幾秒</button>
      <button class="ghost" onclick="closeModal()">關閉</button>
    </div>
  `);
}
async function saveRecipe(editId){
  const name = document.getElementById('rc_name').value.trim();
  if(!name){ toast('請填寫物品名稱'); return; }
  const time = parseFloat(document.getElementById('rc_time').value)||0;
  const inputQty = parseFloat(document.getElementById('rc_in').value)||1;
  const outputQty = parseFloat(document.getElementById('rc_out').value)||1;
  const fuels = [...document.querySelectorAll('.fuel-check:checked')].map(c=>c.value);
  if(editId){
    const r = state.recipes.find(x=>x.id===editId);
    Object.assign(r, {name,time,inputQty,outputQty,fuels});
  }else{
    state.recipes.push({id:uid(), name, time, inputQty, outputQty, fuels});
  }
  await saveKey('recipes', state.recipes);
  toast('已儲存');
  openRecipeManager(null);
  render();
}
async function deleteRecipe(id){
  state.recipes = state.recipes.filter(r=>r.id!==id);
  if(calcSel.recipeId===id) calcSel.recipeId=null;
  await saveKey('recipes', state.recipes);
  openRecipeManager(null);
}

/* fuel manager modal — 每份燃料能持續燃燒幾秒 */
function openFuelManager(){
  const rows = state.fuels.map(f=>`
    <div class="mat-row">
      <input type="text" value="${escapeHtml(f.name)}" data-fid="${f.id}" data-field="name">
      <input type="number" class="qty" value="${f.seconds}" data-fid="${f.id}" data-field="seconds" title="燃燒秒數">
      <button class="small danger" onclick="removeFuel('${f.id}')">刪</button>
    </div>`).join('');
  showModal(`
    <h3>管理燃料種類</h3>
    <div style="font-size:11.5px;color:var(--text-faint);margin-bottom:10px;">右邊數字是「一份燃料能持續燃燒幾秒」</div>
    <div id="fuelRows">${rows || '<div class="empty">尚無燃料</div>'}</div>
    <button class="ghost small" style="margin-top:8px;" onclick="addFuelRow()">+ 新增燃料</button>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="primary" onclick="saveFuelManager()">儲存</button>
      <button class="ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function addFuelRow(){
  const wrap = document.getElementById('fuelRows');
  const id = 'new-'+uid();
  const div = document.createElement('div');
  div.className='mat-row';
  div.innerHTML = `<input type="text" placeholder="燃料名稱" data-fid="${id}" data-field="name">
    <input type="number" class="qty" placeholder="燃燒秒數" value="60" data-fid="${id}" data-field="seconds">
    <button class="small danger" onclick="this.parentElement.remove()">刪</button>`;
  wrap.appendChild(div);
}
function removeFuel(id){
  state.fuels = state.fuels.filter(f=>f.id!==id);
  openFuelManager();
}
async function saveFuelManager(){
  const rows = document.querySelectorAll('#fuelRows .mat-row');
  const byId = {};
  rows.forEach(row=>{
    const nameInput = row.querySelector('[data-field="name"]');
    const secInput = row.querySelector('[data-field="seconds"]');
    const fid = nameInput.dataset.fid;
    if(!nameInput.value.trim()) return;
    byId[fid] = {id: fid.startsWith('new-')?uid():fid, name:nameInput.value.trim(), seconds:parseFloat(secInput.value)||1};
  });
  state.fuels = Object.values(byId);
  await saveKey('fuels', state.fuels);
  closeModal();
  toast('燃料已更新');
  render();
}

/* ================= TAB 2: 配方查詢 ================= */
let lookbookQuery = '';

const FOOD_CATEGORIES = ['吃的','喝的','飼料'];
const COOKWARE = ['篝火','聖焰篝火','烹飪鍋'];
const FOOD_EFFECTS = ['禦寒','耐熱','血量','攻擊','防禦','速度','耐力'];

function renderLookbook(main){
  const filtered = state.lookbook.filter(r=> r.name.toLowerCase().includes(lookbookQuery.toLowerCase()) );

  main.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Recipe Book</div>
      <h1>食譜查詢</h1>
      <p>把你在遊戲中發現的食譜記錄下來，之後直接搜尋查詢，或一鍵帶入熔爐計算機。</p>
    </div>

    <div class="panel">
      <div class="searchbar">
        <input type="text" id="lb_search" placeholder="搜尋食譜名稱…" value="${escapeHtml(lookbookQuery)}">
        <button class="primary" onclick="editLookbook(null)">+ 新增食譜</button>
      </div>
      <div id="lookbookListWrap">${renderLookbookRows(filtered)}</div>
    </div>
  `;
  document.getElementById('lb_search').oninput = e=>{
    lookbookQuery = e.target.value;
    const list = state.lookbook.filter(r=> r.name.toLowerCase().includes(lookbookQuery.toLowerCase()) );
    document.getElementById('lookbookListWrap').innerHTML = renderLookbookRows(list);
  };
}

function renderLookbookRows(filtered){
  return filtered.length ? filtered.map(r=>{
    const effectBits = [];
    if(r.satiety) effectBits.push(`飽足感 ${r.satiety}`);
    if(r.hydration) effectBits.push(`水分 ${r.hydration}`);
    if(r.effect) effectBits.push(r.effect);
    return `
    <div class="list-row">
      <div class="main">
        <div class="title">${escapeHtml(r.name)} ${r.category?`<span class="tag moss">${escapeHtml(r.category)}</span>`:''}${r.building?`<span class="tag steel">${escapeHtml(r.building)}</span>`:''}</div>
        <div class="sub">${r.materials.map(m=>`${escapeHtml(m.name)} ×${m.qty}`).join('　')||'（尚未填寫材料）'}${effectBits.length?`　·　${effectBits.map(escapeHtml).join('　')}`:''}</div>
      </div>
      <div class="acts">
        <button class="small" onclick="useInCalc('${r.id}')">帶入計算</button>
        <button class="small" onclick="editLookbook('${r.id}')">編輯</button>
        <button class="small danger" onclick="deleteLookbook('${r.id}')">刪除</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty">${state.lookbook.length? '找不到符合的食譜':'食譜庫是空的，新增第一筆食譜吧'}</div>`;
}

function useInCalc(id){
  const r = state.lookbook.find(x=>x.id===id);
  if(!r) return;
  const match = state.recipes.find(x=>x.name===r.name);
  furnaceSearch = r.name;
  if(match){
    calcSel.recipeId = match.id;
    calcSel.fuelName = null;
    toast('已帶入熔爐計算');
  }else{
    calcSel.recipeId = null;
    toast('熔爐計算裡還沒有這個配方，可到「管理配方」新增');
  }
  setTab('furnace');
}

function editLookbook(id){
  const r = id ? state.lookbook.find(x=>x.id===id) : {id:null,name:'',category:FOOD_CATEGORIES[0],building:COOKWARE[0],materials:[{name:'',qty:1}],satiety:'',hydration:'',effect:''};
  const matRows = r.materials.map((m,i)=>`
    <div class="mat-row" data-idx="${i}">
      <input type="text" placeholder="材料名稱" class="m-name" value="${escapeHtml(m.name)}">
      <input type="number" class="qty m-qty" placeholder="數量" value="${m.qty}">
      <button class="small danger" onclick="this.parentElement.remove()">刪</button>
    </div>`).join('');
  const catOptions = FOOD_CATEGORIES.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('');
  const cookOptions = COOKWARE.map(c=>`<option value="${c}" ${r.building===c?'selected':''}>${c}</option>`).join('');
  const effectOptions = `<option value="">（無）</option>` + FOOD_EFFECTS.map(e=>`<option value="${e}" ${r.effect===e?'selected':''}>${e}</option>`).join('');

  showModal(`
    <h3>${id?'編輯食譜':'新增食譜'}</h3>
    <div class="row">
      <div class="field"><label>成品名稱</label><input type="text" id="lb_name" value="${escapeHtml(r.name)}" placeholder="例如：烤全魚"></div>
      <div class="field"><label>分類</label><select id="lb_category">${catOptions}</select></div>
    </div>
    <div class="field"><label>廚具</label><select id="lb_building">${cookOptions}</select></div>
    <label>所需材料</label>
    <div id="matRows">${matRows}</div>
    <button class="ghost small" style="margin-top:6px;" onclick="addMatRow()">+ 新增材料</button>

    <label style="margin-top:16px;">食品效果</label>
    <div class="row">
      <div class="field"><label>飽足感</label><input type="number" id="lb_satiety" min="0" value="${r.satiety}"></div>
      <div class="field"><label>水分</label><input type="number" id="lb_hydration" min="0" value="${r.hydration}"></div>
      <div class="field"><label>效果</label><select id="lb_effect">${effectOptions}</select></div>
    </div>

    <div style="display:flex;gap:10px;margin-top:6px;">
      <button class="primary" onclick="saveLookbook('${id||''}')">儲存</button>
      <button class="ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function addMatRow(){
  const wrap = document.getElementById('matRows');
  const div = document.createElement('div');
  div.className='mat-row';
  div.innerHTML = `<input type="text" placeholder="材料名稱" class="m-name">
    <input type="number" class="qty m-qty" placeholder="數量" value="1">
    <button class="small danger" onclick="this.parentElement.remove()">刪</button>`;
  wrap.appendChild(div);
}
async function saveLookbook(id){
  const name = document.getElementById('lb_name').value.trim();
  if(!name){ toast('請填寫成品名稱'); return; }
  const category = document.getElementById('lb_category').value;
  const building = document.getElementById('lb_building').value;
  const satiety = document.getElementById('lb_satiety').value.trim();
  const hydration = document.getElementById('lb_hydration').value.trim();
  const effect = document.getElementById('lb_effect').value;
  const materials = [...document.querySelectorAll('#matRows .mat-row')].map(row=>({
    name: row.querySelector('.m-name').value.trim(),
    qty: parseFloat(row.querySelector('.m-qty').value)||1
  })).filter(m=>m.name);

  if(id){
    const r = state.lookbook.find(x=>x.id===id);
    Object.assign(r, {name,category,building,materials,satiety,hydration,effect});
  }else{
    state.lookbook.push({id:uid(), name, category, building, materials, satiety, hydration, effect});
  }
  await saveKey('lookbook', state.lookbook);
  closeModal(); toast('已儲存'); render();
}
async function deleteLookbook(id){
  state.lookbook = state.lookbook.filter(x=>x.id!==id);
  await saveKey('lookbook', state.lookbook);
  render();
}

/* ================= TAB 3: 地圖標記 ================= */
let mapFilter = 'all';
let mapSearch = '';
let pendingPin = null; // {x,y}

function renderMap(main){
  const legend = CATS.map(c=>`<span><i class="${c.cls}"></i>${c.label}</span>`).join('');
  const filterBtns = `<button class="filterbtn ${mapFilter==='all'?'active':''}" onclick="setMapFilter('all')">全部</button>` +
    CATS.map(c=>`<button class="filterbtn ${mapFilter===c.id?'active':''}" onclick="setMapFilter('${c.id}')">${c.label}</button>`).join('');

  const pins = state.markers.map(m=>`
    <div class="pin cat-${m.cat}" style="left:${m.x}%;top:${m.y}%;" title="${escapeHtml(m.name)}" onclick="event.stopPropagation();editMarker('${m.id}')"></div>
  `).join('');

  const visibleMarkers = state.markers.filter(m=>
    (mapFilter==='all'||m.cat===mapFilter) &&
    m.name.toLowerCase().includes(mapSearch.toLowerCase())
  );
  const rows = renderMarkerRows(visibleMarkers);

  main.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Resource Map</div>
      <h1>地圖標記</h1>
      <p>這是一張自由座標圖，不是遊戲實際地圖 — 直接點擊來標出資源點的相對位置，方便自己記錄與查找。</p>
    </div>

    <div class="panel">
      <div class="map-area" id="mapArea">${pins}<div class="hint">點擊空白處新增標記</div></div>
      <div class="catlegend">${legend}</div>
    </div>

    <div class="panel">
      <div class="searchbar">
        <input type="text" id="map_search" placeholder="搜尋標記名稱…" value="${escapeHtml(mapSearch)}">
      </div>
      <div class="filterbar">${filterBtns}</div>
      <div id="markerListWrap">${rows}</div>
    </div>
  `;

  document.getElementById('mapArea').onclick = e=>{
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX-rect.left)/rect.width)*100;
    const y = ((e.clientY-rect.top)/rect.height)*100;
    pendingPin = {x,y};
    editMarker(null);
  };
  document.getElementById('map_search').oninput = e=>{
    mapSearch = e.target.value;
    const list = state.markers.filter(m=>(mapFilter==='all'||m.cat===mapFilter) && m.name.toLowerCase().includes(mapSearch.toLowerCase()));
    document.getElementById('markerListWrap').innerHTML = renderMarkerRows(list);
  };
}
function setMapFilter(id){ mapFilter=id; render(); }

function renderMarkerRows(visibleMarkers){
  return visibleMarkers.length ? visibleMarkers.map(m=>{
    const cat = CATS.find(c=>c.id===m.cat) || CATS[CATS.length-1];
    return `<div class="list-row">
      <div class="main">
        <div class="title"><span class="tag moss">${cat.label}</span>${escapeHtml(m.name)}</div>
        <div class="sub">${m.note?escapeHtml(m.note):'（無備註）'} · 座標 ${m.x.toFixed(0)},${m.y.toFixed(0)}</div>
      </div>
      <div class="acts">
        <button class="small" onclick="editMarker('${m.id}')">編輯</button>
        <button class="small danger" onclick="deleteMarker('${m.id}')">刪除</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty">${state.markers.length? '找不到符合的標記':'尚未標記任何資源點，點擊上方地圖新增第一個'}</div>`;
}

function editMarker(id){
  const m = id ? state.markers.find(x=>x.id===id) : {id:null, name:'', cat:'ore', note:'', x:pendingPin.x, y:pendingPin.y};
  const catOptions = CATS.map(c=>`<option value="${c.id}" ${m.cat===c.id?'selected':''}>${c.label}</option>`).join('');
  showModal(`
    <h3>${id?'編輯標記':'新增標記'}</h3>
    <div class="field"><label>名稱</label><input type="text" id="mk_name" value="${escapeHtml(m.name)}" placeholder="例如：鐵礦脈"></div>
    <div class="field"><label>類別</label><select id="mk_cat">${catOptions}</select></div>
    <div class="field"><label>備註（選填）</label><textarea id="mk_note" placeholder="例如：靠近湖邊，刷新較快">${escapeHtml(m.note||'')}</textarea></div>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="primary" onclick="saveMarker('${id||''}', ${m.x}, ${m.y})">儲存</button>
      ${id?`<button class="ghost danger" onclick="deleteMarker('${id}');closeModal();">刪除</button>`:''}
      <button class="ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
async function saveMarker(id, x, y){
  const name = document.getElementById('mk_name').value.trim();
  if(!name){ toast('請填寫名稱'); return; }
  const cat = document.getElementById('mk_cat').value;
  const note = document.getElementById('mk_note').value.trim();
  if(id){
    const m = state.markers.find(mk=>mk.id===id);
    m.name=name; m.cat=cat; m.note=note;
  }else{
    state.markers.push({id:uid(), name, cat, note, x, y});
  }
  await saveKey('markers', state.markers);
  closeModal(); toast('已儲存'); render();
}
async function deleteMarker(id){
  state.markers = state.markers.filter(m=>m.id!==id);
  await saveKey('markers', state.markers);
  render();
}

/* ---------------- shared modal ---------------- */
function showModal(html){
  const bd = document.createElement('div');
  bd.className='modal-backdrop';
  bd.id='modalBackdrop';
  bd.onclick = e=>{ if(e.target===bd) closeModal(); };
  bd.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(bd);
}
function closeModal(){
  const bd = document.getElementById('modalBackdrop');
  if(bd) bd.remove();
}

/* ---------------- utils ---------------- */
function formatDuration(sec){
  sec = Math.round(sec);
  if(sec<=0) return '0秒';
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  let out='';
  if(h) out+=h+'時';
  if(m) out+=m+'分';
  if(s || (!h&&!m)) out+=s+'秒';
  return out;
}
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

init();