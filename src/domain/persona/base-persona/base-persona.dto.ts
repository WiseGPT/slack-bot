import { CreateCompletionRequest } from "openai";

export const SEPARATOR_TOKEN = "<|endofstatement|>";

export type Persona = {
  name: string;
  basePrompt: string;
  baseCompletionRequest: CreateCompletionRequest;
};
