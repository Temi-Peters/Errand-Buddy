import { Pill, Shirt, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const services = [
  { name: 'Grocery Shopping', Icon: ShoppingBag, description: 'Practical help with weekly or one-off food shops.', examples: 'Small shops, supermarket collections, essentials', price: 'from £25', bookable: true },
  { name: 'Prescription Pickup', Icon: Pill, description: 'Careful collection from local pharmacies.', examples: 'Repeat prescriptions, pharmacy collection, delivery home', price: 'from £25', bookable: true },
  { name: 'Dry Cleaning', Icon: Shirt, description: 'Drop-off and collection support for busy households.', examples: 'Suits, coats, dresses, local cleaners', price: 'Coming soon', bookable: false },
];

export default function Services() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">Local errand services</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">Book trusted help from approved local runners for the tasks that keep your week moving.</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        {services.map(({ name, Icon, description, examples, price, bookable }) => (
          <Card key={name} className={`hover-glow p-6 ${!bookable ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hi text-muted"><Icon size={24} /></span>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${bookable ? 'bg-secondary/10 text-secondary' : 'bg-surface-hi text-muted'}`}>{price}</span>
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-ink">{name}</h2>
            <p className="mt-2 leading-7 text-muted">{description}</p>
            <p className="mt-4 rounded-xl bg-surface-hi p-3 text-sm text-muted"><strong className="text-ink">Typical examples:</strong> {examples}</p>
            {bookable
              ? <Button as={Link} to="/book" className="mt-5">Book {name}</Button>
              : <p className="mt-5 text-sm font-semibold text-muted">Available in a future update</p>
            }
          </Card>
        ))}
      </div>
    </div>
  );
}
