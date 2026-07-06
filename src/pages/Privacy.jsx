import Card from '../components/Card';

const Section = ({ title, children }) => (
  <div>
    <h2 className="text-lg font-bold text-ink">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-muted">{children}</div>
  </div>
);

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">How ErrandBuddy handles your personal data. Last updated June 2026.</p>
      </div>

      <Card className="space-y-6">
        <Section title="Who we are">
          <p>ErrandBuddy is a local errand marketplace operating across south-east Leicester. We are the data controller for the personal information described below.</p>
        </Section>

        <Section title="What we collect">
          <p>Account details (name, email, phone), your address and postcode area, booking details and instructions, messages with your runner, and payment records. Card details are handled entirely by our payment provider, Stripe — we never see or store your full card number.</p>
        </Section>

        <Section title="Why we use it">
          <p>To create your account, match you with a vetted runner, process payments, send service notifications, provide support, and keep the platform safe. Our lawful basis is performance of our contract with you, and your consent for any optional marketing.</p>
        </Section>

        <Section title="Who we share it with">
          <p>Only the parties needed to deliver your errand and run the service: your assigned runner (the details required to complete the task), and our processors — Stripe (payments), Resend (email), and our hosting and database providers. We never sell your data.</p>
        </Section>

        <Section title="Your rights">
          <p>You can access, correct, export, or delete your personal data, and withdraw consent at any time. Signed-in users can <strong>download a full copy of their data</strong> or <strong>permanently delete their account</strong> directly from the Account section of their dashboard. For anything else, email us at <a href="mailto:hello@errandbuddy.uk" className="font-semibold text-primary hover:underline">hello@errandbuddy.uk</a>. You also have the right to complain to the UK Information Commissioner's Office (ICO).</p>
        </Section>

        <Section title="Contact">
          <p>Questions about your data? Email <a href="mailto:hello@errandbuddy.uk" className="font-semibold text-primary hover:underline">hello@errandbuddy.uk</a>.</p>
        </Section>
      </Card>
    </div>
  );
}
