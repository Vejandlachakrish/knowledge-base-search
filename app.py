import os
import uuid
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import PyPDF2
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.schema import Document
import google.generativeai as genai
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize Google Gemini client
gemini_client = None
if Config.GEMINI_API_KEY and Config.GEMINI_API_KEY != 'your_actual_gemini_api_key_here':
    try:
        genai.configure(api_key=Config.GEMINI_API_KEY)
        gemini_client = genai
        print("Google Gemini configured successfully")
        
    except Exception as e:
        print(f"Error configuring Gemini: {e}")
        gemini_client = None
else:
    print("Warning: Google Gemini API key not configured. Search functionality will be limited.")

# Initialize embeddings model with fallback
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    print("HuggingFace embeddings loaded successfully")
except ImportError as e:
    print(f"HuggingFace embeddings failed: {e}")
    # Fallback to a simpler embedding method
    try:
        from langchain.embeddings import FakeEmbeddings
        embeddings = FakeEmbeddings(size=384)
        print("Using fake embeddings as fallback")
    except:
        # Ultimate fallback
        class SimpleEmbeddings:
            def embed_documents(self, texts):
                return [[0.1] * 384 for _ in texts]
            def embed_query(self, text):
                return [0.1] * 384
        embeddings = SimpleEmbeddings()
        print("Using simple embeddings as ultimate fallback")

# Global variable for vector store
vector_store = None

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def extract_text_from_txt(file_path):
    """Extract text from TXT file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error reading TXT file: {e}")
        return ""

def process_documents():
    """Process all documents in the documents folder and create vector store"""
    global vector_store
    
    documents = []
    
    # Process all files in documents folder
    for filename in os.listdir(Config.DOCUMENTS_FOLDER):
        file_path = os.path.join(Config.DOCUMENTS_FOLDER, filename)
        
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        elif filename.endswith('.txt'):
            text = extract_text_from_txt(file_path)
        else:
            continue
            
        if text and text.strip():
            # Create document with metadata
            doc = Document(
                page_content=text,
                metadata={
                    "source": filename,
                    "file_type": filename.split('.')[-1]
                }
            )
            documents.append(doc)
    
    if not documents:
        vector_store = None
        return "No documents found to process."
    
    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=Config.CHUNK_SIZE,
        chunk_overlap=Config.CHUNK_OVERLAP
    )
    
    chunks = text_splitter.split_documents(documents)
    
    # Create vector store
    vector_store = FAISS.from_documents(chunks, embeddings)
    
    # Save vector store
    vector_store.save_local(Config.VECTOR_STORE_PATH)
    
    return f"Processed {len(documents)} documents into {len(chunks)} chunks."

def load_vector_store():
    """Load existing vector store if available"""
    global vector_store
    try:
        if os.path.exists(Config.VECTOR_STORE_PATH):
            # Try without the dangerous deserialization parameter first
            try:
                vector_store = FAISS.load_local(Config.VECTOR_STORE_PATH, embeddings)
            except TypeError:
                # Fallback for older versions
                vector_store = FAISS.load_local(Config.VECTOR_STORE_PATH, embeddings, allow_dangerous_deserialization=True)
            return True
        return False
    except Exception as e:
        print(f"Error loading vector store: {e}")
        return False

def generate_answer_with_gemini(context, query):
    """Generate answer using Google Gemini"""
    try:
        # Use the latest flash model which is fast and free
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""Using the provided documents, answer the user's question succinctly and accurately. 
        If the answer cannot be found in the documents, say so.

        Documents:
        {context}

        Question: {query}

        Answer:"""
        
        response = model.generate_content(prompt)
        return response.text
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback: try gemini-flash-latest
        try:
            model = genai.GenerativeModel('gemini-flash-latest')
            prompt = f"Using these documents: {context}\n\nQuestion: {query}\n\nAnswer:"
            response = model.generate_content(prompt)
            return response.text
        except Exception as e2:
            return f"Error generating answer: {str(e2)}"

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload')
def upload_page():
    return render_template('upload.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """API endpoint to handle file uploads"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        
        # Save directly to documents folder
        final_path = os.path.join(Config.DOCUMENTS_FOLDER, filename)
        file.save(final_path)
        
        # Reprocess all documents
        result = process_documents()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename,
            'processing_result': result
        })
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/search', methods=['POST'])
def search():
    """API endpoint to handle search queries"""
    if not vector_store:
        if not load_vector_store():
            return jsonify({'error': 'No documents available. Please upload documents first.'}), 400
    
    data = request.get_json()
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({'error': 'Empty query'}), 400
    
    try:
        # Search for similar documents
        docs = vector_store.similarity_search(query, k=Config.SIMILARITY_TOP_K)
        
        # Prepare context from retrieved documents
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # If Gemini client is not available, return retrieved documents only
        if not gemini_client:
            answer = "Google Gemini API key not configured. Here are the most relevant document excerpts:"
            sources = [{
                'content': doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                'source': doc.metadata.get('source', 'Unknown')
            } for doc in docs]
            
            return jsonify({
                'answer': answer,
                'sources': sources,
                'query': query,
                'warning': 'Gemini not configured - showing raw results only'
            })
        
        # Generate answer using Google Gemini
        answer = generate_answer_with_gemini(context, query)
        
        # Prepare sources
        sources = [{
            'content': doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
            'source': doc.metadata.get('source', 'Unknown')
        } for doc in docs]
        
        return jsonify({
            'answer': answer,
            'sources': sources,
            'query': query
        })
        
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@app.route('/api/documents')
def list_documents():
    """API endpoint to list all uploaded documents"""
    documents = []
    try:
        for filename in os.listdir(Config.DOCUMENTS_FOLDER):
            if filename.endswith(('.pdf', '.txt')):
                file_path = os.path.join(Config.DOCUMENTS_FOLDER, filename)
                if os.path.exists(file_path):
                    file_size = os.path.getsize(file_path)
                    documents.append({
                        'name': filename,
                        'size': file_size,
                        'type': 'PDF' if filename.endswith('.pdf') else 'Text'
                    })
    except FileNotFoundError:
        # Documents folder doesn't exist yet
        pass
    
    return jsonify({'documents': documents})

@app.route('/api/process', methods=['POST'])
def process_documents_endpoint():
    """API endpoint to manually trigger document processing"""
    result = process_documents()
    return jsonify({'message': result})

@app.route('/api/status')
def get_status():
    """API endpoint to get system status"""
    doc_count = len(os.listdir(Config.DOCUMENTS_FOLDER)) if os.path.exists(Config.DOCUMENTS_FOLDER) else 0
    vector_store_loaded = vector_store is not None
    gemini_configured = gemini_client is not None
    
    return jsonify({
        'documents_count': doc_count,
        'vector_store_loaded': vector_store_loaded,
        'gemini_configured': gemini_configured
    })

# Initialize vector store on startup
with app.app_context():
    load_vector_store()

if __name__ == '__main__':
    print("Starting Knowledge Base Search Engine...")
    print(f"Google Gemini configured: {gemini_client is not None}")
    print(f"Documents folder: {Config.DOCUMENTS_FOLDER}")
    print(f"Upload folder: {Config.UPLOAD_FOLDER}")
    app.run(debug=True, host='127.0.0.1', port=5000)