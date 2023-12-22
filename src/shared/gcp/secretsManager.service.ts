import { Injectable } from '@nestjs/common';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * Nothing else should go here. this should be GCP stuff only.
 *
 * in the future, we'll have additional options for the secrets manager stuff from GCP.
 */
@Injectable()
export class SecretsManagerService {
  getManager() {
    return new SecretManagerServiceClient();
  }
}
