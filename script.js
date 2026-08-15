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

const CHAR_SYNONYMS = {
  '姜': '薑',
};

const DEFAULT_FUELS = [
  {name:'樹葉', seconds:60},
  {name:'茅草', seconds:60},
  {name:'煤炭', seconds:180},
  {name:'蒸氣石', seconds:300},
  {name:'魔晶', seconds:31},
  {name:'樹葉', seconds:60},
  {name:'花蕊', seconds:60},
];

const DEFAULT_RECIPES = [
  {name:'蠶絲', time:20, inputQty:1, outputQty:1, fuels:['樹葉']},
  {name:'雲繡蠶絲', time:20, inputQty:1, outputQty:1, fuels:['樹葉']},
  {name:'蜂蜜', time:20, inputQty:1, outputQty:2, fuels:['花蕊']},
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
  {name:'蠶絲', time:20, inputQty:1, outputQty:1, fuels:['樹葉']},
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

const LOOKBOOK_BASE = [
  {name:'烤雞腿', mat:'生雞腿', satiety:30},
  {name:'烤豬排', mat:'生豬排', satiety:50, hydration:-10},
  {name:'烤羊排', mat:'生羊排', satiety:40, hydration:-10},
  {name:'烤牛排', mat:'生牛排', satiety:40, hydration:-10},
  {name:'烤野味', mat:'野味肉塊', satiety:30, hydration:-10},
  {name:'烤雞蛋', mat:'生雞蛋', satiety:20, effect:'血量'},
  {name:'烤玉米', mat:'玉米', satiety:20, hydration:-5},
  {name:'烤蘑菇', mat:'蘑菇', satiety:10, hydration:-5},
  {name:'烤土豆', mat:'土豆', satiety:15, hydration:-10},
  {name:'烤南瓜', mat:'南瓜', satiety:15, hydration:-10},
  {name:'烤香蕉', mat:'香蕉', satiety:10},
  {name:'烤蘋果', mat:'蘋果', satiety:10},
  {name:'烤辣椒', mat:'辣椒'},
  {name:'烤龜蛋', mat:'龜蛋', satiety:30, hydration:-10},
  {name:'烤洋蔥', mat:'洋蔥', satiety:10},
  {name:'烤筍尖', mat:'竹筍', satiety:10},
  {name:'烤青椒', mat:'青椒', satiety:5},
  {name:'烤章魚', mat:'章魚', satiety:30, hydration:-10},
  {name:'烤大扇貝', mat:'大扇貝', satiety:20},
  {name:'烤小扇貝', mat:'小扇貝', satiety:10},
  {name:'烤帶魚', mat:'帶魚', satiety:30},
  {name:'烤三文魚', mat:'三文魚', satiety:30},
  {name:'烤金槍魚', mat:'金槍魚', satiety:30},
  {name:'烤紅鯉魚', mat:'紅鯉魚', satiety:30},
  {name:'烤綠鯉魚', mat:'綠鯉魚', satiety:30},
  {name:'烤綠鱸魚', mat:'綠鱸魚', satiety:30},
  {name:'烤鰻魚', mat:'鰻魚', satiety:30},
  {name:'烤鮫魚', mat:'鮫魚', satiety:30},
  {name:'烤桂魚', mat:'桂魚', satiety:30},
  {name:'炒瓜子', mat:'向日葵種子', satiety:10, hydration:-5},
  {name:'聖焰雞腿', mat:'生雞腿', satiety:30, effect:'攻擊'},
  {name:'聖焰豬排', mat:'生豬排', satiety:50, hydration:-10, effect:'防禦'},
  {name:'聖焰羊排', mat:'生羊排', satiety:40, hydration:-10, effect:'速度'},
  {name:'聖焰牛排', mat:'生牛排', satiety:40, hydration:-10, effect:'攻擊'},
  {name:'聖焰野味', mat:'野味肉塊', satiety:30, hydration:-10, effect:'防禦'},
  {name:'聖焰雞蛋', mat:'生雞蛋', satiety:20, effect:'血量'},
  {name:'聖焰玉米', mat:'玉米', satiety:20, hydration:-5, effect:'防禦'},
  {name:'聖焰蘑菇', mat:'蘑菇', satiety:10, hydration:-5, effect:'速度'},
  {name:'聖焰土豆', mat:'土豆', satiety:15, hydration:-10, effect:'攻擊'},
  {name:'聖焰南瓜', mat:'南瓜', satiety:15, hydration:-10, effect:'防禦'},
  {name:'聖焰香蕉', mat:'香蕉', satiety:10, effect:'速度'},
  {name:'聖焰蘋果', mat:'蘋果', satiety:10, effect:'攻擊'},
  {name:'聖焰辣椒', mat:'辣椒', effect:'禦寒'},
  {name:'聖焰龜蛋', mat:'龜蛋', satiety:30, hydration:-10, effect:'速度'},
  {name:'聖焰洋蔥', mat:'洋蔥', satiety:10, effect:'速度'},
  {name:'聖焰筍尖', mat:'竹筍', satiety:10, effect:'攻擊'},
  {name:'聖焰青椒', mat:'青椒', satiety:5, effect:'防禦'},
  {name:'聖焰章魚', mat:'章魚', satiety:30, hydration:-10, effect:'攻擊'},
  {name:'聖焰大扇貝', mat:'大扇貝', satiety:20, effect:'攻擊'},
  {name:'聖焰小扇貝', mat:'小扇貝', satiety:10, effect:'防禦'},
  {name:'聖焰帶魚', mat:'帶魚', satiety:30, effect:'攻擊'},
  {name:'聖焰三文魚', mat:'三文魚', satiety:30, effect:'防禦'},
  {name:'聖焰金槍魚', mat:'金槍魚', satiety:30, effect:'速度'},
  {name:'聖焰紅鯉魚', mat:'紅鯉魚', satiety:30, effect:'防禦'},
  {name:'聖焰綠鯉魚', mat:'綠鯉魚', satiety:30, effect:'速度'},
  {name:'聖焰綠鱸魚', mat:'綠鱸魚', satiety:30, effect:'攻擊'},
  {name:'聖焰鰻魚', mat:'鰻魚', satiety:30, effect:'防禦'},
  {name:'聖焰鮫魚', mat:'鮫魚', satiety:30, effect:'速度'},
  {name:'聖焰桂魚', mat:'桂魚', satiety:30, effect:'攻擊'},
  {name:'劍齒虎飼料*17', mat:['生牛排' ,'小龍蝦','飼餵肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'劍齒虎王飼料*13', mat:['小龍蝦' ,'生牛排', '優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'岩火劍齒虎飼料*30', mat:['大扇貝' ,'優質肉塊','稀有肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'岩火劍齒虎王飼料*35', mat:['大扇貝' ,'稀有肉塊','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'獅鷲飼料*110', mat:['鯊魚心臟' ,'精靈魚','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'暴力兔飼料*20', mat:['牛奶' ,'胡蘿蔔飼料包', '稀有肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'暴力兔王飼料*25', mat:['竹筍飼料包' ,'胡蘿蔔飼料包','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'藍蜥蜴飼料*5', mat:['藍蘑菇' ,'飼餵肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'紅蜥蜴飼料*5', mat:['紅蘑菇' ,'飼餵肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'狼王飼料*14', mat:['生羊排' ,'優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'沙漠狼飼料*13', mat:['生羊排' ,'土豆飼料包','飼餵肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'沙漠狼王飼料*15', mat:['生羊排' ,'土豆飼料包', '優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'雪原狼飼料*unknown', mat:['生羊排' ,'小麥飼料包', '飼餵肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'幼鯖鯊飼料*25', mat:['生羊排' ,'象拔蚌', '優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'灰鯖鯊飼料*60', mat:['小丑魚' ,'藍蓮飼料包', '稀有肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'虎皮鯊飼料*110', mat:['小丑魚' ,'金龍魚', '罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'駱駝飼料*7', mat:['小麥飼料包' ,'玉米飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'小烏龜飼料*4', mat:['鯉魚' ,'小麥飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'岩漿海龜飼料*13', mat:['鯉魚' ,'大閘蟹'], category:'飼料', building:'烹飪鍋'},
  {name:'水池龜飼料*14', mat:['三文魚' ,'鯰魚'], category:'飼料', building:'烹飪鍋'},
  {name:'黑馬飼料*45', mat:['鮑魚' ,'小麥飼料包','藍蓮飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'紅馬飼料*13', mat:['小麥飼料包' ,'辣椒飼料包','優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'藍馬飼料*8', mat:['河豚' ,'小麥飼料包','玉米飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'沙豬飼料*1', mat:['小麥飼料包' ,'玉米飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'陸行鳥飼料*12', mat:['小麥飼料包' ,'胡蘿蔔飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'青色陸行鳥飼料*110', mat:['紅蓮飼料包' ,'洋蔥飼料包','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'大角牛飼料*20', mat:['小麥飼料包' ,'白蓮飼料包','稀有肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'大角牛王飼料*23', mat:['小麥飼料包' ,'白蓮飼料包','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'荒原牛飼料*6', mat:['甘蔗' ,'蘋果', '小麥飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'獨角獸飼料*120', mat:['精靈魚' ,'帝王蟹', '草莓飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'毒液龍飼料*20', mat:['生雞蛋' ,'毒蘑菇飼料包', '稀有肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'毒液龍王飼料*25', mat:['龜蛋' ,'毒蘑菇飼料包', '罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'冰毒液龍飼料*50', mat:['冰精' ,'雞蛋飼料包', '北極冰魚飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'冰毒液龍王飼料*55', mat:['冰精' ,'龜蛋飼料包', '霜凍之花'], category:'飼料', building:'烹飪鍋'},
  {name:'棕熊飼料*13', mat:['草莓' ,'蜂蜜飼料包', '飼餵肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'棕熊大飼料*16', mat:['海帶' ,'帶魚', '小麥飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'藍熊大飼料*12', mat:['蜂蜜飼料包' ,'優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'雪原熊飼料*9', mat:['甘蔗' ,'小麥飼料包', '蜂蜜飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'雪原熊大飼料*13', mat:['蜂蜜飼料包' ,'優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'霸王龍飼料*15', mat:['松露' ,'土豆飼料包', '優質肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'暗黑霸王龍飼料*55', mat:['象拔蚌' ,'稀有肉塊','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'巨猿飼料*13', mat:['香蕉' ,'松果', '大閘蟹'], category:'飼料', building:'烹飪鍋'},
  {name:'猛瑪象飼料*13', mat:['松果','大龍蝦' ,'胡蘿蔔飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'雪猛瑪飼料*13', mat:['大龍蝦','玉米飼料包' ,'土豆飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'雲斑鸚鳥飼料*45', mat:['鮑魚' ,'小麥飼料包', '辣椒飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'上古顎龍飼料*55', mat:['鮑魚' ,'桂魚', '章魚'], category:'飼料', building:'烹飪鍋'},
  {name:'熔火龍飼料*110', mat:['龍涎草' ,'精靈魚','罕見肉塊'], category:'飼料', building:'烹飪鍋'},
  {name:'北境犀鳥飼料*110', mat:['冰精' ,'鰩魚', '冰河松果飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'北境骨龍飼料*110', mat:['冰精' ,'冰龍涎草','北極鱈魚'], category:'飼料', building:'烹飪鍋'},
  {name:'大閘蟹釣魚餌', mat:['大閘蟹' ,'小麥飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'小龍蝦釣魚餌', mat:['小龍蝦' ,'小麥飼料包'], category:'飼料', building:'烹飪鍋'},
  {name:'蟹肉煲', mat:['帝王蟹' ,'朝天椒', '生雞腿'], satiety:135, category:'吃的', building:'烹飪鍋'},
  {name:'乾煸豆角', mat:['黃豆' ,'朝天椒', '胡椒'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'檸檬蒸冰魚', mat:['北極冰魚' ,'檸檬', '辣椒'], satiety:60, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'芙蓉冰魚片', mat:['北極冰魚' ,'白蓮'], satiety:40, hydration:50, category:'吃的', building:'烹飪鍋'},
  {name:'胡蘿蔔燜冰魚', mat:['北極冰魚' ,'胡蘿蔔'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'紅燒冰魚', mat:['北極冰魚' ,'辣椒', '薑'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸冰魚', mat:['北極冰魚' ,'薑', '白蓮'], satiety:70, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'土豆燒帶魚', mat:['帶魚' ,'土豆', '胡椒'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'浪花東星斑', mat:['東星斑魚', '辣椒', '青椒'], satiety:65, effect:'禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'翡翠東星斑', mat:['東星斑魚', '菠菜'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'珠簾東星斑', mat:['東星斑魚', '生雞蛋','辣椒'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸東星斑', mat:['東星斑魚', '薑'], satiety:65, category:'吃的', building:'烹飪鍋'},
  {name:'蘑菇燉河豚', mat:['河豚', '蘑菇', '薑'], satiety:60, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'炸河豚塊', mat:['河豚', '胡椒'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'虎斑炒蘿蔔', mat:['老虎斑魚', '胡蘿蔔'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸虎斑魚', mat:['老虎斑魚', '薑'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'胡椒鯉魚尾', mat:['鯉魚','胡椒'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'芙蓉虎星斑', mat:['老虎斑魚','東星斑魚','白蓮'], satiety:85, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸帝王蟹', mat:['帝王蟹','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'香辣帝王蟹', mat:['帝王蟹','辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'茄汁鮫魚', mat:['鮫魚','番茄','薑'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'帝王琵琶鍋', mat:['帝王蟹','大龍蝦','薑'], satiety:105,effect:'禦寒',category:'吃的', building:'烹飪鍋'},
  {name:'扇貝意大利面', mat:['大扇貝','小麥','蘑菇'], satiety:50, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'松鼠的小零食', mat:['松果','冰河松果'], satiety:40,effect:'加速',category:'吃的', building:'烹飪鍋'},
  {name:'胡辣冰魚湯', mat:['北極冰魚','辣椒','胡椒'], satiety:45,effect:'禦寒',category:'喝的', building:'烹飪鍋'},
  {name:'玫瑰香蕉奶昔', mat:['玫瑰茄','香蕉','牛奶'], satiety:40, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'玫瑰檸檬茶', mat:['玫瑰茄','檸檬'], satiety:20, hydration:60, category:'喝的', building:'烹飪鍋'},
  {name:'蘿蔔鮮貝湯', mat:['胡蘿蔔','大扇貝','薑'], satiety:50, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'白蓮牛汁湯', mat:['白蓮','生牛排','胡蘿蔔'], satiety:40, hydration:50, category:'喝的', building:'烹飪鍋'},
  {name:'芙蓉菠菜湯', mat:['白蓮','菠菜'], satiety:50, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'菠菜鯉魚湯', mat:['菠菜','鯉魚'], satiety:45, category:'喝的', building:'烹飪鍋'},
  {name:'桃可豆奶茶', mat:['可可豆','桃子','牛奶'], satiety:30, hydration:50, category:'喝的', building:'烹飪鍋'},
  {name:'章魚沙拉', mat:['章魚','土豆','玉米'], satiety:50, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'椒鹽銀鯧魚', mat:['烤辣椒','朝天椒','銀鯧魚'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸綠鯉魚', mat:['綠鯉魚','土豆','薑'], satiety:70, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'黃桃罐頭', mat:['甘蔗','桃子'], satiety:40, hydration:15, category:'吃的', building:'烹飪鍋'},
  {name:'四喜丸子', mat:['生雞蛋','胡椒','野味肉塊'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'脆炸香蕉', mat:['小麥','雞蛋','香蕉'], satiety:50, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'芙蓉蟹肉', mat:['帝王蟹','小龍蝦','生豬肉'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'野味串燒', mat:['野味肉塊','龜蛋','珍珠'], satiety:50, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'揚州炒飯', mat:['小龍蝦','生雞蛋','玉米'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'葡萄果醬', mat:['葡萄','葡萄'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'蜜桃果醬', mat:['桃子','桃子'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'泰式冬陰功湯', mat:['小龍蝦','小扇貝','香茅'], satiety:80, hydration:50, category:'喝的', building:'烹飪鍋'},
  {name:'絲滑蝦球', mat:['甘蔗','玉米','小龍蝦'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'魚頭泡餅', mat:['綠鱸魚','鮁魚','小麥'], satiety:80, hydration:35, category:'吃的', building:'烹飪鍋'},
  {name:'牛肉飯糰', mat:['生牛排','海帶','小麥'], satiety:85, category:'吃的', building:'烹飪鍋'},
  {name:'沙灘野味', mat:['烤野味','烤龜蛋','葡萄'], satiety:110, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'可樂餅', mat:['小麥','洋蔥','土豆'], satiety:40, hydration:-10, category:'吃的', building:'烹飪鍋'},
  {name:'檸檬派', mat:['小麥','甘蔗','檸檬'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'海帶豆腐蝦湯', mat:['海帶','黃豆','小龍蝦'], satiety:80, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'乾鍋牛蛙', mat:['土豆','竹筍','牛蛙'], satiety:105, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸銀鯧魚', mat:['銀鯧魚','土豆','竹筍'], satiety:60, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'檸檬雞', mat:['朝天椒','檸檬','雞腿'], satiety:100, effect:'禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'辣子雞丁', mat:['烤雞腿','烤辣椒'], satiety:60, effect:'禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'清蒸小丑魚', mat:['小丑魚','土豆','竹筍'], satiety:60, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'爆炒魷魚', mat:['章魚','青椒','洋蔥'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'淘汰郎火鍋', mat:['菠菜','辣椒','生牛排'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'先秦肉夾饃', mat:['小麥','烤豬排','胡椒'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'滑蛋牛柳', mat:['生牛排','生雞蛋'], satiety:45, hydration:5, category:'吃的', building:'烹飪鍋'},
  {name:'羊排飯團', mat:['烤羊排','海帶','小麥'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'柚子檸檬茶', mat:['柑橘','檸檬','蜂蜜'], satiety:50, hydration:35, category:'喝的', building:'烹飪鍋'},
  {name:'香茅醬', mat:['香茅','朝天椒','薑'], satiety:105,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'松果蛋糕', mat:['小麥','牛奶','松果'], satiety:65, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'小丑魚刺身', mat:['番茄','檸檬','小丑魚'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'茄汁綠驢魚', mat:['綠驢魚','番茄','洋蔥'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'咖哩龜蛋', mat:['洋蔥','胡椒','龜蛋'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'藍蘑菇湯', mat:['藍蘑菇','牛奶'], satiety:35, hydration:50,effect: '耐熱', category:'喝的', building:'烹飪鍋'},
  {name:'紅蘑菇湯', mat:['紅蘑菇','牛奶'], satiety:35, hydration:50,effect: '禦寒', category:'喝的', building:'烹飪鍋'},
  {name:'麻婆豆腐', mat:['生豬排','辣椒','黃豆'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'南瓜咖哩雞', mat:['南瓜','烤雞腿','烤蘑菇'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'香炸龍蝦球', mat:['小龍蝦','小麥'], satiety:100, category:'吃的', building:'烹飪鍋'},
  {name:'麻辣土豆絲', mat:['辣椒','土豆'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'培根土豆泥', mat:['蘑菇','土豆'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'玫瑰茄醬', mat:['甘蔗','玫瑰茄'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'香芋蒸排骨', mat:['芋頭','生豬排'], satiety:65, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'酸湯桂魚', mat:['桂魚','番茄','蘑菇'], satiety:70, hydration:15, category:'吃的', building:'烹飪鍋'},
  {name:'蒲燒鰻魚', mat:['鰻魚','甘蔗','洋蔥'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'菌類靈魚湯', mat:['精靈魚','蘑菇','竹筍'], satiety:220, hydration:50,effect: '攻擊', category:'吃的', building:'烹飪鍋'},
  {name:'靚膚彩蓮湯', mat:['白蓮','紅蓮','藍蓮'], satiety:260, category:'吃的', building:'烹飪鍋'},
  {name:'紅鯉魚與綠鯉魚', mat:['紅鯉魚','綠鯉魚'], satiety:85, hydration:35, category:'吃的', building:'烹飪鍋'},
  {name:'河豚刺身', mat:['河豚','番茄','檸檬'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'藍莓果醬', mat:['藍莓','藍莓'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'草莓果醬', mat:['草莓','草莓'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'辛香匯水煮牛蛙', mat:['朝天椒','胡椒','牛蛙'], satiety:105, category:'吃的', building:'烹飪鍋'},
  {name:'秘汁焗斑魚', mat:['東星斑魚','蜂蜜','烤雞腿'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'清涼水果匯', mat:['檸檬','蘋果','甘蔗'], satiety:40, hydration:50,effect: '耐熱', category:'喝的', building:'烹飪鍋'},
  {name:'香蕉派', mat:['小麥','香蕉','生雞蛋'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'胡蘿蔔滑蛋', mat:['胡蘿蔔','烤雞蛋','黃豆'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'番茄玉米羊湯', mat:['番茄','玉米','生羊排'], satiety:50, hydration:35, category:'喝的', building:'烹飪鍋'},
  {name:'西紅柿羊肉面', mat:['番茄','生羊排','小麥'], satiety:65, hydration:15, category:'吃的', building:'烹飪鍋'},
  {name:'西紅柿炒蛋', mat:['番茄','生雞蛋'], satiety:45, hydration:5, category:'吃的', building:'烹飪鍋'},
  {name:'三文魚漢堡', mat:['三文魚','小麥','番茄'], satiety:85, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'三文魚刺身', mat:['三文魚','番茄'], satiety:45, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'豬排漢堡', mat:['烤豬排','小麥','番茄'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'魷魚漢堡', mat:['烤章魚','小麥','番茄'], satiety:70, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'野味漢堡', mat:['烤野味','小麥','番茄'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'牛排漢堡', mat:['烤牛排','小麥','番茄'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'經典漢堡', mat:['烤雞腿','小麥','番茄'], satiety:65, category:'吃的', building:'烹飪鍋'},
  {name:'象拔蚌刺身', mat:['象拔蚌','番茄'], satiety:100, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'炸洋蔥圈', mat:['洋蔥','番茄','生雞蛋'], satiety:40, hydration:-10, category:'吃的', building:'烹飪鍋'},
  {name:'金槍魚漢堡', mat:['金槍魚','小麥','番茄'], satiety:60, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'鮮芋仙芋圓4號', mat:['芋頭','紅豆'], satiety:60, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'玉米豬排', mat:['生豬排','玉米'], satiety:45, hydration:25, category:'吃的', building:'烹飪鍋'},
  {name:'蘑菇豬排', mat:['蘑菇','烤豬排'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'鮫魚餃子', mat:['鮫魚','小麥'], satiety:80, hydration:5, category:'吃的', building:'烹飪鍋'},
  {name:'辣炒鮫魚', mat:['鮫魚','烤辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'荷花魚翅', mat:['白蓮','菠菜','鮫魚'], satiety:80, hydration:50, category:'吃的', building:'烹飪鍋'},
  {name:'紅豆蓮子羹', mat:['白蓮','小麥','紅豆'], satiety:30, hydration:60,effect: '耐熱', category:'吃的', building:'烹飪鍋'},
  {name:'雞排(綁定)', mat:[], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'鮑魚撈飯', mat:['鮑魚','胡蘿蔔','蘑菇'], satiety:105, hydration:50,effect: '血量', category:'吃的', building:'烹飪鍋'},
  {name:'多汁鮑魚', mat:['鮑魚','南瓜','蜂蜜'], satiety:105, hydration:60,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'晨夕養生湯', mat:['菠菜','海帶','胡蘿蔔'], satiety:50, hydration:40, category:'吃的', building:'烹飪鍋'},
  {name:'菠菜炒蛋', mat:['菠菜','黃豆','生雞蛋'], satiety:75, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'下品菠菜炒蛋', mat:['菠菜','生雞蛋'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'口水雞', mat:['菠菜','生雞腿','黃豆'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'怪味肉塊', mat:['飼喂肉塊','生牛排'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'果醬', mat:['草莓','藍莓'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'草莓果茶', mat:['草莓','玫瑰茄','蘋果'], satiety:40, hydration:80, category:'喝的', building:'烹飪鍋'},
  {name:'草莓牛奶', mat:['草莓','牛奶'], satiety:30, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'草莓蛋糕', mat:['草莓','牛奶','小麥'], satiety:65, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'怪味零食', mat:['飼喂肉塊','章魚','生牛肉'], satiety:45, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'草莓派', mat:['草莓','小麥'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'松仁玉米', mat:['松果','胡蘿蔔','玉米'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'草莓椰果', mat:['草莓','椰子'], satiety:40, hydration:25, category:'喝的', building:'烹飪鍋'},
  {name:'松子魚湯', mat:['松果','青斑魚','薑'], satiety:70, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'松仁玉米粥', mat:['松果','玉米','甘蔗'], satiety:50, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'草莓奶茶', mat:['草莓','珍珠','牛奶'], satiety:45, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'松露玉簪蝦球', mat:['松露','小龍蝦','小麥'], satiety:100, category:'吃的', building:'烹飪鍋'},
  {name:'椒香牛柳', mat:['朝天椒','胡椒','生牛排'], satiety:105,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'清蒸大龍蝦', mat:['大龍蝦','番茄','烤南瓜'], satiety:100,effect: '血量', category:'吃的', building:'烹飪鍋'},
  {name:'蜜桃果醬', mat:['桃子','桃子'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'黃桃牛奶', mat:['桃子','牛奶'], satiety:40, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'水果沙拉', mat:['桃子','西瓜','蘋果'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸大蝦', mat:['大龍蝦','薑','胡椒'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'龍蝦小丸子', mat:['大龍蝦','小麥'], satiety:100, category:'吃的', building:'烹飪鍋'},
  {name:'黃桃派', mat:['桃子','小麥'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'紅菇大蝦包（未綁定）', mat:['大龍蝦','小麥','紅蘑菇'], satiety:105,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'紅菇大蝦包（綁定）', mat:['大龍蝦','小麥','紅蘑菇'], satiety:150,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'黃桃奶茶', mat:['桃子','珍珠','牛奶'], satiety:45, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'藍菇大蝦包', mat:['大龍蝦','小麥','藍蘑菇'], satiety:105,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'咖喱牛肉', mat:['土豆','洋蔥','生牛排'], satiety:45, category:'吃的', building:'烹飪鍋'},
  {name:'吉利蝦', mat:['大龍蝦','洋蔥','胡椒'], satiety:105,effect: '血量', category:'吃的', building:'烹飪鍋'},
  {name:'怪味麻辣肉', mat:['土豆飼料包','黃豆飼料包','辣椒飼料包'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'西瓜沙冰', mat:['西瓜','蜂蜜'], satiety:40, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'大貝披薩', mat:['大扇貝','小麥','青椒'], satiety:40, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'西瓜牛奶', mat:['西瓜','牛奶'], satiety:40, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'香炸蟹腿', mat:['大閘蟹','小麥'], satiety:65, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'金裝水果樂園', mat:['西瓜','葡萄','草莓'], satiety:50, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'糖醋帶魚', mat:['帶魚','甘蔗'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'西瓜奶茶', mat:['西瓜','珍珠','牛奶'], satiety:45, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'辣炒帶魚', mat:['帶魚','烤辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'芋頭燒帶魚', mat:['帶魚','青椒','芋頭'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'剁椒蒸帶魚', mat:['帶魚','青椒','竹筍'], satiety:105,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'東星斑魚鍋', mat:['東星斑魚','胡椒','洋蔥'], satiety:80, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'魚香肉絲飯', mat:['東星斑魚','小麥','烤豬排'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'松鼠桂魚', mat:['香蕉','蜂蜜','桂魚'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'酸湯斑魚', mat:['東星斑魚','竹筍','番茄'], satiety:60, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'香蕉牛奶', mat:['香蕉','牛奶'], satiety:40, hydration:10, category:'喝的', building:'烹飪鍋'},
  {name:'海南雞', mat:['香茅','檸檬','生雞腿'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'番茄醬', mat:['番茄', '番茄'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'番茄魚丸湯', mat:['番茄','鯉魚'], satiety:40, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'象拔蚌撈飯', mat:['象拔蚌','胡蘿蔔','蘑菇'], satiety:105, hydration:50,effect: '血量', category:'吃的', building:'烹飪鍋'},
  {name:'薯條', mat:['番茄','土豆'], satiety:45, hydration:-10, category:'吃的', building:'烹飪鍋'},
  {name:'蚵仔煎', mat:['象拔蚌','生雞蛋','胡椒'], satiety:105, hydration:30,effect: '血量', category:'吃的', building:'烹飪鍋'},
  {name:'蜂蜜照燒雞', mat:['蜂蜜','甘蔗','雞腿'], satiety:50, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'蜂蜜蛋糕', mat:['蜂蜜','牛奶','小麥'], satiety:85, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'蜂蜜雞蛋羹', mat:['蜂蜜','生雞蛋'], satiety:70, hydration:25, category:'吃的', building:'烹飪鍋'},
  {name:'雙皮奶', mat:['甘蔗','生雞蛋','牛奶'], satiety:50, hydration:15, category:'喝的', building:'烹飪鍋'},
  {name:'西瓜汁', mat:['甘蔗','西瓜'], hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'柑橘罐頭', mat:['柑橘','甘蔗'], satiety:40, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'柑橘可可蛋糕', mat:['柑橘','可可豆','小麥'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'蜜橘果茶', mat:['柑橘','香茅','蘋果'], satiety:40, hydration:80, category:'喝的', building:'烹飪鍋'},
  {name:'柑橘可麗餅', mat:['柑橘','小麥','牛奶'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'辣炒桂魚', mat:['桂魚','烤辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'海帶蓮子湯', mat:['海帶','紅蓮','白蓮'], satiety:60, category:'喝的', building:'烹飪鍋'},
  {name:'蓮子羊湯', mat:['海帶','生羊排','藍蓮'], satiety:60, category:'喝的', building:'烹飪鍋'},
  {name:'怪味魚肉', mat:['河豚','鯰魚'], satiety:35, hydration:30, category:'吃的', building:'烹飪鍋'},
  {name:'豆沙包', mat:['紅豆','小麥'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'八寶粥', mat:['紅豆','玉米','甘蔗'], satiety:45, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'川椒鯉魚', mat:['紅鯉魚','綠鯉魚','辣椒'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'紅燒紅鯉魚', mat:['紅鯉魚','小麥'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'蝦兵蟹將', mat:['小龍蝦','大閘蟹'], satiety:110,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'紅菇小蝦包', mat:['小龍蝦','小麥','紅蘑菇'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'藍菇小蝦包', mat:['小龍蝦','小麥','藍蘑菇'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'蘑菇小蝦包', mat:['小龍蝦','小麥','蘑菇'], satiety:85, category:'吃的', building:'烹飪鍋'},
  {name:'辛香匯水煮魚', mat:['胡椒','朝天椒','鯰魚'], satiety:100, effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'絲滑鐵肘子', mat:['胡椒','黃豆','生豬排'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'蛋黃蓮蓉月餅', mat:['小麥','白蓮','生雞蛋'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸小童子雞', mat:['胡椒','生雞腿','胡蘿蔔'], satiety:55, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'翡翠月餅', mat:['小麥','菠菜','牛奶'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'藤椒牛蛙', mat:['胡椒','檸檬','牛蛙'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'水果月餅', mat:['小麥','草莓','蘋果'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'福源肉丸', mat:['胡椒','小麥','生豬排'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'烤雞蛋布丁', mat:['烤雞蛋','牛奶'], satiety:60, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'黃金玉米烙', mat:['小麥','玉米','蜂蜜'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'蛋黃小丸子', mat:['烤雞蛋','小麥'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'玉米月餅', mat:['小麥','玉米','南瓜'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'紫薯蓮蓉月餅', mat:['小麥','芋頭','白蓮'], satiety:65, category:'吃的', building:'烹飪鍋'},
  {name:'蜜汁雞腿', mat:['烤雞腿','蜂蜜'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'雞排飯團', mat:['烤雞腿','海帶','小麥'], satiety:65, category:'吃的', building:'烹飪鍋'},
  {name:'麻辣小龍蝦', mat:['烤辣椒','小龍蝦'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'牛排飯團', mat:['烤牛排','海帶','小麥'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'蔬菜串燒', mat:['烤蘋果','烤香蕉','烤玉米'], satiety:85, category:'吃的', building:'烹飪鍋'},
  {name:'蜜汁烤羊排', mat:['烤羊排','蜂蜜'], satiety:65, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'扇貝蒸蛋', mat:['小扇貝','生雞蛋'], satiety:60, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'小貝披薩', mat:['小扇貝','小麥','青椒'], satiety:35, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'章魚小丸子', mat:['烤章魚','小麥'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'大鵬雞腿', mat:['洋蔥','胡椒','生雞腿'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'大牌滷肉', mat:['洋蔥','胡椒','生豬排'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'肉醬土豆泥', mat:['烤豬排','烤土豆','牛奶'], satiety:130, category:'吃的', building:'烹飪鍋'},
  {name:'魔法怪味豆', mat:['洋蔥','黃豆','胡椒'], category:'吃的', building:'烹飪鍋'},
  {name:'豬排厚蛋燒', mat:['烤豬排','生雞蛋','小麥'], satiety:65, category:'吃的', building:'烹飪鍋'},
  {name:'椰子汁', mat:['椰子','甘蔗'], hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'椰奶', mat:['椰子','牛奶'], satiety:35, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'西米露', mat:['椰子','小麥','牛奶'], satiety:45, hydration:50, category:'喝的', building:'烹飪鍋'},
  {name:'野味肉醬', mat:['野味肉塊','黃豆'], satiety:50, hydration:-10, category:'吃的', building:'烹飪鍋'},
  {name:'巧克力醬', mat:['可可豆'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'野味肉醬面', mat:['野味肉塊','黃豆','小麥'], satiety:50, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'珍珠奶茶', mat:['可可豆','紅豆','牛奶'], satiety:40, hydration:25, category:'喝的', building:'烹飪鍋'},
  {name:'野味肉包', mat:['野味肉塊','小麥'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'巧克力牛奶', mat:['可可豆','牛奶'], satiety:35, hydration:20, category:'喝的', building:'烹飪鍋'},
  {name:'銀鯧魚魚子醬', mat:['銀鯧魚','白蓮'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'巧克力曲奇', mat:['可可豆','牛奶','小麥'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'紅燒銀鯧魚', mat:['銀鯧魚','胡椒','薑'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'奧爾良小烤', mat:['銀鯧魚','烤雞腿','烤羊排'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'巧克力椰果', mat:['可可豆','椰子'], satiety:40, hydration:20, category:'喝的', building:'烹飪鍋'},
  {name:'香煎銀鯧魚', mat:['銀鯧魚','辣椒','青椒'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'巧克力奶茶', mat:['可可豆','珍珠','牛奶'], satiety:50, hydration:20, category:'喝的', building:'烹飪鍋'},
  {name:'香辣小龍蝦', mat:['辣椒','小龍蝦'], satiety:85, category:'吃的', building:'烹飪鍋'},
  {name:'藍莓果茶', mat:['藍莓','玫瑰茄','蘋果'], satiety:40, hydration:80, category:'喝的', building:'烹飪鍋'},
  {name:'爆米花', mat:['玉米','甘蔗'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'什錦河豚肉丁', mat:['玉米','胡蘿蔔','河豚'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'藍莓牛奶', mat:['藍莓','牛奶'], satiety:30, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'玉米珍珠奶茶', mat:['玉米','珍珠','牛奶'], satiety:45, hydration:20, category:'喝的', building:'烹飪鍋'},
  {name:'藍莓蛋糕', mat:['藍莓','牛奶','小麥'], satiety:65, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'蒸芋頭', mat:['芋頭','甘蔗'], satiety:60, hydration:20, category:'喝的', building:'烹飪鍋'},
  {name:'藍莓派', mat:['藍莓','小麥'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'芋頭牛奶', mat:['芋頭','牛奶'], satiety:55, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'藍莓椰果', mat:['藍莓','椰子'], satiety:35, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'藍莓奶茶', mat:['藍莓','珍珠','牛奶'], satiety:50, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'蟹肉宴', mat:['珍珠','大閘蟹','帝王蟹'], satiety:100, category:'吃的', building:'烹飪鍋'},
  {name:'筍釀', mat:['竹筍','蘑菇','生豬排'], satiety:105,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'問政山筍', mat:['竹筍','洋蔥','蘑菇'], satiety:105,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'老虎斑魚鍋', mat:['老虎斑魚','胡椒','洋蔥'], satiety:80, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'椰子煲魚頭', mat:['老虎斑魚','椰子','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'蘋果果醬', mat:['蘋果'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'糖酥鯉魚', mat:['鯉魚','甘蔗'], satiety:45, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'牛蛙煲', mat:['牛蛙','洋蔥','竹筍'], satiety:105, category:'吃的', building:'烹飪鍋'},
  {name:'辣炒鯉魚', mat:['鯉魚','烤辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'紅燒綠鯉魚', mat:['綠鯉魚','小麥'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'清蒸綠驢魚', mat:['綠驢魚','土豆'], satiety:80, category:'吃的', building:'烹飪鍋'},
  {name:'辣炒鰻魚', mat:['鰻魚','烤辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'鰻魚飯', mat:['鰻魚','小麥'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'洛神奶凍', mat:['玫瑰茄','牛奶','生雞蛋'], satiety:50, hydration:5, category:'吃的', building:'烹飪鍋'},
  {name:'蜜桃果茶', mat:['玫瑰茄','桃子','蘋果'], satiety:40, hydration:80, category:'喝的', building:'烹飪鍋'},
  {name:'蘑菇大蝦包', mat:['蘑菇','大龍蝦','小麥'], satiety:105,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'黃燜雞', mat:['蘑菇','青椒','生雞腿'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'南瓜粥', mat:['南瓜','甘蔗','玉米'], satiety:50, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'南瓜起司烘蛋', mat:['南瓜','生雞蛋','小麥'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'蛋黃焗南瓜', mat:['南瓜','烤雞蛋'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'南瓜小丸子', mat:['南瓜','小麥'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'南瓜鬆餅', mat:['南瓜','小麥','牛奶'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'豆腐燒鯰魚', mat:['鯰魚','黃豆'], satiety:40, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'辣炒鯰魚', mat:['鯰魚','烤辣椒','薑'], satiety:90, category:'吃的', building:'烹飪鍋'},
  {name:'香酥魚片', mat:['鯰魚','小麥'], satiety:45, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'蜂蜜檸檬水', mat:['檸檬','甘蔗','蜂蜜'], satiety:30, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'奶油蘑菇湯', mat:['牛奶','蘑菇'], satiety:45, hydration:30, category:'喝的', building:'烹飪鍋'},
  {name:'牛肉醬', mat:['牛肉','黃豆'], satiety:50, hydration:-10, category:'吃的', building:'烹飪鍋'},
  {name:'拔絲蘋果', mat:['蘋果','甘蔗'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'生薑果茶', mat:['蘋果','薑','玫瑰茄'], satiety:40, hydration:80, category:'喝的', building:'烹飪鍋'},
  {name:'香檸果茶', mat:['蘋果','香茅','檸檬'], satiety:40, hydration:80, category:'喝的', building:'烹飪鍋'},
  {name:'蘋果派', mat:['蘋果','小麥'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'葡萄果醬', mat:['葡萄'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'葡萄酒', mat:['葡萄','甘蔗'], satiety:30, hydration:40, category:'喝的', building:'烹飪鍋'},
  {name:'葡萄奶酥', mat:['葡萄','牛奶','生雞蛋'], satiety:50, category:'吃的', building:'烹飪鍋'},
  {name:'一清二白', mat:['青斑魚','黃豆'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'麻辣桂魚', mat:['青椒','桂魚'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'黑椒羊排', mat:['青椒','胡椒','烤羊排'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'絕代三椒', mat:['青椒','辣椒','胡椒'], satiety:60,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'青椒炒蛋', mat:['青椒','生雞蛋'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'爆炒牛蛙', mat:['青椒','洋蔥','牛蛙'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'三文魚通心粉', mat:['三文魚','牛奶','小麥'], satiety:100, hydration:30,effect: '耐力', category:'吃的', building:'烹飪鍋'},
  {name:'香煎帶魚', mat:['洋蔥','小麥','帶魚'], satiety:55, category:'吃的', building:'烹飪鍋'},
  {name:'章魚腿刺身', mat:['章魚','番茄'], satiety:40, hydration:20, category:'吃的', building:'烹飪鍋'},
  {name:'單身狗糧', mat:['龜蛋','生雞蛋'], satiety:40, category:'吃的', building:'烹飪鍋'},
  {name:'辛香匯缽缽雞', mat:['生雞腿','朝天椒','胡椒'], satiety:100,effect: '禦寒', category:'吃的', building:'烹飪鍋'},
  {name:'雞肉飯團', mat:['生雞腿','海帶','小麥'], satiety:75, category:'吃的', building:'烹飪鍋'},
  {name:'小雞燉蘑菇', mat:['生雞腿','蘑菇'], satiety:45, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'香煎牛排', mat:['生牛排','番茄'], satiety:45, hydration:-5, category:'吃的', building:'烹飪鍋'},
  {name:'牛肉包', mat:['生牛排','小麥'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'羊排湯', mat:['生羊排','胡蘿蔔'], satiety:45, hydration:35, category:'吃的', building:'烹飪鍋'},
  {name:'排骨', mat:['生豬排','番茄'], satiety:45, hydration:35, category:'吃的', building:'烹飪鍋'},
  {name:'海帶排骨湯', mat:['生豬排','海帶'], satiety:45, hydration:40, category:'吃的', building:'烹飪鍋'},
  {name:'豬肉飯團', mat:['生豬排','海帶','小麥'], satiety:85, category:'吃的', building:'烹飪鍋'},
  {name:'辣椒炒肉', mat:['生豬排','辣椒'], satiety:60, category:'吃的', building:'烹飪鍋'},
  {name:'大亂燉', mat:['生豬排','生羊排','生牛排'], satiety:50, hydration:10, category:'吃的', building:'烹飪鍋'},
  {name:'豬肉包', mat:['生豬排','小麥'], satiety:70, category:'吃的', building:'烹飪鍋'},
  {name:'芝士焗蟹', mat:['帝王蟹','蜂蜜','牛奶'], satiety:80, category:'吃的', building:'烹飪鍋'},
];

function buildDefaultLookbook(){
  return LOOKBOOK_BASE.map(d=>{
    const effects = Array.isArray(d.effect) ? d.effect.filter(Boolean) : (d.effect ? [d.effect] : []);
    let materials;
    if(Array.isArray(d.mat)){
      materials = d.mat.map(m => typeof m==='string' ? {name:m, qty:1} : {name:m.name, qty:m.qty||1});
    }else{
      materials = [{name:d.mat, qty:1}];
    }
    return {
      id: uid(),
      name: d.name,
      category: d.category || '吃的',
      building: d.building || (d.name.startsWith('聖焰') ? '聖焰篝火' : '篝火'),
      materials,
      satiety: d.satiety!==undefined ? String(d.satiety) : '',
      hydration: d.hydration!==undefined ? String(d.hydration) : '',
      effect: effects
    };
  });
}

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

  const lookbookSeeded = await loadKey('lookbookSeedV3', false);
  if(!lookbookSeeded){
    state.lookbook = state.lookbook.concat(buildDefaultLookbook());
    await saveKey('lookbook', state.lookbook);
    await saveKey('lookbookSeedV3', true);
  }

  // 修復：幫任何缺少 id 的既有資料補上 id（避免編輯/刪除按鈕失效）
  let healed = false;
  for(const list of [state.recipes, state.fuels, state.lookbook, state.markers]){
    for(const item of list){
      if(!item.id){ item.id = uid(); healed = true; }
    }
  }
  if(healed){
    await saveKey('recipes', state.recipes);
    await saveKey('fuels', state.fuels);
    await saveKey('lookbook', state.lookbook);
    await saveKey('markers', state.markers);
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
  ['recipes','fuels','lookbook','markers','schemaVersion','lookbookSeedV3'].forEach(k=>localStorage.removeItem(STORAGE_PREFIX+k));
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
let lookbookCategoryFilters = new Set();
let lookbookBuildingFilters = new Set();

const FOOD_CATEGORIES = ['吃的','喝的','飼料'];
const COOKWARE = ['篝火','聖焰篝火','烹飪鍋','炊鼎'];
const FOOD_EFFECTS = ['禦寒','耐熱','血量','攻擊','防禦','速度','耐力','回飽足+水分','法攻'];
const CATEGORY_TAG_CLASS = {'吃的':'food-eat','喝的':'food-drink','飼料':'food-feed'};
const COOKWARE_TAG_CLASS = {'篝火':'cook-campfire','聖焰篝火':'cook-holyfire','烹飪鍋':'cook-pot','炊鼎':'cook-caldron'};

function normalizeText(s){
  return String(s).toLowerCase().split('').map(c => CHAR_SYNONYMS[c] || c).join('');
}
function lookbookEffects(r){
  return Array.isArray(r.effect) ? r.effect : (r.effect ? [r.effect] : []);
}
function matchesLookbookQuery(r, query){
  const q = normalizeText(query);
  if(!q) return true;
  if(normalizeText(r.name).includes(q)) return true;
  if(r.materials.some(m=>normalizeText(m.name).includes(q))) return true;
  return lookbookEffects(r).some(e=>normalizeText(e).includes(q));
}
function filterLookbook(){
  return state.lookbook.filter(r=>{
    const catOk = lookbookCategoryFilters.size===0 || lookbookCategoryFilters.has(r.category);
    const buildOk = lookbookBuildingFilters.size===0 || lookbookBuildingFilters.has(r.building);
    return catOk && buildOk && matchesLookbookQuery(r, lookbookQuery);
  });
}
function toggleLookbookFilter(kind, value){
  const set = kind==='cat' ? lookbookCategoryFilters : lookbookBuildingFilters;
  if(set.has(value)) set.delete(value); else set.add(value);
  render();
}
function clearLookbookFilters(){
  lookbookCategoryFilters.clear();
  lookbookBuildingFilters.clear();
  render();
}

function renderLookbook(main){
  const filtered = filterLookbook();
  const noFilters = lookbookCategoryFilters.size===0 && lookbookBuildingFilters.size===0;
  const filterBtns = `<button class="filterbtn ${noFilters?'active':''}" onclick="clearLookbookFilters()">全部</button>` +
    FOOD_CATEGORIES.map(c=>`<button class="filterbtn ${lookbookCategoryFilters.has(c)?'active':''}" onclick="toggleLookbookFilter('cat','${c}')">${c}</button>`).join('') +
    `<span style="width:1px;background:var(--border);margin:0 4px;"></span>` +
    COOKWARE.map(c=>`<button class="filterbtn ${lookbookBuildingFilters.has(c)?'active':''}" onclick="toggleLookbookFilter('build','${c}')">${c}</button>`).join('');

  main.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Recipe Book</div>
      <h1>食譜查詢</h1>
      <p>可依名稱、食材、或效果關鍵字搜尋，分類跟廚具可以複選疊加（例如同時選「吃的」+「烹飪鍋」），或一鍵帶入熔爐計算機。</p>
    </div>

    <div class="panel">
      <div class="searchbar">
        <input type="text" id="lb_search" placeholder="搜尋食譜名稱、食材或效果…" value="${escapeHtml(lookbookQuery)}">
        <button class="primary" onclick="editLookbook(null)">+ 新增食譜</button>
      </div>
      <div class="filterbar">${filterBtns}</div>
      <div id="lookbookListWrap">${renderLookbookRows(filtered)}</div>
    </div>
  `;
  document.getElementById('lb_search').oninput = e=>{
    lookbookQuery = e.target.value;
    document.getElementById('lookbookListWrap').innerHTML = renderLookbookRows(filterLookbook());
  };
}

function renderLookbookRows(filtered){
  return filtered.length ? filtered.map(r=>{
    const effectBits = [];
    if(r.satiety) effectBits.push(`飽足感 ${r.satiety}`);
    if(r.hydration) effectBits.push(`水分 ${r.hydration}`);
    effectBits.push(...lookbookEffects(r));
    return `
    <div class="list-row">
      <div class="main">
        <div class="title">${escapeHtml(r.name)} ${r.category?`<span class="tag ${CATEGORY_TAG_CLASS[r.category]||'moss'}">${escapeHtml(r.category)}</span>`:''}${r.building?`<span class="tag ${COOKWARE_TAG_CLASS[r.building]||'steel'}">${escapeHtml(r.building)}</span>`:''}</div>
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
  const r = id ? state.lookbook.find(x=>x.id===id) : {id:null,name:'',category:FOOD_CATEGORIES[0],building:COOKWARE[0],materials:[{name:'',qty:1}],satiety:'',hydration:'',effect:[]};
  const curEffects = lookbookEffects(r);
  const matRows = r.materials.map((m,i)=>`
    <div class="mat-row" data-idx="${i}">
      <input type="text" placeholder="材料名稱" class="m-name" value="${escapeHtml(m.name)}">
      <input type="number" class="qty m-qty" placeholder="數量" value="${m.qty}">
      <button class="small danger" onclick="this.parentElement.remove()">刪</button>
    </div>`).join('');
  const catOptions = FOOD_CATEGORIES.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('');
  const cookButtons = COOKWARE.map(c=>`<span class="recipe-chip ${r.building===c?'active':''}" data-val="${c}" onclick="selectCookware(this)">${c}</span>`).join('');
  const effectChecks = FOOD_EFFECTS.map(e=>`
    <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:13px;color:var(--text);">
      <input type="checkbox" class="effect-check" value="${e}" ${curEffects.includes(e)?'checked':''} style="width:auto;">
      ${e}
    </label>`).join('');

  showModal(`
    <h3>${id?'編輯食譜':'新增食譜'}</h3>
    <div class="row">
      <div class="field"><label>成品名稱</label><input type="text" id="lb_name" value="${escapeHtml(r.name)}" placeholder="例如：烤全魚"></div>
      <div class="field"><label>分類</label><select id="lb_category">${catOptions}</select></div>
    </div>
    <div class="field"><label>廚具</label><div id="lb_building_group">${cookButtons}</div><input type="hidden" id="lb_building" value="${escapeHtml(r.building)}"></div>
    <label>所需材料</label>
    <div id="matRows">${matRows}</div>
    <button class="ghost small" style="margin-top:6px;" onclick="addMatRow()">+ 新增材料</button>

    <label style="margin-top:16px;">食品效果</label>
    <div class="row">
      <div class="field"><label>飽足感</label><input type="number" id="lb_satiety" min="0" value="${r.satiety}"></div>
      <div class="field"><label>水分</label><input type="number" id="lb_hydration" value="${r.hydration}"></div>
    </div>
    <div class="field">
      <label>效果（可複選）</label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px;">${effectChecks}</div>
    </div>

    <div style="display:flex;gap:10px;margin-top:6px;">
      <button class="primary" onclick="saveLookbook('${id||''}')">儲存</button>
      <button class="ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function selectCookware(el){
  const group = document.getElementById('lb_building_group');
  group.querySelectorAll('.recipe-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('lb_building').value = el.dataset.val;
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
  const effect = [...document.querySelectorAll('.effect-check:checked')].map(c=>c.value);
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
      <p>直接點擊地圖上的位置來標出資源點，方便自己記錄與查找。</p>
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