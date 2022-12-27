export type ThreadId = string;

export type SlackConversationView = {
  threadId: ThreadId;
  status: "CREATED" | "COMPLETED";
  createdAt: Date;
};
