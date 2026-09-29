type MessageRowInput = {
  userId: string;
  conversationId: string;
  question: string;
  answer: string;
  sourceChunkIds: string[];
  timestamp: number;
};

export function buildMessageRows(input: MessageRowInput) {
  const common = {
    user_id: input.userId,
    conversation_id: input.conversationId,
  };

  return [
    {
      ...common,
      role: 'user',
      content: input.question,
      source_chunk_ids: [],
      created_at: new Date(input.timestamp).toISOString(),
    },
    {
      ...common,
      role: 'assistant',
      content: input.answer,
      source_chunk_ids: input.sourceChunkIds,
      created_at: new Date(input.timestamp + 1).toISOString(),
    },
  ];
}
