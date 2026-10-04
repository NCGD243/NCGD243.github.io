export const POEM = {
  id: "gsz",
  title: "龟虽寿",
  author: ["东汉", "曹操"],
  couplets: [
    ["神龟虽寿", "犹有竟时"],
    ["螣蛇乘雾", "终为土灰"],
    ["老骥伏枥", "志在千里"],
    ["烈士暮年", "壮心不已"],
    ["盈缩之期", "不但在天"],
    ["养怡之福", "可得永年"],
    ["幸甚至哉", "歌以咏志"]
  ]
};

export const POEM_LINES = POEM.couplets.flat();
export const KNOWLEDGE_IDS = POEM_LINES.map((_, index) => `S${index + 1}`);
