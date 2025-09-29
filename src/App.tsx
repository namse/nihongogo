import { useState } from "react";
import { Button } from "./components/ui/button";
import { kanjiList } from "./kanjiList";

export function App() {
  const [prompt, setPrompt] = useState("");
  const generatePrompt = () => {
    const randomKanji = selectRandomKanji();

    setPrompt(`${randomKanji.kanji}를 ${
      randomKanji.readingType === "on" ? "음" : "훈"
    }독으로 ${
      randomKanji.pronounce
    }라고 읽었을 때의 일본어 예문을 만들려고 한다.
예문은 2명의 화자가 A,B,A,B로 대화하는 총 4줄의 대사이다.
모든 한자의 요미가나는 読<rt>よみ</rt>仮名<rt>がな</rt>와 같은 식으로 표시해야한다.
화자가 누구인지 구분하지 않고 줄 개행으로만 구분한다.
일본어 예문 바로 다음줄부터 한글로 번역을 작성한다.
그래서 총 일본어 대사 4줄, 한글 번역 4줄로 8줄의 텍스트가 출력되어야한다.
중간에 빈 줄을 두지 않는다.
문장 앞뒤에 「」나 " 등을 사용하지 않는다.
대사 외에는 다른 텍스트는 절대 출력하지 않는다.`);
  };
  return (
    <div>
      <Button onClick={generatePrompt}>프롬프트 생성하기</Button>
      <p>{prompt}</p>
    </div>
  );
}

const candidates: {
  kanji: string;
  readingType: "on" | "kun";
  pronounce: string;
}[] = [];

for (const [kanji, onList, kunList] of kanjiList) {
  for (const on of onList) {
    candidates.push({ kanji, readingType: "on", pronounce: on });
  }
  for (const kun of kunList) {
    candidates.push({ kanji, readingType: "kun", pronounce: kun });
  }
}
function selectRandomKanji() {
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}
