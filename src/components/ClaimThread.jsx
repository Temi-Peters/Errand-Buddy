import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Button from './Button';
import Modal from './Modal';

// A claim is a conversation between the customer, the runner it names, and the
// team — not a verdict handed down. Before this, a runner could have money taken
// off their work without ever being told the complaint existed.
export default function ClaimThread({ claim, onClose, onPosted }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.claimThread(claim.id)
      .then((d) => setMessages(d.messages || []))
      .catch((err) => setError(err.message || 'Could not load this conversation'))
      .finally(() => setLoading(false));
  }, [claim.id]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const { message } = await api.replyToClaim(claim.id, body.trim());
      setMessages((current) => [...current, message]);
      setBody('');
      onPosted?.();
    } catch (err) {
      setError(err.message || 'Could not send that');
    } finally {
      setSending(false);
    }
  };

  const settled = claim.status !== 'Open';

  return (
    <Modal title={`Issue: ${claim.category}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-lg bg-surface-hi p-3">
          <p className="text-sm font-bold text-ink">What was reported</p>
          <p className="mt-1 text-sm text-muted">{claim.description}</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading the conversation…</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-surface-hi p-3">
            {messages.length ? messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-surface p-3">
                <p className="text-sm font-bold text-ink">
                  {m.senderName} <span className="font-normal text-muted">· {m.senderRole}</span>
                </p>
                <p className="mt-1 text-sm text-ink">{m.body}</p>
              </div>
            )) : <p className="text-sm text-muted">Nothing said yet.</p>}
          </div>
        )}

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        {settled ? (
          <p className="text-sm font-semibold text-muted">This issue has been settled — the conversation is closed.</p>
        ) : (
          <>
            <textarea
              className="focus-ring min-h-24 w-full rounded-lg border border-surface-hi p-3"
              placeholder="Add your side of it…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button className="w-full" loading={sending} disabled={!body.trim()} onClick={send}>
              Send
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
