import { Mail, MessageSquare, MapPin } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';

export default function Contact() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-ink">Get in touch</h1>
        <p className="mt-2 text-muted">
          Questions about a booking, becoming a runner, or partnering with us? We'd love to hear from you.
        </p>
      </div>

      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hi text-ink">
            <Mail size={18} />
          </span>
          <div>
            <p className="font-bold text-ink">Email us</p>
            <p className="text-sm text-muted">We typically reply within one working day.</p>
            <a href="mailto:hello@errandbuddy.uk" className="mt-1 inline-block font-semibold text-primary hover:underline">
              hello@errandbuddy.uk
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hi text-ink">
            <MessageSquare size={18} />
          </span>
          <div>
            <p className="font-bold text-ink">Already booked?</p>
            <p className="text-sm text-muted">Message your runner directly from your dashboard once a task is in progress.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hi text-ink">
            <MapPin size={18} />
          </span>
          <div>
            <p className="font-bold text-ink">Where we operate</p>
            <p className="text-sm text-muted">Across south-east Leicester — Oadby, Stoneygate, Knighton, Clarendon Park and Evington.</p>
          </div>
        </div>

        <Button as="a" href="mailto:hello@errandbuddy.uk" className="w-full sm:w-auto">
          <Mail size={16} /> Email hello@errandbuddy.uk
        </Button>
      </Card>
    </div>
  );
}
