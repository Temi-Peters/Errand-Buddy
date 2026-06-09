import { Calendar, Clock, HeartHandshake, MapPin, UserRound } from 'lucide-react';
import Card from './Card';
import StatusBadge from './StatusBadge';

export default function BookingCard({ booking, runner, customer, actions }) {
  return (
    <Card className="hover-glow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-ink">{booking.serviceType}</h3>
            <StatusBadge status={booking.status} />
            {booking.createdByCarer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                <HeartHandshake size={12} /> Carer-assisted
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{booking.bookingType}</p>
          {booking.createdByCarer && (
            <p className="mt-1 text-xs text-muted">Booked by {booking.createdByCarer.name}</p>
          )}
        </div>
        <p className="rounded-xl bg-surface-hi px-4 py-2 text-xl font-extrabold text-ink">£{booking.price}</p>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
        <p className="flex items-center gap-2"><Calendar size={16} /> {booking.date}</p>
        <p className="flex items-center gap-2"><Clock size={16} /> {booking.time}</p>
        <p className="flex items-center gap-2"><MapPin size={16} /> {booking.postcodeArea}</p>
        {runner && <p className="flex items-center gap-2"><UserRound size={16} /> {runner.name}</p>}
        {customer && <p className="flex items-center gap-2"><UserRound size={16} /> {customer.name}</p>}
      </div>
      {actions && <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-hi pt-4">{actions}</div>}
    </Card>
  );
}
