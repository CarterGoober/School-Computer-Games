(() => {
  const client = createChatClient(ChatConfig.url, ChatConfig.key);
  const status = document.querySelector('#status'), result = document.querySelector('#result');
  const buttons = [...document.querySelectorAll('button')];
  let owner = false, busy = false;
  function controls() { buttons.forEach(b => b.disabled = !owner || busy); }
  async function check() {
    owner = false; controls();
    const { data: { session } } = await client.auth.getSession();
    if (!session) { status.textContent = 'Sign in with your owner account at Garage AI, then reload this page.'; return; }
    const { data, error } = await client.rpc('acc_call', { op: 'bootstrap', b: {} });
    owner = !error && data?.self?.owner === true;
    status.textContent = owner ? 'Choose a fixed test. No request has been sent to Cloudflare.' : 'An authenticated platform owner is required.';
    controls();
  }
  for (const button of buttons) button.onclick = async () => {
    if (!owner || busy) return;
    busy = true; controls(); result.textContent = ''; status.textContent = 'Running one controlled test…';
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw Error('Sign in again.');
      const r = await fetch(ChatConfig.url + '/functions/v1/garage-ai', {
        method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, apikey: ChatConfig.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'selftest', case: button.id }), signal: AbortSignal.timeout(60000)
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Test failed.');
      result.textContent = JSON.stringify(data, null, 2);
      status.textContent = data.passed ? 'Test passed. Student access remains disabled.' : 'Test returned an unexpected answer. Keep AI disabled.';
    } catch (e) { status.textContent = e.message; }
    finally { busy = false; controls(); }
  };
  check().catch(() => { status.textContent = 'Account validation unavailable.'; });
})();
