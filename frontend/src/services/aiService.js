import api from './api';

/**
 * Service for communicating with DigiVote AI Assistant backend (/api/ai/chat/).
 * Handles session token authorization, payload validation, and user-safe error translation.
 */
export const aiService = {
  /**
   * Send a chat message to the DigiVote AI Assistant
   * @param {string} message - The user's query (max 2000 characters)
   * @param {string|null} [electionId=null] - Optional UUID of selected election context
   * @param {Array<{role: string, content: string}>} [conversation=[]] - Optional recent conversation turns
   * @returns {Promise<{ answer: string, sources: Array<{source: string, page: number}>, context_used?: object }>}
   */
  sendMessage: async (message, electionId = null, conversation = []) => {
    const trimmed = typeof message === 'string' ? message.trim() : '';
    if (!trimmed) {
      throw new Error('Please enter a valid question.');
    }

    const payload = {
      message: trimmed,
    };

    if (electionId && typeof electionId === 'string' && electionId.trim() !== '') {
      payload.election_id = electionId.trim();
    }

    if (Array.isArray(conversation) && conversation.length > 0) {
      payload.conversation = conversation;
    }

    try {
      const response = await api.post('/ai/chat/', payload);
      const data = response.data;

      // Validate standard structure
      if (data && typeof data.answer === 'string') {
        return {
          answer: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
          context_used: data.context_used || {},
          requestId: data.request_id || null,
        };
      }

      if (data && data.success === false) {
        throw new Error(data.detail || 'The DigiVote Assistant is temporarily unavailable.');
      }

      throw new Error('The DigiVote Assistant is temporarily unavailable.');
    } catch (err) {
      // Map HTTP status codes to standardized DigiVote user-friendly messages
      const status = err?.response?.status;

      if (status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (status === 400) {
        // Extract field errors if provided by DRF serializer
        const errData = err.response?.data;
        if (errData?.errors?.message?.[0]) {
          throw new Error(errData.errors.message[0]);
        }
        if (errData?.errors?.election_id?.[0]) {
          throw new Error('Invalid election context provided.');
        }
        throw new Error('Please enter a valid question.');
      }
      if (status === 403) {
        throw new Error("You don't have permission to access this information.");
      }
      if (status === 404) {
        throw new Error('That election or resource could not be found.');
      }
      if (status === 429) {
        throw new Error('Too many requests. Please try again in a moment.');
      }
      if (status === 500) {
        throw new Error('The DigiVote Assistant is temporarily unavailable.');
      }

      // Network or unhandled errors
      if (err?.code === 'ERR_NETWORK' || !err.response) {
        throw new Error('Unable to connect to the DigiVote server. Please try again.');
      }

      // Fallback safe message (no technical trace)
      throw new Error(err?.message && !err.message.includes('object') ? err.message : 'The DigiVote Assistant is temporarily unavailable.');
    }
  },

  /**
   * Submit user feedback on an assistant response (Stage 5)
   * @param {string} messageId - Safe backend UUID request_id
   * @param {'helpful'|'not_helpful'} rating - User rating
   * @returns {Promise<{success: boolean, message: string}>}
   */
  submitFeedback: async (messageId, rating) => {
    if (!messageId) {
      throw new Error('Invalid message reference.');
    }
    if (rating !== 'helpful' && rating !== 'not_helpful') {
      throw new Error('Rating must be either helpful or not_helpful.');
    }

    try {
      const response = await api.post('/ai/feedback/', {
        message_id: messageId,
        rating: rating,
      });
      return response.data;
    } catch (err) {
      const msg = err?.response?.data?.errors?.rating?.[0] ||
                  err?.response?.data?.detail ||
                  'Failed to submit feedback.';
      throw new Error(msg);
    }
  },

  /**
   * Health check for AI Assistant backend service
   */
  getHealth: async () => {
    try {
      const res = await api.get('/ai/health/');
      return res.data;
    } catch {
      return { status: 'unavailable', gemini_configured: false, pinecone_configured: false };
    }
  },
};

export default aiService;
