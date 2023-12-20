import {Injectable} from "@nestjs/common";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

@Injectable()
export class SecretsManagerService {
  getManager() {
    return new SecretManagerServiceClient();
  }
}