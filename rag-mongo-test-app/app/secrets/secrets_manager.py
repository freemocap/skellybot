from google.cloud import secretmanager

class SecretsManagerService:
    def __init__(self):
        self.manager = secretmanager.SecretManagerServiceClient()

    def get_secret(self, project_id, secret_id, version_id="latest"):
        # Build the resource name of the secret
        name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"

        # Access the secret
        response = self.manager.access_secret_version(name=name)

        # Return the decoded payload
        return response.payload.data.decode('UTF-8')

# Usage
# secrets_manager_service = SecretsManagerService()
#
# openai_api_key = secrets_manager_service.get_secret(588063171007, 'OPENAI_API_KEY')
# print(openai_api_key)
