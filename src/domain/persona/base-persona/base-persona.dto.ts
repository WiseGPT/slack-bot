import {
  AIPersona,
  ModelConfiguration,
} from "@wisegpt/gpt-conversation-prompt";

export type Persona = AIPersona & {
  configName: string;
  chatModelConfiguration: ModelConfiguration;
  summaryModelConfiguration: ModelConfiguration;
};
