import { POEM, POEM_LINES, KNOWLEDGE_IDS } from "./poem.js";

const meanings = [
  ["神龟", "传说中寿命很长的灵龟", ["传说中寿命很长的灵龟", "神奇的乌龟雕像", "能乘雾飞行的龟", "古代的一种乐器"]],
  ["竟时", "终结的时候", ["开始的时刻", "终结的时候", "最好的时节", "竞争的时期"]],
  ["螣蛇", "传说中能乘雾飞行的蛇", ["一种水生动物", "传说中能乘雾飞行的蛇", "盘绕的树根", "古代的兵器"]],
  ["土灰", "泥土和灰尘，比喻消亡", ["泥土和灰尘，比喻消亡", "肥沃的土壤", "烧制的陶土", "尘土飞扬"]],
  ["老骥", "年老的千里马", ["年幼的小马", "年老的千里马", "奔驰的骏马", "退役的战马"]],
  ["志", "心愿、志向", ["心愿、志向", "记载文字", "做事的标记", "记忆力"]],
  ["烈士", "有雄心壮志的人", ["为国牺牲的人", "有雄心壮志的人", "勇敢的士兵", "古代的官员"]],
  ["不已", "不停止", ["已经结束", "不停止", "不能完成", "不曾开始"]],
  ["盈缩", "寿命的长短", ["月亮的圆缺", "寿命的长短", "粮食的多少", "进退的快慢"]],
  ["不但", "不只是、不仅", ["不只是、不仅", "但是", "不应该", "不可能"]],
  ["养怡", "调养身心，使之和乐", ["休养生息", "调养身心，使之和乐", "种植庄稼", "供养家人"]],
  ["永年", "长寿", ["永远的年份", "长寿", "美好的年景", "年轻的时候"]],
  ["幸甚至哉", "非常庆幸", ["非常庆幸", "幸运降临", "人生艰难", "高兴歌唱"]],
  ["咏志", "歌咏心志", ["歌咏心志", "吟诵诗句", "表达思乡", "赞美自然"]]
];

const pronunciations = [
  ["shén", "神", ["神", "伸", "身", "深"]],
  ["jìng", "竟", ["竟", "境", "镜", "静"]],
  ["téng", "螣", ["螣", "腾", "藤", "疼"]],
  ["huī", "灰", ["灰", "恢", "挥", "辉"]],
  ["jì", "骥", ["骥", "冀", "翼", "记"]],
  ["lǐ", "里", ["里", "李", "理", "礼"]],
  ["liè", "烈", ["烈", "列", "裂", "猎"]],
  ["yǐ", "已", ["已", "以", "己", "巳"]],
  ["yíng", "盈", ["盈", "营", "迎", "赢"]],
  ["dàn", "但", ["但", "担", "旦", "胆"]],
  ["yí", "怡", ["怡", "以", "移", "宜"]],
  ["yǒng", "永", ["永", "泳", "勇", "咏"]],
  ["shèn", "甚", ["甚", "深", "申", "身"]],
  ["yǒng", "咏", ["咏", "泳", "永", "勇"]]
];

const SECTION_NAMES = [
  ["s1", "感知"], ["s2", "理解"], ["s3", "字形"], ["s4", "默写"]
];

export const SECTION1_EXERCISES = POEM_LINES.map((line, index) => ({
  id: `s1-e${index + 1}`,
  type: "listen",
  knowledge: KNOWLEDGE_IDS[index],
  line
}));

export const SECTION1_SEQUENCE_EXERCISES = [{
  id: "s1-follow-poem",
  type: "listenSequence",
  knowledge: KNOWLEDGE_IDS[0],
  lines: POEM_LINES
}];

export const SECTION2_EXERCISES = POEM_LINES.map((line, index) => {
  const [word, meaning, options] = meanings[index];
  return {
    id: `s2-e${index + 1}`,
    type: "meaning",
    knowledge: KNOWLEDGE_IDS[index],
    word,
    line,
    options,
    answer: options.indexOf(meaning)
  };
});

export const SECTION4_ORDER_EXERCISES = [{
  id: "s4-order-poem",
  type: "order",
  knowledge: KNOWLEDGE_IDS[0],
  prompt: "将《龟虽寿》的诗句按正确顺序排列",
  lines: POEM_LINES
}];

export const SECTION3_EXERCISES = POEM_LINES.map((line, index) => {
  const [pinyin, target, options] = pronunciations[index];
  const targetIndex = line.indexOf(target);
  const hint = targetIndex < 0
    ? `${line}（找出“${target}”）`
    : `${line.slice(0, targetIndex)}__${line.slice(targetIndex + target.length)}`;
  return {
    id: `s3-e${index + 1}`,
    type: "pinyin",
    knowledge: KNOWLEDGE_IDS[index],
    pinyin,
    hint,
    options,
    answer: options.indexOf(target)
  };
});

export const SECTION4_EXERCISES = POEM_LINES.map((line, index) => ({
  id: `s4-e${index + 1}`,
  type: "recite",
  knowledge: KNOWLEDGE_IDS[index],
  prompt: index === 0 ? "请默写第一句" : `接着默写：${POEM_LINES[index - 1]}，______`,
  answer: line
}));

export const SECTION_EXERCISES = {
  s1: [...SECTION1_EXERCISES, ...SECTION1_SEQUENCE_EXERCISES],
  s2: SECTION2_EXERCISES,
  s3: SECTION3_EXERCISES,
  s4: [...SECTION4_EXERCISES, ...SECTION4_ORDER_EXERCISES]
};

export const SECTIONS = SECTION_NAMES.map(([id, name]) => ({ id, name }));
