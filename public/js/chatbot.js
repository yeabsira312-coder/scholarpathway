// Embedded Chatbot UI (client-side)
// This lightweight widget stores history in localStorage and posts user messages to /api/chat (if available)

document.addEventListener('DOMContentLoaded', () => {
  // Create container in the page footer area
  const chatContainer = document.createElement('div');
  chatContainer.id = 'embedded-chatbot';
  chatContainer.innerHTML = `
    <div class="chatbot-panel collapsed" aria-hidden="true">
      <div class="chatbot-header">
        <div class="chatbot-title">ScholarPathway Assistant</div>
        <button class="chatbot-toggle" aria-label="Open chat">💬</button>
      </div>
      <div class="chatbot-body">
        <div class="chatbot-messages" role="log" aria-live="polite"></div>
        <form class="chatbot-form">
          <input name="message" placeholder="Ask about scholarships, deadlines, or tips..." autocomplete="off" required />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(chatContainer);

  const panel = document.querySelector('#embedded-chatbot .chatbot-panel');
  const toggle = panel.querySelector('.chatbot-toggle');
  const messagesEl = panel.querySelector('.chatbot-messages');
  const form = panel.querySelector('.chatbot-form');
  const input = form.querySelector('input[name="message"]');

  // Load history
  const historyKey = 'sp.chat.history.v1';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch (e) { history = []; }
  history.forEach(msg => appendMessage(msg.role, msg.text));

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      panel.setAttribute('aria-hidden', 'false');
      input.focus();
    } else {
      panel.classList.add('collapsed');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    saveToHistory('user', text);
    input.value = '';
    input.disabled = true;

    appendMessage('assistant', 'Thinking...');
    const placeholderNode = messagesEl.lastElementChild;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      let data;
      if (res.ok) data = await res.json();

      // Remove placeholder and append real response
      if (placeholderNode) placeholderNode.remove();

      const reply = (data && data.reply) ? data.reply : "Sorry, the assistant isn't available. Try again later.";
      appendMessage('assistant', reply);
      saveToHistory('assistant', reply);
    } catch (err) {
      if (placeholderNode) placeholderNode.remove();
      appendMessage('assistant', "Network error: unable to reach assistant.");
      saveToHistory('assistant', "Network error: unable to reach assistant.");
    } finally {
      input.disabled = false;
      input.focus();
    }
  });

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chatbot-message ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function saveToHistory(role, text) {
    history.push({ role, text, ts: Date.now() });
    if (history.length > 200) history.shift();
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch (e) { /* ignore */ }
  }
});
