# HIGHPPER private requests

This project uses a Cloudflare Worker with D1 for private request intake.

## Deploy

1. Create a D1 database named `highpper-requests`.
2. Put its ID in `wrangler.toml`.
3. Apply `schema.sql` with Wrangler:

```powershell
npx wrangler d1 execute highpper-requests --remote --file=./schema.sql
```

4. Set the secrets:

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put FROM_EMAIL
npx wrangler secret put NOTIFICATION_WEBHOOK_URL
```

`FROM_EMAIL` must be an email address from a domain verified in Resend. `NOTIFICATION_WEBHOOK_URL` is optional for the Worker API. The public form currently opens a pre-filled Gmail compose window addressed to `highpper1@gmail.com`; the visitor presses Send in Gmail to finish. Keep the Resend key and webhook URL out of the HTML.

5. Deploy:

```powershell
npx wrangler deploy
```

The public form opens Gmail with the completed request. The Worker API at `/api/requests` remains available for a future server-side submission flow.

## Security model

The implemented default is the standard server-side model:

- HTTPS/TLS protects data in transit.
- D1 is not publicly exposed; only the Worker reads it.
- Input is length-limited, trimmed, control-character stripped, and angle-bracket stripped before storage.
The page currently uses this standard model. True E2EE is not enabled by default: it requires generating and securely storing an owner key pair, publishing only the public key to the client, adding encrypted payload storage, and decrypting only inside a separate owner-controlled browser session. Do not claim true E2EE until that key-management flow is deployed and tested.
