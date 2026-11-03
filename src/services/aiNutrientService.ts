declare const process: { env?: Record<string, string | undefined> } | undefined;

export interface MacroResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
  notes?: string;
}

export interface AIEstimateResponse {
  success: boolean;
  data?: MacroResult;
  error?: string;
}

/**
 * Normalizes user weight/volume input.
 * Supports grams (g) and milliliters (ml).
 * If user enters only a number (e.g. "200"), automatically appends the default unit.
 */
export function normalizeWeightUnit(weightInput?: string, defaultUnit: 'g' | 'ml' = 'g'): string {
  const trimmed = (weightInput || '').trim();
  if (!trimmed) {
    return `100${defaultUnit}`;
  }
  // If only digits or decimals (e.g. "250", "150.5")
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}${defaultUnit}`;
  }
  // If user typed "gam", "gram", "grams" -> standardize to "g"
  if (/^\d+(\.\d+)?\s*(gam|gram|grams|g)$/i.test(trimmed)) {
    const val = trimmed.replace(/[^\d.]/g, '');
    return `${val}g`;
  }
  // If user typed "ml", "mililit", "milliliter" -> standardize to "ml"
  if (/^\d+(\.\d+)?\s*(ml|mililit|milliliter|mls)$/i.test(trimmed)) {
    const val = trimmed.replace(/[^\d.]/g, '');
    return `${val}ml`;
  }
  return trimmed;
}

export async function estimateNutritionWithAI(
  foodName: string,
  weightOrPortion: string,
  apiKey?: string,
  preferredUnit: 'g' | 'ml' = 'g'
): Promise<AIEstimateResponse> {
  const trimmedName = foodName.trim();
  const normalizedWeight = normalizeWeightUnit(weightOrPortion, preferredUnit);

  if (!trimmedName) {
    return { success: false, error: 'Vui lòng nhập tên món ăn' };
  }

  const envKey =
    typeof process !== 'undefined' && process?.env
      ? (process.env as Record<string, string | undefined>)['EXPO_PUBLIC_GEMINI_API_KEY']
      : undefined;
  const key = apiKey || envKey;
  if (!key) {
    return {
      success: false,
      error: 'Chưa có Gemini API Key. Bạn có thể nhập API Key hoặc thiết lập EXPO_PUBLIC_GEMINI_API_KEY.',
    };
  }

  // 10s timeout protection against network freeze
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;

  try {
    const prompt = `Bạn là chuyên gia dinh dưỡng. Hãy ước tính lượng calo và macro (protein, carbs, fat) cho món ăn sau:
Tên món: "${trimmedName}"
Khối lượng hoặc thể tích: "${normalizedWeight}" (hỗ trợ đơn vị tính theo gam (g) hoặc mililit (ml))

Chỉ trả về JSON duy nhất (không dùng markdown code fence, không có chữ ngoài JSON) theo cấu trúc:
{
  "calories": 450,
  "protein": 25.5,
  "carbs": 60.0,
  "fat": 11.2,
  "unit": "${normalizedWeight}",
  "notes": "Ước lượng dinh dưỡng"
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller?.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Lỗi API (${res.status}): ${errText.slice(0, 100)}` };
    }

    const json = await res.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { success: false, error: 'Không nhận được dữ liệu từ AI' };
    }

    const parsed = JSON.parse(rawText);
    return {
      success: true,
      data: {
        calories: Math.round(Number(parsed.calories) || 0),
        protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
        fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
        unit: parsed.unit || normalizedWeight,
        notes: parsed.notes || '',
      },
    };
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return { success: false, error: 'Yêu cầu gọi AI đã quá thời gian (Timeout). Vui lòng thử lại.' };
    }
    return {
      success: false,
      error: `Không thể kết nối đến máy chủ AI (${err?.message || 'Lỗi mạng'}). Vui lòng kiểm tra kết nối mạng.`,
    };
  }
}
