import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export const getSlackToken = async () => {
  const client = new SecretManagerServiceClient();
  const [secret] = await client.accessSecretVersion({
    name: 'projects/588063171007/secrets/SLACK_BOT_TOKEN/versions/latest',
  });
  return secret.payload.data.toString();
};
