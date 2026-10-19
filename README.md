# Westbridge Elite School — Landing Page

Mashujaa Day campaign landing page (`index.html`) and post-registration page
(`thank-you.html`). Static HTML/CSS/JS, no build step; deploys to Netlify as-is.

```
index.html          landing page + Netlify form "westbridge-admissions"
thank-you.html      shown after submitting (fires the Meta Pixel Lead event)
assets/landing.css  shared styles (palette tokens live in each page's <style> block)
assets/landing.js   validation, Netlify submission, WhatsApp hand-off, Pixel, UTM capture
images/             logo and Mashujaa artwork cropped from the school's poster
netlify.toml        publish settings
```

## Deploying on Netlify

1. Netlify → **Add new site → Import an existing project → GitHub** → pick this repo
   and the branch holding this code. Build command: *(empty)*. Publish directory: `.`
2. **Site configuration → Forms → Enable form detection**, then **Deploys → Trigger deploy**.
3. Check **Forms** lists `westbridge-admissions`, and add an email notification for the admissions team.

## Settings (`window.LANDING`, top of both pages)

`phone`, `whatsapp` (international format, e.g. 2547XXXXXXXX), `waIntro`, `metaPixelId`,
`formEndpoint` (optional extra webhook), `campaign`. Elements marked `data-contact` are
filled from these and hidden while empty, so the page never shows a dead link.

## Confirm before publishing

Contact number, location, classes offered and fees are not on file. Fill `phone` and `whatsapp` in `window.LANDING` (both pages); until then phone/WhatsApp buttons stay hidden. Confirm the class list in the form.

Local preview: `python3 -m http.server 8080` (form submissions only work on Netlify).
