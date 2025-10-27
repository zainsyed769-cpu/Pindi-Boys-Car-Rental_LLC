import Link from "next/link";

const quickLinks = [
  { name: "Fleet", href: "/fleet" },
  { name: "Services", href: "/services" },
  { name: "Corporate", href: "/services#corporate" },
  { name: "Request a Quote", href: "/contact" }
];

export default function Footer() {
  return (
    <footer className="mt-16 bg-brand-midnight text-brand-sand">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-brand-gold">Pindi Boys Car Rental</h2>
            <p className="mt-4 text-sm text-brand-sand/70">
              Bespoke chauffeur-driven and self-drive experiences across Dubai, Abu Dhabi, and the Northern Emirates.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {quickLinks.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="hover:text-brand-gold">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold">Contact</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="tel:+971543210987" className="hover:text-brand-gold">
                  +971 54 321 0987
                </a>
              </li>
              <li>
                <a href="mailto:drive@pindiboys.ae" className="hover:text-brand-gold">
                  drive@pindiboys.ae
                </a>
              </li>
              <li>Sheikh Zayed Road, Dubai, UAE</li>
              <li className="text-brand-sand/60">License #11027</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.3em] text-brand-sand/60">
          © {new Date().getFullYear()} Pindi Boys Car Rental LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
