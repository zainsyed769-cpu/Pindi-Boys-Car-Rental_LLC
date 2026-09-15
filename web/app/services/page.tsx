const services = [
  {
    title: "Chauffeur Services",
    summary: "Discreet bilingual chauffeurs, uniformed and trained for VVIP movement.",
    bullets: [
      "Hourly, daily, and event-based bookings",
      "Airport meet-and-greet coordination",
      "Security-trained drivers available on request"
    ]
  },
  {
    title: "Corporate Leasing",
    summary: "Flexible long-term leasing for executives, embassies, and corporate teams.",
    bullets: [
      "Tailored packages from 1 month to 24 months",
      "Complimentary fleet branding and telematics",
      "Dedicated account manager for compliance and reporting"
    ]
  },
  {
    title: "Lifestyle Concierge",
    summary: "Beyond the drive—elevated luxury arrangements in partnership with Dubai’s elite networks.",
    bullets: [
      "Yacht charters, private aviation, and desert experiences",
      "Red-carpet coordination for film and fashion",
      "On-call hospitality and security add-ons"
    ]
  }
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <h1 className="section-heading">Services</h1>
        <p className="section-subtitle">
          White-glove services designed for high-net-worth individuals, royal guests, and corporate delegations visiting the
          UAE.
        </p>
      </header>
      <section className="mt-12 grid gap-8 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="flex flex-col rounded-2xl border border-brand-midnight/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-2xl text-brand-midnight">{service.title}</h2>
            <p className="mt-3 text-sm text-brand-midnight/70">{service.summary}</p>
            <ul className="mt-6 space-y-2 text-sm text-brand-midnight/70">
              {service.bullets.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-gold" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section id="corporate" className="mt-16 rounded-3xl bg-brand-sand/80 p-8">
        <h2 className="font-display text-2xl text-brand-midnight">Corporate Concierge Desk</h2>
        <p className="mt-4 text-sm text-brand-midnight/70">
          Submit itineraries in advance to receive curated routing, driver briefings, and security coordination. Our operations
          control room monitors every booking to guarantee punctuality and discretion.
        </p>
      </section>
    </div>
  );
}
