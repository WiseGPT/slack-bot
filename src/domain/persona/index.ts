import { Persona } from "./base-persona/base-persona.dto";
import { slackSoftwareEngPersona } from "./slack-software-eng/slack-software-eng.persona";

const personas = [slackSoftwareEngPersona];

export function getPersonaByConfigName(name: string): Persona {
  const persona = personas.find((persona) => persona.name === name);

  if (!persona) {
    throw new Error(`unknown persona: '${name}'`);
  }

  return persona;
}
