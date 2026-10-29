export async function runGeminiAnalysis(type: string, payload: any): Promise<{ text: string; modelUsed: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline Mode Active: Gemini AI features require an active internet connection.');
  }

  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error('runGeminiAnalysis error:', error);
    throw error;
  }
}
