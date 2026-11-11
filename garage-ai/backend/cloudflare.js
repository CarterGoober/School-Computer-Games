// Official request examples and their limitations: ../CLOUDFLARE.md.
// Pin one reviewed model. Never accept a provider/model/URL from a browser.
export const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

export function configured(env) {
  return /^[a-f0-9]{32}$/i.test(env('CLOUDFLARE_ACCOUNT_ID') || '') &&
    !!env('CLOUDFLARE_API_TOKEN')?.trim() &&
    env('GARAGE_AI_CLOUDFLARE_FREE_PLAN_CONFIRMED') === 'true' &&
    env('GARAGE_AI_CLOUDFLARE_MODEL_TERMS_CONFIRMED') === 'true';
}

export function payload(input, system, maxTokens = 4096) {
  return {
    messages: [
      { role: 'system', content: system },
      ...input.history.map(m => ({ role: m.role, content: m.text })),
      { role: 'user', content: input.question + '\nRequested response style: ' + input.style }
    ],
    // Cloudflare's official Llama vision tutorial uses a base64 data URL here.
    ...(input.image ? { image: input.image } : {}),
    stream: false,
    max_tokens: maxTokens
  };
}

export async function runModel(input, system, env, fetcher, maxTokens = 4096) {
  const response = await fetcher(
    'https://api.cloudflare.com/client/v4/accounts/' + env('CLOUDFLARE_ACCOUNT_ID') + '/ai/run/' + MODEL,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env('CLOUDFLARE_API_TOKEN'), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(input, system, maxTokens)),
      signal: AbortSignal.timeout(45000),
      redirect: 'error'
    }
  );
  // Never return provider error bodies, account IDs, credentials or headers.
  if (!response.ok) {
    await response.body?.cancel();
    return { status: response.status === 429 ? 429 : 502, error: response.status === 429
      ? 'Cloudflare is temporarily rate-limited or its free allowance is exhausted. Try later. This attempt counts toward your limit.'
      : 'Cloudflare could not answer. The operator must check configuration, model terms and availability. This attempt counts toward your limit.' };
  }
  const reader = response.body?.getReader();
  if (!reader) return { status: 502, error: 'Cloudflare returned an empty response.' };
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 128000) { await reader.cancel(); return { status: 502, error: 'Cloudflare returned an oversized response.' }; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return { status: 502, error: 'Cloudflare returned an invalid response.' }; }
  const answer = data?.result?.response;
  if (data?.success !== true || typeof answer !== 'string' || !answer.trim() || answer.length > 64000)
    return { status: 422, error: 'No answer was returned. This attempt counts toward your limit.' };
  return { answer: answer.trim() };
}

// Fixed, non-sensitive probes only. Never send student content via this path.
export function selfTestInput(kind) {
  return { question: kind === 'image' ? 'What single color fills this image? Answer with one color word.' : 'What is 2 + 2? Answer with only the number.',
    history: [], style: 'Quick', image: kind === 'image' ? TEST_IMAGE : null };
}

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAb0lEQVR4nO3PAQkAAAyEwO9feoshgnABdLep8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3IPanc8OLDQitxAAAAAElFTkSuQmCC';
