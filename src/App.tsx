import { useState } from "react";
import { Button } from "./components/ui/button";
import { kanjiList } from "./kanjiList";
import { GoogleGenAI } from "@google/genai";

export function App() {
  const [prompt, setPrompt] = useState("");
  const [sentences, setSentences] = useState<string[]>([]);
  const generatePrompt = () => {
    const randomKanji = selectRandomKanji();

    setPrompt(`${randomKanji.kanji}를 ${
      randomKanji.readingType === "on" ? "음" : "훈"
    }독으로 ${
      randomKanji.pronounce
    }라고 읽었을 때의 일본어 예문을 만들려고 한다.
예문은 2명의 화자가 A,B,A,B로 대화하는 총 4줄의 대사이다.
화자가 누구인지 구분하지 않고 줄 개행으로만 구분한다.

# 요미가나 작성법
한자 뒤에 <rt> 태그로 요미가나를 적어준다.
예시: 読<rt>よみ</rt>仮名<rt>がな</rt>
한자가 아닌 경우 요미가나를 적지 않는다.

# 번역 작성
일본어 예문 바로 다음줄부터 한글로 번역을 작성한다.
그래서 총 일본어 대사 4줄, 한글 번역 4줄로 8줄의 텍스트가 출력되어야한다.

# 주의사항
중간에 빈 줄을 두지 않는다.
문장 앞뒤에 「」나 " 등을 사용하지 않는다.
대사 외에는 다른 텍스트는 절대 출력하지 않는다.`);
  };

  const generateSentences = async () => {
    if (!prompt) {
      return alert("프롬프트를 먼저 생성해주세요.");
    }
    setSentences([]);
    const ai = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    });
    const model = "gemini-2.5-pro";
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    console.log("before");
    const response = await ai.models.generateContentStream({
      model,
      contents,
    });
    let output = "";
    for await (const chunk of response) {
      console.log("processing...", chunk);
      const { text } = chunk;
      if (!text) {
        continue;
      }
      console.log("text", text);
      output += text;
    }
    const lines = output.split("\n").filter((line) => line.trim());
    setSentences((prev) => [...prev, ...lines]);
    console.log("end");
  };
  return (
    <div>
      <Button onClick={generatePrompt}>프롬프트 생성하기</Button>
      <p>{prompt}</p>
      <Button onClick={generateSentences}>문장 생성하기</Button>
      <div>
        {sentences.map((sentence, index) => (
          <p key={index}>
            <ruby dangerouslySetInnerHTML={{ __html: sentence }} />
          </p>
        ))}
      </div>
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
