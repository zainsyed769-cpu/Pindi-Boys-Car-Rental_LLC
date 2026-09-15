import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-white p-10 shadow-xl shadow-brand-midnight/5">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h1 className="font-display text-4xl font-semibold text-brand-midnight sm:text-5xl">
              Experience Dubai in Signature Pindi Boys Style
            </h1>
            <p className="mt-6 text-base text-brand-midnight/70 sm:text-lg">
              Elevate every journey with our meticulously curated fleet of exotics, SUVs, and executive sedans. From airport
              transfers to red-carpet arrivals, our team delivers seamless hospitality infused with Islamabad heritage and
              Dubai sophistication.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/fleet"
                className="rounded-full bg-brand-midnight px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-brand-gold"
              >
                View Fleet
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-brand-midnight px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-brand-midnight transition hover:border-brand-gold hover:text-brand-gold"
              >
                Reserve Now
              </Link>
            </div>
          </div>
          <div className="space-y-6 rounded-3xl bg-brand-midnight/90 p-8 text-brand-sand">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-brand-gold">Concierge Hotline</div>
              <a href="tel:+971543210987" className="mt-2 block text-2xl font-semibold">
                +971 54 321 0987
              </a>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-brand-gold">Prime Location</div>
              <p className="mt-2 text-sm text-brand-sand/80">Sheikh Zayed Road, Business Bay District, Dubai</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-brand-gold">Signature Offering</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-sand/80">
                <li>Chauffeur-driven Rolls-Royce &amp; Maybach experiences</li>
                <li>Weekly and monthly executive leasing</li>
                <li>Concierge add-ons: yacht charters, VIP airport services</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
