import { kanjiList } from "./kanjiList";
import { GoogleGenAI } from "@google/genai";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const pollyClient = new PollyClient({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const googleGenAi = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export async function generateSentences() {
  const randomKanji = selectRandomKanji();

  const response = await googleGenAi.models.generateContentStream({
    model: "gemini-2.5-pro",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${randomKanji.kanji}를 ${
              randomKanji.readingType === "on" ? "음" : "훈"
            }독으로 ${
              randomKanji.pronounce
            }라고 읽었을 때의 일본어 예문을 만들려고 한다.
  예문은 2명의 화자가 A,B,A,B로 대화하는 총 4줄의 대사이다.
  화자가 누구인지 구분하지 않고 줄 개행으로만 구분한다.
  
  # 요미가나 작성법
  한자 단어는 <ruby>태그로 시작하여,한자 뒤에 <rt> 태그로 요미가나를 적어준다.
  예시: <ruby>読<rt>よみ</rt></ruby><ruby>仮名<rt>がな</rt></ruby>
  한자가 아닌 경우 ruby 태그나 rt태그, 요미가나를 적지 않는다.
  
  # 번역 작성
  일본어 예문 바로 다음줄부터 한글로 번역을 작성한다.
  그래서 총 일본어 대사 4줄, 한글 번역 4줄로 8줄의 텍스트가 출력되어야한다.
  
  # 주의사항
  중간에 빈 줄을 두지 않는다.
  문장 앞뒤에 「」나 " 등을 사용하지 않는다.
  대사 외에는 다른 텍스트는 절대 출력하지 않는다.
  
  # 예시
  \`\`\`
  この<ruby>箱<rt>はこ</rt></ruby>の<ruby>中<rt>なか</rt></ruby>には、いくつ<ruby>入<rt>はい</rt></ruby>ってるだろう？
  ええと、<ruby>一<rt>ひと</rt></ruby>つ、<ruby>二<rt>ふた</rt></ruby>つ…あ、<ruby>六<rt>むっ</rt></ruby>つだね。
  <ruby>六<rt>むっ</rt></ruby>つか、ちょうどいい<ruby>数<rt>かず</rt></ruby>だね。
  うん、<ruby>三人<rt>さんにん</rt></ruby>で<ruby>二<rt>ふた</rt></ruby>つずつ<ruby>分<rt>わ</rt></ruby>けられる。
  이 상자 안에는 몇 개가 들어있을까?
  어디 보자, 하나, 둘… 아, 여섯 개네.
  여섯 개인가, 딱 좋은 숫자네.
  응, 세 명이서 두 개씩 나눌 수 있겠다.
  \`\`\`
  `,
          },
        ],
      },
    ],
  });

  let output = "";
  for await (const chunk of response) {
    const { text } = chunk;
    if (!text) {
      continue;
    }
    output += text;
  }
  const lines = output.split("\n").filter((line) => line.trim());

  const outputs = [];

  for (let i = 0; i < 4; i += 1) {
    const translation = lines[i + 4];
    const japaneseHtml = lines[i];
    const ssml = `<speak>${convertRubyToPhoneme(japaneseHtml)}</speak>`;

    const response = await pollyClient.send(
      new SynthesizeSpeechCommand({
        OutputFormat: "ogg_opus",
        Text: ssml,
        LanguageCode: "ja-JP",
        Engine: "neural",
        TextType: "ssml",
        VoiceId: i % 2 ? "Tomoko" : "Takumi",
      })
    );
    const audioByteArray = await response.AudioStream!.transformToByteArray();
    const blob = new Blob([audioByteArray], {
      type: "audio/ogg; codecs=opus",
    });
    const audioUrl = URL.createObjectURL(blob);
    outputs.push({
      translation,
      chunks: chunksAiGeneratedText(japaneseHtml),
      audioUrl,
    });
  }

  return outputs;
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

function convertRubyToPhoneme(inputText: string) {
  // <ruby>베이스텍스트<rt>루비텍스트</rt></ruby> 패턴을 찾습니다.
  // (.*?)는 캡처 그룹을 의미합니다.
  // 첫 번째 (.*?): 베이스 텍스트 (예: 箱)
  // 두 번째 (.*?): 루비 텍스트 (예: はこ)
  const regex = /<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g;

  // 찾은 패턴을 <phoneme> 형식으로 바꿉니다.
  // $1은 첫 번째 캡처 그룹(베이스 텍스트)을,
  // $2는 두 번째 캡처 그룹(루비 텍스트)을 가리킵니다.
  const replacement = '<phoneme type="ruby" ph="$2">$1</phoneme>';

  // 문자열의 모든 ruby 태그에 대해 변환을 실행합니다.
  const outputText = inputText.replace(regex, replacement);

  return outputText;
}

type TextChunk = {
  text: string;
  ruby: string | undefined;
};

function chunksAiGeneratedText(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const regex = /<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // 루비 태그 이전의 일반 텍스트 추가
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      if (plainText) {
        chunks.push({ text: plainText, ruby: undefined });
      }
    }

    // 루비 태그 부분 추가
    chunks.push({ text: match[1], ruby: match[2] });
    lastIndex = regex.lastIndex;
  }

  // 마지막 루비 태그 이후의 일반 텍스트 추가
  if (lastIndex < text.length) {
    const plainText = text.slice(lastIndex);
    if (plainText) {
      chunks.push({ text: plainText, ruby: undefined });
    }
  }

  return chunks;
}
