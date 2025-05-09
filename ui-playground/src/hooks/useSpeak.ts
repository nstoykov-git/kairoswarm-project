const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const useSpeak = () => {
  const speak = async (participantId: string, message: string) => {
    try {
      const response = await fetch(`${API_BASE}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Speak API error:', err);
      return { error: 'Failed to speak.' };
    }
  };

  return { speak };
};
