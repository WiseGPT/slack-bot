import {
  AIPersona,
  ModelConfiguration,
} from "@wisegpt/gpt-conversation-prompt";

export type Persona = AIPersona & {
  configName: string;
  modelConfiguration: ModelConfiguration;
};
