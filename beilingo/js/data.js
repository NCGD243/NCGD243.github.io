/* =========================================================
 *  data.js —— 由 data/poems.json 加载后的全局数据
 *  说明：本文件不直接 fetch，由 main.js 在启动时 fetch 并写入
 *  全局变量 DATA / POEM / SECTION / EXERCISES。
 * ========================================================= */

// 常量：间隔重复的间隔（step 0-5）
const INTERVAL = [3, 6, 12, 25, 50, 100];
const MAX_STEP = 6;

// 不同题型的错误严重度
const ERROR_SEVERITY = {
    listen: 1,
    rhythm: 2,
    image: 1,
    audio: 1
};

// 同一题在本课内最多重考次数
const MAX_RETRY = 3;

// 存档 key
const STORAGE_KEY = "poem_app_state";

// 题型 → 难度顺序（排序用）
const TYPE_ORDER = { listen: 0, rhythm: 1, image: 2, audio: 3 };

// 运行时填充
let DATA = null;        // 整个 JSON
let POEM = null;        // 当前诗
let SECTION = null;     // 当前阶段
let EXERCISES = [];     // 当前阶段题库
let ALL_KNOWLEDGE = []; // ["S2","S3","S4","S5"]

/**
 * 从 data/poems.json 加载数据，填充全局变量
 * @returns {Promise<void>}
 */
async function loadData() {
    const res = await fetch("data/poems.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    DATA = await res.json();

    POEM = DATA.poems[0];
    SECTION = POEM.sections[0];
    EXERCISES = SECTION.exercises;

    // 从题库里推导知识点列表（S2..S5），去重并排序
    const kSet = new Set(EXERCISES.map(e => e.knowledge));
    ALL_KNOWLEDGE = Array.from(kSet).sort();
}