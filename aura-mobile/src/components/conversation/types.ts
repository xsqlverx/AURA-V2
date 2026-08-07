export type MessageType = 'user' | 'text' | 'tool' | 'memory' | 'code' | 'error' | 'progress';

export type ToolStatus = 'running' | 'completed' | 'failed';

export type ToolInfo = {
  name: string;
  status: ToolStatus;
  detail?: string;
};

export type MemoryInfo = {
  action: 'recalled' | 'saved' | 'updated' | 'corrected';
  text: string;
};

export type ProgressStage = {
  label: string;
  status: 'pending' | 'active' | 'completed';
};

export type BaseMessage = {
  id: string;
  timestamp: number;
};

export type UserMessage = BaseMessage & {
  type: 'user';
  content: string;
};

export type TextMessage = BaseMessage & {
  type: 'text';
  content: string;
  isStreaming?: boolean;
};

export type ToolMessage = BaseMessage & {
  type: 'tool';
  tool: ToolInfo;
};

export type MemoryMessage = BaseMessage & {
  type: 'memory';
  memory: MemoryInfo;
};

export type CodeMessage = BaseMessage & {
  type: 'code';
  language: string;
  code: string;
};

export type ErrorMessage = BaseMessage & {
  type: 'error';
  content: string;
};

export type ProgressMessage = BaseMessage & {
  type: 'progress';
  stages: ProgressStage[];
};

export type Message = UserMessage | TextMessage | ToolMessage | MemoryMessage | CodeMessage | ErrorMessage | ProgressMessage;

export type ConversationPhase =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'searching_desktop'
  | 'searching_memory'
  | 'executing_tool'
  | 'generating'
  | 'streaming'
  | 'speaking'
  | 'error';

export type ConversationState = {
  messages: Message[];
  phase: ConversationPhase;
  streamingId: string | null;
  isRecording: boolean;
  inputText: string;
};
