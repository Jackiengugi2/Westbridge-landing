# Westbridge Elite School — Meta Ads Landing Page

Form-first landing page for Meta ads: logo header, a one-line headline, then the form.
`thank-you.html` is shown after submitting and fires the Meta Pixel `Lead` event.
Static HTML/CSS/JS, no build step.

```
index.html          landing page + Netlify form "westbridge-admissions"
thank-you.html      post-submit page with WhatsApp hand-off
assets/landing.css  shared styles (school palette lives in each page's <style> block)
assets/landing.js   validation, Netlify submission, WhatsApp hand-off, Pixel, UTM capture
images/logo.png     school logo
netlify.toml        publish settings
```

## Settings (`window.LANDING`, top of both pages)

| Key | Value |
|---|---|
| `phone` / `whatsapp` | 0797 732 943 / 254797732943 |
| `campaign` | `WBE_LEAD_LP_Admissions_PROS_OCT26` (playbook naming: CLIENT_OBJ_DEST_SEGMENT_LAYER_MMMYY) |
| `metaPixelId` | empty: add the Pixel ID on both pages |
| `formEndpoint` | optional extra webhook (Privyr / Google Sheet) |

Ad links should carry `utm_source=meta&utm_campaign=<Ads Manager name>`; the form saves
every `utm_*` value and `fbclid` with the enquiry.

## Netlify

Publish directory `.`, no build command. Enable **Forms** and check `westbridge-admissions` is listed;
add an email notification under **Forms → Form notifications**.

## Notes

Location, classes offered and fees are not on file; confirm the class list in the form.

Local preview: `python3 -m http.server 8080` (form submissions only work on Netlify).
