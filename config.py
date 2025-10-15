import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-123'
    UPLOAD_FOLDER = 'uploads'
    DOCUMENTS_FOLDER = 'documents'
    VECTOR_STORE_PATH = 'vector_store/faiss_index'
    ALLOWED_EXTENSIONS = {'txt', 'pdf'}
    
    # Google Gemini Configuration
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    
    # RAG Configuration
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200
    SIMILARITY_TOP_K = 3

# Make sure upload directories exist
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(Config.DOCUMENTS_FOLDER, exist_ok=True)
os.makedirs('vector_store', exist_ok=True)