const body = document.body;
const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('.nav-list');
const bookingForm = document.querySelector('.booking-form');
const bookingFormNote = bookingForm?.querySelector('.form-note');
const defaultBookingNote = bookingFormNote?.textContent ?? '';
const contactForm = document.querySelector('.contact-form');
const newsletterForm = document.querySelector('.newsletter-form');
const fleetButtons = document.querySelectorAll('.ghost-button');
const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const closeNav = () => {
  body.classList.remove('nav-open');
  if (navToggle) {
    navToggle.setAttribute('aria-expanded', 'false');
  }
};

if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const isOpen = body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navList.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      closeNav();
    }),
  );

  document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
      closeNav();
    }
  });
}

const simulateSubmission = (form, successMessage) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    const defaultButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    setTimeout(() => {
      submitButton.disabled = false;
      submitButton.textContent = defaultButtonText;
      form.reset();
      alert(successMessage);
      if (form === bookingForm && bookingFormNote) {
        bookingFormNote.textContent = defaultBookingNote;
      }
    }, 900);
  });
};

if (bookingForm) {
  simulateSubmission(bookingForm, 'Thank you! Our concierge team will confirm availability shortly.');
}

if (contactForm) {
  simulateSubmission(contactForm, 'Your enquiry has been received. We will respond within 15 minutes.');
}

if (newsletterForm) {
  simulateSubmission(newsletterForm, 'Welcome to the insider list! Expect curated offers soon.');
}

fleetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const model = button.dataset.model;
    const vehicleClass = button.dataset.class;

    if (bookingForm) {
      window.scrollTo({ top: bookingForm.offsetTop - 80, behavior: 'smooth' });

      const select = bookingForm.querySelector('select[name="class"]');
      if (select && vehicleClass) {
        select.value = vehicleClass;
      }

      const note = bookingForm.querySelector('.form-note');
      if (note && model) {
        note.textContent = `${model} selected. Concierge will share upgrade options after booking.`;
      }
    }
  });
});

const observerOptions = {
  threshold: 0.15,
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

const revealElements = document.querySelectorAll(
  '.hero-content, .hero-card, .fleet-card, .experience-copy, .experience-list li, .offer-card, .testimonial-card, .insight-card, .contact-copy, .contact-form, .newsletter-card',
);

revealElements.forEach((element) => {
  element.classList.add('will-reveal');
  revealObserver.observe(element);
});
