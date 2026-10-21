"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { sectionIds } from "@/lib/navigation";
import { TextAreaField, TextField } from "../questionnaire/Field";
import { Reveal } from "../ui/Reveal";

type Values = { name: string; email: string; message: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Please enter your name.";
  if (!v.email.trim()) e.email = "Please enter your email address.";
  else if (!EMAIL_PATTERN.test(v.email.trim())) e.email = "That email address doesn't look quite right.";
  if (v.message.trim().length < 10) e.message = "Please write a message of at least 10 characters.";
  return e;
}

const empty: Values = { name: "", email: "", message: "" };

export function Contact() {
  const [values, setValues] = useState<Values>(empty);
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState<Values | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const errors = attempted ? validate(values) : {};
  const set = (key: keyof Values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(values);
    setAttempted(true);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`#contact-${first}`)?.focus();
      return;
    }
    setSubmitted(values);
    requestAnimationFrame(() => confirmRef.current?.focus());
  };

  const resetForm = () => {
    setValues(empty);
    setAttempted(false);
    setSubmitted(null);
  };

  return (
    <section id={sectionIds.contact} aria-labelledby="contact-title" className="bg-sand-50 py-24 sm:py-36">
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-14">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-lagoon-700">Contact</p>
          <h2
            id="contact-title"
            className="mt-5 font-display text-4xl leading-[1.05] font-light tracking-[-0.02em] text-balance sm:text-5xl lg:text-6xl"
          >
            Send word <span className="italic">across the water.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Questions about Sandy Labs, or about a project you have in mind? Leave a note.
          </p>
          <p className="mt-8 max-w-md border-l-2 border-sand-300 pl-4 text-sm leading-relaxed text-mist">
            This form is a preview. No email service is connected yet, so messages are checked here in your browser
            but not delivered anywhere.
          </p>
        </Reveal>

        <Reveal className="lg:col-span-6 lg:col-start-7" delay={120}>
          {submitted ? (
            <div
              ref={confirmRef}
              tabIndex={-1}
              role="status"
              className="animate-fade border border-ink/10 bg-white p-8 focus:outline-none sm:p-10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lagoon-700 text-sand-50">
                <Check aria-hidden className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <h3 className="mt-6 font-display text-3xl font-light tracking-[-0.02em]">
                Thank you, {submitted.name.trim().split(/\s+/)[0]}.
              </h3>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Your message passed validation. Because this is a demo and no email service is connected, it
                hasn&apos;t been sent — nobody will receive it yet.
              </p>
              <dl className="mt-6 grid gap-2 border-t border-ink/10 pt-6 text-sm">
                <div className="flex gap-4">
                  <dt className="w-20 shrink-0 text-mist">Email</dt>
                  <dd className="break-all">{submitted.email.trim()}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-20 shrink-0 text-mist">Message</dt>
                  <dd className="line-clamp-4 whitespace-pre-wrap">{submitted.message.trim()}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={resetForm}
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ink"
              >
                Write another message
              </button>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-7" aria-label="Contact form">
              <div className="grid gap-7 sm:grid-cols-2">
                <TextField
                  id="contact-name"
                  label="Name"
                  autoComplete="name"
                  value={values.name}
                  onChange={set("name")}
                  error={errors.name}
                  maxLength={100}
                />
                <TextField
                  id="contact-email"
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={set("email")}
                  error={errors.email}
                  maxLength={160}
                />
              </div>
              <TextAreaField
                id="contact-message"
                label="Message"
                rows={6}
                value={values.message}
                onChange={set("message")}
                error={errors.message}
                maxLength={2000}
              />
              <div>
                <button
                  type="submit"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-sand-50 transition-colors hover:bg-lagoon-900"
                >
                  Send message
                  <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
