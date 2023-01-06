import { Message } from "@wisegpt/gpt-conversation-prompt";

export type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export type ConversationStatus =
  | { status: "ONGOING" }
  | { status: "ENDED" }
  | { status: "ERROR"; message: string };

export type ConversationAIStatus = {
  completion:
    | {
        status: "IDLE";
      }
    | { status: "PROCESSING"; correlationId: string };
  summary:
    | { status: "IDLE" }
    | { status: "PROCESSING"; correlationId: string; lastMessageId: string };
};

export type ConversationMessage = Message & {
  id: string;
};
