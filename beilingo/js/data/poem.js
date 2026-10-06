import poemData from "./poem.json" with { type: "json" };

export const POEM = poemData;
export const POEM_LINES = POEM.couplets.flat();
export const KNOWLEDGE_IDS = POEM_LINES.map((_, index) => `S${index + 1}`);
