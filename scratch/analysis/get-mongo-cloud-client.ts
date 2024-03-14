import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { MongoClient } from 'mongodb';

export async function getMongoCloudClient() {
  const secretsClient = new SecretManagerServiceClient();
  const secretName =
    'projects/588063171007/secrets/MONGODB_URI/versions/latest';

  const [version] = await secretsClient.accessSecretVersion({
    name: secretName,
  });
  const payload = version.payload.data.toString();
  if (!payload) {
    throw Error('Failed to load environment data.');
  }
  return new MongoClient(payload);
}
