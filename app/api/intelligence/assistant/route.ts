import { jsonError, jsonOk, readJson, requestIdFrom, requiredString } from '@/lib/server/http';
import { answerQuestion } from '@/lib/server/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const body = await readJson(request);
    const question = requiredString(body, 'question');
    const history = Array.isArray(body.history)
      ? body.history.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const value = item as Record<string, unknown>;
          if ((value.role !== 'user' && value.role !== 'assistant') || typeof value.content !== 'string') return [];
          return [{ role: value.role, content: value.content.slice(0, 4000) } as { role: 'user' | 'assistant'; content: string }];
        }).slice(-8)
      : [];
    return jsonOk(await answerQuestion(question, history), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
