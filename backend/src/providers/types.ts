export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  mediaType: string; // ex: image/png
  data: string; // base64 puro, sem o prefixo data:
}

export type ContentBlock = TextBlock | ImageBlock;

export interface ChatMessageInput {
  role: string;
  content: string | ContentBlock[];
}

export interface ProviderCallOptions {
  apiKey: string;
  baseUrl?: string | null;
  modelName: string;
  messages: ChatMessageInput[];
  onToken: (token: string) => void;
}

export type ProviderStreamFn = (opts: ProviderCallOptions) => Promise<string>;
