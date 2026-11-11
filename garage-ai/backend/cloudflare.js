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
    const diagnostic = await providerFailure(response);
    return { diagnostic, status: response.status === 429 ? 429 : 502, error: response.status === 429
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
  const rawAnswer = data?.result?.response;
  // Workers AI can return a numeric scalar for number-only questions.
  // Do not stringify objects, arrays, booleans, null or non-finite numbers.
  const answer = typeof rawAnswer === 'number' && Number.isFinite(rawAnswer) ? String(rawAnswer) : rawAnswer;
  if (data?.success !== true || typeof answer !== 'string' || !answer.trim() || answer.length > 64000)
    return { status: 422, error: 'No answer was returned. This attempt counts toward your limit.', diagnostic: {
      httpStatus: response.status,
      codes: Array.isArray(data?.errors) ? data.errors.slice(0,8).map(e=>e?.code).filter(Number.isSafeInteger) : [],
      hint: 'Response format: success=' + (data?.success === true) +
        ', resultType=' + (data?.result === null ? 'null' : typeof data?.result) +
        ', responseType=' + typeof answer + ', responseLength=' + (typeof answer === 'string' ? answer.length : 0) +
        ', choices=' + Array.isArray(data?.result?.choices) +
        ', directResponse=' + (typeof data?.response === 'string') +
        ', finish=' + (['stop','length','content_filter','tool_calls'].includes(data?.result?.choices?.[0]?.finish_reason) ? data.result.choices[0].finish_reason : 'unspecified') + '.'
    } };
  return { answer: answer.trim() };
}

// Fixed, non-sensitive probes only. Never send student content via this path.
export function selfTestInput(kind) {
  return { question: kind === 'image' ? 'What single color fills this image? Answer with one color word.' : 'What is 2 + 2? Answer with only the number.',
    history: [], style: 'Quick', image: kind === 'image' ? TEST_IMAGE : null };
}

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAb0lEQVR4nO3PAQkAAAyEwO9feoshgnABdLep8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3I8QUNyPEFDcjxBQ3IPanc8OLDQitxAAAAAElFTkSuQmCC';

// Bounded inspection; return only numeric codes and fixed explanations, never raw text.
export async function providerFailure(response) {
  let text = '', size = 0;
  const reader = response.body?.getReader();
  try {
    if (reader) while (true) {
      const {value,done}=await reader.read();if(done)break;
      size+=value.length;if(size>16384){await reader.cancel();text='';break}
      text+=new TextDecoder().decode(value);
    }
  } catch { text=''; }
  let errors=[];try { const data=JSON.parse(text);errors=Array.isArray(data.errors)?data.errors.slice(0,8):[]; } catch {}
  const codes=errors.map(e=>e?.code).filter(c=>Number.isSafeInteger(c)&&c>=0);
  const message=errors.map(e=>typeof e?.message==='string'?e.message:'').join(' ').toLowerCase();
  let reason='provider_rejection',hint='Check the Cloudflare Workers AI dashboard for model availability and request errors.';
  if (/license|licence|agree.*terms|acceptable use/.test(message)) {reason='model_terms';hint='Cloudflare reports model terms acceptance is required for this account. Review and complete its model-license step; the app will not accept terms automatically.';}
  else if(response.status===401||response.status===403){reason='authorization';hint='Check that the API token has Workers AI access for the configured account and has not expired. Do not share the token.';}
  else if(response.status===404){reason='not_found';hint='Check the configured account ID and availability of the pinned model.';}
  else if(response.status===429||/quota|neurons|daily limit/.test(message)){reason='quota';hint='Wait for the free allowance or rate limit to reset. Do not upgrade plans.';}
  else if(response.status===400||response.status===422){reason='request_format';hint='Cloudflare rejected the request format. Report this status and error codes so the model adapter can be corrected.';}
  else if(response.status>=500){reason='provider_unavailable';hint='Cloudflare reported a provider failure. Retry later; no automatic retries were made.';}
  return {httpStatus:response.status,codes,reason,hint};
}
