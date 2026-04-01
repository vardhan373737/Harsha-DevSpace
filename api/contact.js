const rateBucket = new Map();

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 5;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const previous = rateBucket.get(ip) || [];
  const recent = previous.filter((ts) => now - ts < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX_REQUESTS) {
    rateBucket.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateBucket.set(ip, recent);
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (error) {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const message = String(body.message || "").trim();
  const website = String(body.website || "").trim();
  const consent = Boolean(body.consent);
  const formLoadedAt = Number(body.formLoadedAt || 0);

  if (website) {
    return res.status(400).json({ error: "Spam check failed." });
  }

  if (!consent) {
    return res.status(400).json({ error: "Consent is required." });
  }

  if (!formLoadedAt || Date.now() - formLoadedAt < 3000) {
    return res.status(400).json({ error: "Form submitted too quickly." });
  }

  if (name.length < 2) {
    return res.status(400).json({ error: "Invalid name." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email." });
  }

  if (message.length < 10) {
    return res.status(400).json({ error: "Message is too short." });
  }

  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number." });
  }

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return res.status(501).json({
      error: "Backend contact endpoint is active but mail provider is not configured.",
      setup: [
        "Set EMAILJS_SERVICE_ID",
        "Set EMAILJS_TEMPLATE_ID",
        "Set EMAILJS_PUBLIC_KEY",
        "Optional: EMAILJS_PRIVATE_KEY"
      ]
    });
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      name,
      email,
      phone,
      message
    }
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  try {
    const providerResponse = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!providerResponse.ok) {
      const providerText = await providerResponse.text();
      return res.status(502).json({ error: "Mail provider rejected request.", detail: providerText.slice(0, 180) });
    }

    return res.status(200).json({ ok: true, message: "Message sent successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to send message.", detail: String(error.message || error) });
  }
};
