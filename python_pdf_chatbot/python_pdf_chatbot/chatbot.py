from google import genai
from pinecone import Pinecone

from config import (
    GEMINI_API_KEY,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    EMBEDDING_MODEL,
    CHAT_MODEL
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
# CREATE QUERY EMBEDDING
# =====================================================

def create_embedding(text):

    response = gemini_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text
    )

    return response.embeddings[0].values


# =====================================================
# SEARCH PINECONE
# =====================================================

def search_pdf(question):

    question_embedding = create_embedding(
        question
    )

    results = index.query(
        vector=question_embedding,
        top_k=5,
        include_metadata=True
    )

    return results.matches


# =====================================================
# CREATE CONTEXT
# =====================================================

def create_context(matches):

    context = ""

    for match in matches:

        metadata = match.metadata

        context += (
            f"\nPage: {metadata['page']}\n"
        )

        context += (
            metadata["text"] + "\n"
        )

    return context


# =====================================================
# GENERATE ANSWER
# =====================================================

def generate_answer(question, context):

    prompt = f"""
You are a Python course PDF chatbot.

You MUST answer ONLY using the information
provided in the CONTEXT.

The CONTEXT comes from the uploaded Python
course PDF.

STRICT RULES:

1. Answer only from the provided context.
2. Do not use outside knowledge.
3. Do not make up information.
4. If the answer is not present in the context,
   say exactly:

   "Don't talk unnecessarily. I don't know the answer to that question based on the provided context."

5. Do not answer questions unrelated to the PDF.
6. Keep answers clear and easy to understand.
7. If possible, mention the PDF page number.

CONTEXT:
{context}

USER QUESTION:
{question}

ANSWER:
"""

    response = gemini_client.models.generate_content(
        model=CHAT_MODEL,
        contents=prompt
    )

    return response.text


# =====================================================
# CHAT LOOP
# =====================================================

def chatbot():

    print("\n======================================")
    print("     PYTHON COURSE PDF CHATBOT")
    print("======================================")
    print("Type 'exit' to stop.\n")

    while True:

        question = input("You: ")

        if question.lower() == "exit":
            print("Chatbot: Goodbye!")
            break

        matches = search_pdf(
            question
        )

        if not matches:

            print(
                "\nChatbot: I couldn't find this "
                "information in the uploaded "
                "Python course PDF.\n"
            )

            continue

        context = create_context(
            matches
        )

        answer = generate_answer(
            question,
            context
        )

        print(
            f"\nChatbot: {answer}\n"
        )


# =====================================================
# START
# =====================================================

if __name__ == "__main__":
    chatbot()