import { useState } from "react";
import { Button } from "./components/ui/button";
import { generateSentences } from "./generateSentences";

export function App() {
  const [showRuby, setShowRuby] = useState(true);
  const [generationState, setGenerationState] = useState<
    | {
        type: "idle";
      }
    | {
        type: "generating";
      }
    | {
        type: "error";
        error: unknown;
      }
    | {
        type: "generated";
        output: Awaited<ReturnType<typeof generateSentences>>;
        audioPlaying:
          | undefined
          | {
              type: "full";
            }
          | {
              type: "sentence";
              index: number;
            };
      }
  >({
    type: "idle",
  });

  const startGeneration = async () => {
    if (generationState.type === "generating") {
      return;
    }

    try {
      setGenerationState({
        type: "generating",
      });
      const output = await generateSentences();
      setGenerationState({
        type: "generated",
        output,
        audioPlaying: undefined,
      });
    } catch (error) {
      setGenerationState({
        type: "error",
        error,
      });
    }
  };

  const playFullAudio = () => {
    if (generationState.type !== "generated") {
      return;
    }

    let lastAudio: HTMLAudioElement | undefined;
    for (const output of generationState.output) {
      const audio = new Audio(output.audioUrl);
      if (lastAudio) {
        lastAudio.addEventListener("ended", () => {
          audio.play();
        });
      } else {
        audio.play();
      }
      lastAudio = audio;
    }
  };

  const playSentenceAudio = (index: number) => {
    if (generationState.type !== "generated") {
      return;
    }
    const audio = new Audio(generationState.output[index].audioUrl);
    audio.play();
  };

  return (
    <div>
      <Button onClick={startGeneration}>새 예문 생성하기</Button>
      {generationState.type}

      {generationState.type === "generated" && (
        <div>
          <Button onClick={() => setShowRuby((prev) => !prev)}>
            {showRuby ? "루비 숨기기" : "루비 보이기"}
          </Button>
          <div>
            <Button onClick={playFullAudio}>전체 오디오 재생</Button>
          </div>
          <div>
            {generationState.output.map((output, index) => (
              <div key={index} className="text-xl">
                <p>
                  {output.chunks.map((chunk, chunkIndex) => (
                    <span key={chunkIndex}>
                      {chunk.ruby && showRuby ? (
                        <ruby>
                          {chunk.text}
                          <rt>{chunk.ruby}</rt>
                        </ruby>
                      ) : (
                        chunk.text
                      )}
                    </span>
                  ))}
                </p>
                <p>{output.translation}</p>
                <Button onClick={() => playSentenceAudio(index)}>
                  오디오 재생
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
