import exerciseData from "./exercise.json" with { type: "json" };

const sectionData = exerciseData.sections;

export const SECTIONS = Object.entries(sectionData).map(([id, section]) => ({
  id,
  name: section.name,
  lessons: section.lessons
}));

export const SECTION_LESSONS = Object.fromEntries(
  SECTIONS.map(section => [section.id, section.lessons])
);

export const SECTION_EXERCISES = Object.fromEntries(
  SECTIONS.map(section => [
    section.id,
    section.lessons.flatMap((lesson, lessonIndex) => lesson.questions.map(question => ({
      ...question,
      sectionId: section.id,
      lessonId: lesson.id,
      lessonIndex,
      shuffle: lesson.shuffle,
      pinyin: question.pinyinInfo?.pinyin,
      showPinyin: question.pinyinInfo?.show === true,
      content: question.otherInfo?.content,
      line: question.otherInfo?.line,
      lines: question.otherInfo?.lines,
      options: question.otherInfo?.options,
      answer: question.otherInfo?.answer
    })))
  ])
);
