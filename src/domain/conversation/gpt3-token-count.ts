import GPT3Tokenizer from "gpt3-tokenizer";

const tokenizer = new GPT3Tokenizer({ type: "gpt3" });

export const gpt3TokenCount = (input: string): number => {
  try {
    return tokenizer.encode(input).bpe.length;
  } catch {
    const wordCount = (input || "").split(" ").length;

    return Math.floor(wordCount * 1.2);
  }
};
