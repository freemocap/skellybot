interface FlattenedUserIdentifiers {
  discordId?: string;
  discordUsername?: string;
  slackId?: string;
  slackUsername?: string;
  platforms: string[];
}

/**
 * Flattens nested user identifiers into individual fields for easier database querying
 * @param identifiers The nested identifiers object (can be from DTO or schema)
 * @returns Object with flattened fields
 */
export function flattenUserIdentifiers(
  identifiers: any,
): FlattenedUserIdentifiers {
  const flattened: FlattenedUserIdentifiers = {
    platforms: [],
  };

  // Extract Discord identifiers
  if (identifiers?.discord) {
    if (identifiers.discord.userId || identifiers.discord.id) {
      flattened.discordId =
        identifiers.discord.userId || identifiers.discord.id;
      flattened.platforms.push('discord');
    }
    if (identifiers.discord.userName || identifiers.discord.username) {
      flattened.discordUsername =
        identifiers.discord.userName || identifiers.discord.username;
    }
  }

  // Extract Slack identifiers
  if (identifiers?.slack) {
    if (identifiers.slack.userId || identifiers.slack.id) {
      flattened.slackId = identifiers.slack.userId || identifiers.slack.id;
      flattened.platforms.push('slack');
    }
    if (identifiers.slack.userName || identifiers.slack.username) {
      flattened.slackUsername =
        identifiers.slack.userName || identifiers.slack.username;
    }
  }

  return flattened;
}
