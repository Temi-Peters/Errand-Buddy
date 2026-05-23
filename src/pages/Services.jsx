import { Pill, Shirt, ShoppingBag, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const services = [
  ['Grocery Shopping', ShoppingBag, 'Practical help with weekly or one-off food shops.', 'Small shops, supermarket collections, essentials', 'from £25'],
  ['Prescription Pickup', Pill, 'Careful collection from local pharmacies.', 'Repeat prescriptions, pharmacy collection, delivery home', 'from £25'],
  ['Dry Cleaning', Shirt, 'Drop-off and collection support for busy households.', 'Suits, coats, dresses, local cleaners', 'from £25'],
  ['General Errands', Store, 'Flexible help with everyday local tasks.', 'Post office, parcel returns, small purchases', 'from £25']
];

export default function Services() {
  return (
    <div className="space-y-8">
      <section>
        <span className="page-kicker">Services</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">Local errand services</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Book trusted help from approved local runners for the tasks that keep your week moving.</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        {services.map(([name, Icon, description, examples, price]) => (
          <Card key={name} className="hover-glow p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hi text-muted"><Icon size={24} /></span>
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-sm font-bold text-secondary">{price}</span>
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-ink">{name}</h2>
            <p className="mt-2 leading-7 text-muted">{description}</p>
            <p className="mt-4 rounded-xl bg-surface-hi p-3 text-sm text-muted"><strong className="text-ink">Typical examples:</strong> {examples}</p>
            <Button as={Link} to="/book" className="mt-5">Book {name}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
