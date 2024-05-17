export type Attachment = {
  name: string;
  url: string;
};

export type Message = {
  speakerName: string;
  speakerId: string;
  content: string;
  timestamp: number;
  jumpUrl: string;
  attachments: Attachment[];
};

export type Thread = {
  name: string;
  couplets: Couplet[];
};

export type AttachmentRecord = {
  name: string;
  url: string;
};

export type MessageRecord = {
  speakerName: string;
  speakerId: string;
  content: string;
  timestamp: string;
  jumpUrl: string;
  attachments: AttachmentRecord[];
};

export type Couplet = {
  humanMessage: MessageRecord;
  aiResponse: MessageRecord[];
};

export type ChannelData = {
  name: string;
  threads: Thread[];
};

export type Channel = {
  name: string;
  data: ChannelData;
};

export type Category = {
  name: string;
  channels: Channel[];
};

export type Server = {
  serverName: string;
  categories: Category[];
};
