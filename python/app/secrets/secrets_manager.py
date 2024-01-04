from google.cloud import secretmanager

GCLOUD_SECRETS_PROJECT_ID = 588063171007


class SecretsManagerService:
    def __init__(self):
        self.manager = secretmanager.SecretManagerServiceClient()

    def get_secret(self, secret_id: str, version_id="latest"):
        # Build the resource name of the secret
        name = f"projects/{GCLOUD_SECRETS_PROJECT_ID}/secrets/{secret_id}/versions/{version_id}"

        # Access the secret
        response = self.manager.access_secret_version(name=name)

        # Return the decoded payload
        return response.payload.data.decode('UTF-8')

# Usage
# secrets_manager_service = SecretsManagerService()
#
# openai_api_key = secrets_manager_service
# print(openai_api_key)
