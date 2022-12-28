import { KnownBlock } from "@slack/web-api";

export enum SlackEventType {
  MESSAGE = "message",
}

export type SlackEventEnvelope<T extends SlackEventType, TEventPayload> = {
  type: "event_callback";
  event_id: string;
  api_app_id: string;
  team_id: string;
  event_time: number;
  event: TEventPayload & { type: T };
  authorizations: { is_bot?: boolean; user_id?: string }[];
};

export type SlackMessageEventWithEnvelope = SlackEventEnvelope<
  SlackEventType.MESSAGE,
  {
    user: string;
    text: string;
    team: string;
    channel: string;
    ts: string;
    app_id?: string;
    thread_ts?: string;
    blocks?: KnownBlock[];
    // specific to message event
    subtype?: string;
  }
>;

export type ThreadId = string;

export type SlackConversationView = {
  conversationId: string;
  threadId: ThreadId;
  channel: string;
  status: "CREATED" | "COMPLETED";
  // correlation id to message details mapping
  botMessages: Record<string, { ts: string; createdAt: Date }>;
  createdAt: Date;
};
