import { MessageType } from '../enums';

export interface FileContent {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface AudioContent {
  url: string;
  duration: number;
  mimeType: string;
}

export interface ImageContent {
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface EventContent {
  eventId: string;
  eventType: string;
  title: string;
}

export type MessageContent =
  string | FileContent | AudioContent | ImageContent | EventContent;

export class Message {
  constructor(
    public id: string,
    public chatId: string,
    public senderId: string,
    public content: string,
    public type: MessageType = MessageType.TEXT,
    public contentType: MessageContent | null = null,
    public isRead: boolean = false,
    public createdAt: Date = new Date(),
  ) {}
}
