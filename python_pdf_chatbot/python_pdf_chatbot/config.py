import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

EMBEDDING_MODEL = "gemini-embedding-001"

# Your Pinecone index dimension
EMBEDDING_DIMENSION = 3072

CHAT_MODEL = "gemini-2.5-flash"