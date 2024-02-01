export interface CategoryConfig {
  name: string;
  viewableBy: [string] | 'default';
  editableBy: [string] | 'default';
}

export interface RoleConfig {
  name: string;
  syncPermissionsWithRole: string | '@everyone';
}

interface NicknameConfig {
  nicknameIdMap: Record<string, string>;
}

interface ChannelConfig {
  name: string;
  type: 'text' | 'forum';
  viewableBy: [string] | 'default';
  editableBy: [string] | 'default';
  parentCategory: string | null;
}

interface MessageConfig {
  name: string;
  content: string;
  channelName: string;
  reactions: [string];
}

export interface ServerConfig {
  categories: [CategoryConfig];
  roles: [RoleConfig];
  nicknames: [NicknameConfig];
  channels: [ChannelConfig];
  messages: [MessageConfig];
}
