const MAX_LENGTHS = {
  name: 120,
  email: 254,
  contact: 160,
  project: 160,
  'project-type': 40,
  budget: 40,
  needs: 5000,
  brand: 2000
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=UTF-8' }
});

function sanitize(value, maxLength) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizePayload(input) {
  return Object.fromEntries(Object.entries(MAX_LENGTHS).map(([key, maxLength]) => [key, sanitize(input[key], maxLength)]));
}

function validate(payload) {
  const required = ['name', 'email', 'project-type', 'budget', 'needs'];
  if (required.some((key) => !payload[key])) return 'Please complete all required fields.';
  if (!/^\S+@\S+\.\S+$/.test(payload.email)) return 'Please provide a valid email address.';
  if (!['Landing Page', 'Web App', 'E-commerce', 'Redesign'].includes(payload['project-type'])) return 'Choose a valid project type.';
  if (!['Budget-friendly', 'Premium'].includes(payload.budget)) return 'Choose a valid budget range.';
  return null;
}

function requestText(request) {
  return [
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Preferred contact: ${request.contact || 'Not provided'}`,
    `Project: ${request.project || 'Not provided'}`,
    `Project type: ${request['project-type']}`,
    `Budget: ${request.budget}`,
    `Style and scope:\n${request.needs}`,
    `Brand details:\n${request.brand || 'Not provided'}`
  ].join('\n\n');
}

async function notify(env, request) {
  const message = requestText(request);
  const notifications = [];

  if (env.RESEND_API_KEY && env.FROM_EMAIL) {
    notifications.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: ['highpper1@gmail.com'],
        reply_to: request.email,
        subject: `New HIGHPPER request: ${request.project || request.name}`,
        text: message
      })
    }));
  }

  if (env.NOTIFICATION_WEBHOOK_URL) {
    notifications.push(fetch(env.NOTIFICATION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: `New HIGHPPER request from ${request.name}`, requestId: request.id, email: request.email })
    }));
  }

  const responses = await Promise.all(notifications);
  const failed = responses.find((response) => !response.ok);
  if (failed) throw new Error(`Notification failed with status ${failed.status}`);
}

async function createRequest(request, env) {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    return json({ error: 'Automatic email delivery is not configured yet.' }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const payload = sanitizePayload(input);
  const validationError = validate(payload);
  if (validationError) return json({ error: validationError }, 400);

  const record = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  await env.DB.prepare(`INSERT INTO requests (id, name, email, contact, project, project_type, budget, needs, brand, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(record.id, record.name, record.email, record.contact, record.project, record['project-type'], record.budget, record.needs, record.brand, record.createdAt, record.status)
    .run();

  try {
    await notify(env, record);
  } catch (error) {
    console.error('Notification failed', error);
    return json({ error: 'Your request was saved, but email delivery failed. Please try again.' }, 502);
  }
  return json({ ok: true, id: record.id }, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/requests' && request.method === 'POST') return createRequest(request, env);
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found.', { status: 404 });
  }
};
