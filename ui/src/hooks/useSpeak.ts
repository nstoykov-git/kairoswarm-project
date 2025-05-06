import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://your-modal-endpoint.modal.run';

export const useSpeak = () => {
  const speak = async (text: string) => {
    try {
      const response = await axios.post(`${API_BASE}/speak`, { text });
      return response.data;
    } catch (err: any) {
      console.error('Speak API error:', err);
      return { error: 'Failed to speak.' };
    }
  };

  return { speak };
};

