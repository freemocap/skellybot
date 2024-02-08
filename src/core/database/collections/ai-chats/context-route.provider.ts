import { Injectable, Scope } from '@nestjs/common';

export class ContextIdentifier {
  type: 'server' | 'category' | 'channel' | 'thread' | 'direct-message';
  contextId: string;
  contextName: string;
}

export class ContextRoute {
  sourceInterface: 'discord' | 'slack';
  identifiers: ContextIdentifier[];
  isDirectMessage: boolean;

  constructor(
    sourceInterface: 'discord' | 'slack',
    identifiers: ContextIdentifier[],
    isDirectMessage: boolean,
  ) {
    this.sourceInterface = sourceInterface;
    this.identifiers = identifiers;
    this.isDirectMessage = isDirectMessage;
  }
}
