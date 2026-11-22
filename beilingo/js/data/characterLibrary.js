const libraryUrl = new URL("./common_characters.txt", import.meta.url);
let characterLibrary;

export async function getCharacterSea(answer) {
  if (!characterLibrary) {
    characterLibrary = fetch(libraryUrl).then(response => {
      if (!response.ok) throw new Error(`Unable to load character library: ${response.status}`);
      return response.text();
    }).then(text => {
      const characters = [...new Set(Array.from(text.trim()).filter(character => /\p{Script=Han}/u.test(character)))];
      if (characters.length === 0) throw new Error("Character library is empty");
      return characters;
    });
  }

  const characters = await characterLibrary;
  const answerCharacters = Array.from(answer);
  const requiredCharacters = [...new Set(answerCharacters)];
  const distractors = shuffle(characters.filter(character => !requiredCharacters.includes(character)));
  const seaSize = Math.max(20, 2 * answerCharacters.length);
  const sea = [...answerCharacters, ...distractors.slice(0, seaSize - answerCharacters.length)];
  return sea.sort((first, second) => pinyinCollator.compare(first, second));
}

const pinyinCollator = new Intl.Collator("zh-CN-u-co-pinyin");

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}
