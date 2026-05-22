import Button from '../components/Button';
import Card from '../components/Card';

export default function Contact() {
  return <div className="mx-auto max-w-2xl"><Card><h1 className="text-3xl font-black">Contact support</h1><p className="mt-2 text-muted">Email support@errandbuddy.example for help. The form below is a placeholder for the MVP.</p><form className="mt-6 space-y-4"><input className="focus-ring min-h-11 w-full rounded-lg border border-slate-200 px-3" placeholder="Name" /><input className="focus-ring min-h-11 w-full rounded-lg border border-slate-200 px-3" placeholder="Email" /><textarea className="focus-ring min-h-32 w-full rounded-lg border border-slate-200 p-3" placeholder="How can we help?" /><Button type="button" variant="outline">Contact form coming soon</Button></form></Card></div>;
}
