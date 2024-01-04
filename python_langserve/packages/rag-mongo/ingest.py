from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import MongoDBAtlasVectorSearch
from pymongo import MongoClient

from python_langserve.secrets.secrets_manager import SecretsManagerService

sms = SecretsManagerService()
MONGO_URI = sms.get_secret('MONGO_URI')
MONGO_DATABASE_NAME = sms.get_secret('MONGO_DATABASE_NAME')
MONGO_COLLECTION_NAME = sms.get_secret('MONGO_COLLECTION_NAME')
ATLAS_VECTOR_SEARCH_INDEX_NAME = sms.get_secret('ATLAS_VECTOR_SEARCH_INDEX_NAME')
MONGO_EMBEDDING_FIELD_NAME = sms.get_secret('MONGO_EMBEDDING_FIELD_NAME')

client = MongoClient(MONGO_URI)
db = client[MONGO_DATABASE_NAME]
MONGODB_COLLECTION = db[MONGO_COLLECTION_NAME]

if __name__ == "__main__":
    print("Starting the document ingestion process...")

    # Load docs
    print("Loading documents from the PDF...")
    loader = PyPDFLoader("https://arxiv.org/pdf/2303.08774.pdf")
    data = loader.load()
    print("Documents loaded successfully.")

    # Split docs
    print("Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=0)
    docs = text_splitter.split_documents(data)
    print(f"Split into {len(docs)} chunks.")

    # Insert the documents in MongoDB Atlas Vector Search
    print("Inserting documents into MongoDB Atlas Vector Search...")
    _ = MongoDBAtlasVectorSearch.from_documents(
        documents=docs,
        embedding=OpenAIEmbeddings(disallowed_special=(),
                                   openai_api_key=sms.get_secret("OPENAI_API_KEY")
                                   ),
        collection=MONGODB_COLLECTION,
        index_name=ATLAS_VECTOR_SEARCH_INDEX_NAME,
    )
    print("Documents ingested successfully.")

    print("Done!")
