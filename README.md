# Sandy Labs

Starting point for the new Sandy Labs cinematic scroll website. The previous homepage
(hero, intro film, questionnaire, examples, sections, header/footer) was removed in a
frontend reset; the homepage is now an empty white page. The full previous version is kept
on the `backup/pre-frontend-reset` branch.

Built with Next.js (App Router), React, TypeScript and Tailwind CSS v4.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Structure

```
app/layout.tsx     root layout (metadata, global styles)
app/page.tsx       homepage (empty)
app/globals.css    Tailwind import and a white page background
public/media/      media from the previous site, kept but not used (hero art, intro videos)
scripts/intro/     pipeline that built the previous intro videos from the source footage
```

## What is (and isn't) connected

There is no backend yet: no API routes, database, authentication or environment variables.
