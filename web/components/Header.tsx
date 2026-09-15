"use client";

import Link from "next/link";
import { useState } from "react";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Fleet", href: "/fleet" },
  { name: "Services", href: "/services" },
  { name: "Contact", href: "/contact" }
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-2xl font-semibold text-brand-midnight">
          Pindi Boys
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium uppercase tracking-[0.2em] text-brand-midnight/80 transition hover:text-brand-gold"
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="hidden flex-col text-right text-sm leading-tight md:flex">
          <a href="tel:+971543210987" className="font-semibold text-brand-midnight hover:text-brand-gold">
            +971 54 321 0987
          </a>
          <span className="text-brand-midnight/60">24/7 Concierge Support</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-midnight/10 md:hidden"
          aria-label="Toggle navigation"
        >
          <span className="block h-[2px] w-6 bg-brand-midnight" />
        </button>
      </div>
      {open ? (
        <nav className="border-t border-brand-midnight/10 bg-white md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium uppercase tracking-[0.3em] text-brand-midnight/80 transition hover:bg-brand-sand/40 hover:text-brand-midnight"
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="rounded-md bg-brand-sand/60 px-3 py-2 text-sm text-brand-midnight">
              <div className="font-semibold">24/7 Concierge</div>
              <a href="tel:+971543210987" className="block hover:text-brand-gold">
                +971 54 321 0987
              </a>
              <a href="mailto:drive@pindiboys.ae" className="block hover:text-brand-gold">
                drive@pindiboys.ae
              </a>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
