import { ContextRoute } from './context-route.provider';

interface FlattenedContextRoute {
  sourceInterface: string;
  serverId?: string;
  serverName?: string;
  categoryId?: string;
  categoryName?: string;
  channelId?: string;
  channelName?: string;
  threadId?: string;
  threadName?: string;
  isDirectMessage: boolean;
}

/**
 * Flattens a ContextRoute object into individual fields for easier database querying
 * @param contextRoute The nested ContextRoute object
 * @returns Object with flattened fields
 */
export function flattenContextRoute(
  contextRoute: ContextRoute,
): FlattenedContextRoute {
  const flattened: FlattenedContextRoute = {
    sourceInterface: contextRoute.sourceInterface,
    isDirectMessage: contextRoute.isDirectMessage,
  };

  // Iterate through identifiers and extract each level
  for (const identifier of contextRoute.identifiers) {
    switch (identifier.type) {
      case 'server':
        flattened.serverId = identifier.contextId;
        flattened.serverName = identifier.contextName;
        break;
      case 'category':
        flattened.categoryId = identifier.contextId;
        flattened.categoryName = identifier.contextName;
        break;
      case 'channel':
        flattened.channelId = identifier.contextId;
        flattened.channelName = identifier.contextName;
        break;
      case 'thread':
        flattened.threadId = identifier.contextId;
        flattened.threadName = identifier.contextName;
        break;
      case 'direct-message':
        // For DMs, store in channelId since that's typically what you'd query
        flattened.channelId = identifier.contextId;
        flattened.channelName = identifier.contextName;
        break;
    }
  }

  return flattened;
}
