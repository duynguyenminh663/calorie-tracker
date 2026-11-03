import { estimateNutritionWithAI, normalizeWeightUnit } from '../src/services/aiNutrientService';

describe('aiNutrientService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('normalizeWeightUnit', () => {
    it('defaults to 100g when input is empty or whitespace', () => {
      expect(normalizeWeightUnit('')).toBe('100g');
      expect(normalizeWeightUnit('   ')).toBe('100g');
      expect(normalizeWeightUnit('', 'ml')).toBe('100ml');
    });

    it('automatically appends unit when only a number is provided', () => {
      expect(normalizeWeightUnit('250')).toBe('250g');
      expect(normalizeWeightUnit('150.5')).toBe('150.5g');
      expect(normalizeWeightUnit('300', 'ml')).toBe('300ml');
    });

    it('standardizes variations of gram and ml', () => {
      expect(normalizeWeightUnit('200 gam')).toBe('200g');
      expect(normalizeWeightUnit('150 grams')).toBe('150g');
      expect(normalizeWeightUnit('350 mililit')).toBe('350ml');
      expect(normalizeWeightUnit('500ml')).toBe('500ml');
    });
  });

  it('fails gracefully when food name is empty', async () => {
    const res = await estimateNutritionWithAI('   ', '100g', 'test-key');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Vui lòng nhập tên món ăn');
  });

  it('fails gracefully when no API key is provided or found in env', async () => {
    const oldKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    const res = await estimateNutritionWithAI('Phở bò', '1 bát');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Gemini API Key');

    if (oldKey) process.env.EXPO_PUBLIC_GEMINI_API_KEY = oldKey;
  });

  it('correctly parses structured Gemini AI response and formats macros', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    calories: 480,
                    protein: 28.4,
                    carbs: 65.1,
                    fat: 12.3,
                    unit: '350g',
                    notes: 'Phở bò tái nạm',
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as any);

    const res = await estimateNutritionWithAI('Phở bò', '350g', 'mock-key');
    expect(res.success).toBe(true);
    expect(res.data?.calories).toBe(480);
    expect(res.data?.protein).toBe(28.4);
    expect(res.data?.carbs).toBe(65.1);
    expect(res.data?.fat).toBe(12.3);
    expect(res.data?.unit).toBe('350g');
  });

  it('handles network failure with clean error message without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

    const res = await estimateNutritionWithAI('Cơm gà', '200g', 'mock-key');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Không thể kết nối đến máy chủ AI');
  });
});
