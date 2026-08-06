# Harvey — public front door

The site behind [ai.harveyio.com](https://ai.harveyio.com). It is a landing
page and a redirect, and nothing else.

- **Speak with Harvey** opens the public assistant on the main app.
- **Upgrade to a paid subscription** opens an email.
- Any `#/public/<id>` link opened here is sent to the assistant on the main app.

That last rule exists because links to this domain were shared widely under an
earlier version of the site, carrying an assistant id that no longer resolves
anywhere. Redirecting the whole route — rather than a list of known ids — means
those links keep working without anyone needing to be told a new address.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

Deploy `dist/` as static files. Routing is hash-based, so no server rewrite
rules are needed beyond serving `index.html` at `/`.

There is no backend, no database, no API key and no environment file. The site
holds two outbound URLs, both in [`src/config.ts`](src/config.ts), and talks to
nothing else.
