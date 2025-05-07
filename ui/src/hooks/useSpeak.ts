const API_SPEAK_URL = import.meta.env.VITE_API_SPEAK_URL;

export const useSpeak = () => {
  const speak = async (text: string) => {
    try {
      const response = await fetch(API_SPEAK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
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

