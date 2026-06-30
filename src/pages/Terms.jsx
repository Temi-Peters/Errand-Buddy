import Card from '../components/Card';

const Section = ({ title, children }) => (
  <div>
    <h2 className="text-lg font-bold text-ink">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-muted">{children}</div>
  </div>
);

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-black text-ink">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">The agreement between you and ErrandBuddy. Last updated June 2026.</p>
      </div>

      <Card className="space-y-6">
        <Section title="The service">
          <p>ErrandBuddy connects customers with vetted local runners who carry out everyday errands such as grocery shopping and prescription pickups. We facilitate bookings and payments between you and your runner.</p>
        </Section>

        <Section title="Accounts">
          <p>You must provide accurate details and keep your login secure. You're responsible for activity on your account. Runners are approved by us before they can accept tasks.</p>
        </Section>

        <Section title="Bookings & payments">
          <p>Prices are shown before you confirm a booking and the service fee is taken at checkout. Where a runner buys goods on your behalf, those costs are covered by your prepaid wallet. ErrandBuddy takes a platform commission; the remainder is paid to your runner.</p>
        </Section>

        <Section title="Conduct">
          <p>Treat runners and customers with respect. Errands must be lawful and within the agreed scope. We may suspend accounts that abuse the platform or put others at risk.</p>
        </Section>

        <Section title="Liability">
          <p>We work hard to vet runners and keep the service reliable, but ErrandBuddy is a platform connecting independent parties. To the extent permitted by law, we are not liable for the acts of individual runners or customers beyond our role in facilitating the booking.</p>
        </Section>

        <Section title="Changes & contact">
          <p>We may update these terms as the service grows; we'll flag material changes. Questions? Email <a href="mailto:hello@errandbuddy.uk" className="font-semibold text-primary hover:underline">hello@errandbuddy.uk</a>.</p>
        </Section>
      </Card>
    </div>
  );
}
