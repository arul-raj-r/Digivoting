from pypdf import PdfReader
from google import genai
from pinecone import Pinecone
from config import (
    GEMINI_API_KEY,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    EMBEDDING_MODEL
)


# =====================================================
# INITIALIZE GEMINI
# =====================================================

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# =====================================================
# INITIALIZE PINECONE
# =====================================================

pc = Pinecone(
    api_key=PINECONE_API_KEY
)

index = pc.Index(
    PINECONE_INDEX_NAME
)


# =====================================================
# READ PDF
# =====================================================

PDF_PATH = "pdf/python_course.pdf"


def extract_pdf_text():

    reader = PdfReader(PDF_PATH)

    pages = []

    for page_number, page in enumerate(reader.pages):

        text = page.extract_text()

        if text:
            pages.append({
                "page": page_number + 1,
                "text": text
            })

    return pages


# =====================================================
# SPLIT TEXT INTO CHUNKS
# =====================================================

def create_chunks(pages):

    chunks = []

    chunk_size = 1200
    overlap = 200

    for page in pages:

        text = page["text"]
        page_number = page["page"]

        start = 0

        while start < len(text):

            end = start + chunk_size

            chunk_text = text[start:end]

            if chunk_text.strip():

                chunks.append({
                    "text": chunk_text,
                    "page": page_number
                })

            start += chunk_size - overlap

    return chunks


# =====================================================
# CREATE EMBEDDING
# =====================================================

def create_embedding(text):

    response = gemini_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text
    )

    return response.embeddings[0].values


# =====================================================
# UPLOAD TO PINECONE
# =====================================================

def upload_to_pinecone(chunks):

    vectors = []

    for i, chunk in enumerate(chunks):

        print(
            f"Creating embedding {i + 1}/{len(chunks)}"
        )

        embedding = create_embedding(
            chunk["text"]
        )

        vectors.append({
            "id": f"python-course-{i}",

            "values": embedding,

            "metadata": {
                "text": chunk["text"],
                "page": chunk["page"],
                "source": "python_course.pdf"
            }
        })

    index.upsert(
        vectors=vectors
    )

    print("\nPDF successfully uploaded to Pinecone!")


# =====================================================
# MAIN
# =====================================================

if __name__ == "__main__":

    print("Reading PDF...")

    pages = extract_pdf_text()

    print(
        f"Found {len(pages)} pages."
    )

    print("Creating chunks...")

    chunks = create_chunks(pages)

    print(
        f"Created {len(chunks)} chunks."
    )

    upload_to_pinecone(chunks)