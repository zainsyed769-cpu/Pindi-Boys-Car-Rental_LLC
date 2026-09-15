const featuredSegments = [
  {
    title: "Flagship Luxury",
    description:
      "Rolls-Royce Cullinan, Ghost, and Bentley Bentayga curated for VIP airport transfers and red-carpet reveals.",
    highlight: "Dedicated chauffeur and onboard refreshments"
  },
  {
    title: "Performance Icons",
    description:
      "Lamborghini Huracán EVO, Ferrari F8 Tributo, and McLaren GT meticulously detailed for self-drive adventures.",
    highlight: "Daily, weekend, and weekly packages with mileage flexibility"
  },
  {
    title: "Executive Fleet",
    description:
      "Mercedes-Benz S-Class, BMW 7 Series, and Lexus LX 600 tailored for corporate roadshows and diplomatic delegations.",
    highlight: "Multilingual drivers and secure communications"
  }
];

export default function FleetPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <h1 className="section-heading">Our Fleet</h1>
        <p className="section-subtitle">
          A refined collection of performance machines, SUVs, and executive sedans, expertly maintained to exceed Dubai’s
          discerning standards.
        </p>
      </header>
      <section className="mt-12 grid gap-8 md:grid-cols-2">
        {featuredSegments.map((segment) => (
          <article key={segment.title} className="rounded-2xl border border-brand-midnight/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-2xl text-brand-midnight">{segment.title}</h2>
            <p className="mt-3 text-sm text-brand-midnight/70">{segment.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-brand-gold">
              {segment.highlight}
            </p>
          </article>
        ))}
      </section>
      <section className="mt-16 rounded-3xl bg-brand-midnight/95 p-8 text-brand-sand">
        <h2 className="font-display text-2xl text-brand-gold">Fleet Readiness</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-brand-sand/80">
          <li>Vehicles sanitized and detailed before every handover</li>
          <li>Comprehensive insurance coverage and roadside support</li>
          <li>Delivery to hotels, private terminals, and residences across the UAE</li>
        </ul>
      </section>
    </div>
  );
}
