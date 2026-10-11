# Makeup Artist Studio Website

Elegant single-page website for a makeup artist / blouse designer / embroidery studio.

- **Public site** (`/`) — one page with smooth scrolling: Home, About, Services, Gallery (filter + lightbox), Reviews (rating + optional photo), Contact + Instagram.
- **Admin page** (`/admin`) — password-protected: edit all text & photos, manage services, upload/delete gallery images, moderate reviews, read contact messages.
- **Stack** — MongoDB Atlas (data) · Cloudinary (images) · Vercel (hosting + serverless API). No build step.

```
public/            static site (index.html, admin.html, css/, js/)
api/               Vercel serverless functions (Node, ESM)
lib/               db / auth / cloudinary helpers + default content
```

## 1. Set up MongoDB Atlas
1. Create a free cluster at <https://cloud.mongodb.com>.
2. **Database Access** → add a user + password.
3. **Network Access** → add `0.0.0.0/0` (Vercel uses dynamic IPs).
4. **Connect → Drivers** → copy the connection string (`MONGODB_URI`).

Collections (`content`, `services`, `gallery`, `reviews`, `messages`) are created automatically.

## 2. Set up Cloudinary
Dashboard → copy **Cloud name**, **API key**, **API secret**.
Uploads go straight from the browser to Cloudinary using a short-lived signature, so the secret never leaves the server.

## 3. Deploy on Vercel
1. Push this folder to a GitHub repo (or run `npx vercel` in the folder).
2. Import the repo in Vercel — leave framework as **Other**, no build command.
3. Add these **Environment Variables** (see `.env.example`):

| Name | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | `makeup_studio` (any name) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from Cloudinary |
| `ADMIN_PASSWORD` | the password you will log in with |
| `JWT_SECRET` | any long random string |

4. Deploy. Visit `/admin`, sign in, and fill in **Site Content**.

### Run locally
```bash
npm install
npm i -g vercel
cp .env.example .env.local   # fill in values
vercel dev
```

## Using the admin (`/admin`)
- **Site Content** — brand name, headline, photos, about text, phone / WhatsApp / email / hours, Instagram link, highlight numbers, and whether new reviews publish instantly or wait for approval.
- **Services** — add/edit/delete cards (click *Add starter services* the first time to edit the examples).
- **Gallery** — upload many photos at once with a category; categories become filter buttons.
- **Reviews** — see every review; **Hide/Publish** or **Delete** (the photo is removed from Cloudinary too).
- **Messages** — contact-form enquiries with Call / WhatsApp buttons.

## Reviews
Visitors enter name, star rating and text; a photo is optional. Images are resized in the browser before upload. Spam protection: hidden honeypot field, per-IP rate limits, server-side validation, and images accepted only from your own Cloudinary account.

## Notes
- Until the database is connected the site still renders with starter content.
- Rate limiting is in-memory per serverless instance (good against casual spam). For heavy traffic add Vercel Firewall / Upstash.
- Change the fonts in the `<link>` tag of `index.html` and the `--serif` / `--sans` variables in `public/css/style.css`; colours are the variables at the top of the same file.
