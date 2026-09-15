const contactChannels = [
  {
    label: "Concierge",
    value: "+971 54 321 0987",
    href: "tel:+971543210987"
  },
  {
    label: "Reservations",
    value: "drive@pindiboys.ae",
    href: "mailto:drive@pindiboys.ae"
  },
  {
    label: "Operations Centre",
    value: "+971 4 555 1122",
    href: "tel:+97145551122"
  }
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <h1 className="section-heading">Contact</h1>
        <p className="section-subtitle">
          Our concierge desk is active around the clock to coordinate bespoke mobility for your guests and executives.
        </p>
      </header>
      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-display text-2xl text-brand-midnight">Direct Lines</h2>
            <ul className="mt-4 space-y-4 text-sm text-brand-midnight/80">
              {contactChannels.map((channel) => (
                <li key={channel.label}>
                  <span className="block text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
                    {channel.label}
                  </span>
                  <a href={channel.href} className="mt-1 block text-base font-medium text-brand-midnight hover:text-brand-gold">
                    {channel.value}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-brand-midnight/95 p-6 text-brand-sand">
            <h2 className="font-display text-2xl text-brand-gold">Showroom</h2>
            <p className="mt-3 text-sm text-brand-sand/80">
              Al Habtoor Business Tower, Sheikh Zayed Road, Dubai, UAE
            </p>
            <p className="mt-3 text-sm text-brand-sand/60">
              Open daily from 9:00 AM – 9:00 PM with private viewings available after hours by appointment.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-brand-midnight/10 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl text-brand-midnight">Book a Consultation</h2>
          <p className="mt-3 text-sm text-brand-midnight/70">
            Share your itinerary and preferences. Our concierge team will respond within 30 minutes.
          </p>
          <form className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-midnight/70">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Sheikh Ahmed Al Maktoum"
                className="mt-2 w-full rounded-lg border border-brand-midnight/10 bg-brand-cloud px-4 py-3 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-midnight/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.ae"
                className="mt-2 w-full rounded-lg border border-brand-midnight/10 bg-brand-cloud px-4 py-3 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40"
              />
            </div>
            <div>
              <label htmlFor="details" className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-midnight/70">
                Travel Details
              </label>
              <textarea
                id="details"
                rows={4}
                placeholder="Arrival dates, preferred vehicles, chauffeur requirements..."
                className="mt-2 w-full rounded-lg border border-brand-midnight/10 bg-brand-cloud px-4 py-3 text-sm outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/40"
              />
            </div>
            <button
              type="button"
              className="w-full rounded-full bg-brand-midnight px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-brand-gold"
            >
              Submit Inquiry
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
