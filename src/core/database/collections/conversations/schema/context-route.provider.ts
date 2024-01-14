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

    // if (!this.validateIdentifiers()) {
    //   throw new Error('Invalid parent-child relationship in route');
    // }
  }

  // private validateIdentifiers(): boolean {
  //   for (let index = 1; index < this.identifiers.length; index++) {
  //     const currentIdentifier = this.identifiers[index];
  //     const previousIdentifier = this.identifiers[index - 1];
  //
  //     if (
  //       !currentIdentifier.parentIdentifier ||
  //       currentIdentifier.parentIdentifier.id !== previousIdentifier.id
  //     ) {
  //       return false;
  //     }
  //   }
  //   return true;
  // }
}

@Injectable({ scope: Scope.REQUEST })
export class DiscordContextRouteFactory {
  static create(
    isDirectMessage: boolean,
    channel: ContextIdentifier,
    server?: ContextIdentifier,
    category?: ContextIdentifier,
    thread?: ContextIdentifier,
  ): ContextRoute {
    const identifiers: ContextIdentifier[] = [
      server,
      category,
      channel,
      thread,
    ].filter(Boolean) as ContextIdentifier[];
    const sourceInterface = 'discord';
    return new ContextRoute(sourceInterface, identifiers, isDirectMessage);
  }
}
