import { poemDataUrl } from "./poem.js";

export async function loadExercises(poemEntry) {
  const url = poemDataUrl(poemEntry, "exercise.json");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load exercises for "${poemEntry.name}": ${response.status}`);
  }
  const exerciseData = await response.json();
  if (!exerciseData.sections || typeof exerciseData.sections !== "object") {
    throw new TypeError(`Invalid exercise data for "${poemEntry.name}"`);
  }

  const sections = Object.entries(exerciseData.sections).map(([id, section]) => ({
    id,
    name: section.name,
    lessons: section.lessons
  }));
  const sectionLessons = Object.fromEntries(
    sections.map(section => [section.id, section.lessons])
  );
  const sectionExercises = Object.fromEntries(
    sections.map(section => [
      section.id,
      section.lessons.flatMap((lesson, lessonIndex) => lesson.questions.map(question => ({
        ...question,
        highlight: question.highlight ?? question.highlighted,
        sectionId: section.id,
        lessonId: lesson.id,
        lessonIndex,
        shuffle: lesson.shuffle,
        pinyin: question.pinyinInfo?.pinyin,
        showPinyin: question.pinyinInfo?.show === true,
        content: question.otherInfo?.content ?? "【空】",
        line: question.otherInfo?.line,
        lines: question.otherInfo?.lines,
        options: question.otherInfo?.options,
        answer: question.otherInfo?.answer
      })))
    ])
  );

  return { sections, sectionLessons, sectionExercises };
}
