export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Production GCP Cloud Run backend origin
  const backendBase = "https://royal-book-club-api-250166080085.us-central1.run.app";
  const backendUrl = backendBase + url.pathname + url.search;
  
  // Clone incoming request headers and append the validation token
  const newHeaders = new Headers(request.headers);
  
  // CLOUDFLARE_SECRET is retrieved securely from Cloudflare Pages Environment Variables
  const secret = env.CLOUDFLARE_SECRET;
  if (secret) {
    newHeaders.set("X-Cloudflare-Secret", secret);
  }
  
  const init = {
    method: request.method,
    headers: newHeaders,
    redirect: "manual"
  };
  
  // Only pass request body for mutating HTTP methods (POST, PUT, PATCH, DELETE)
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }
  
  try {
    const modifiedRequest = new Request(backendUrl, init);
    return await fetch(modifiedRequest);
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to proxy request to the backend API origin.",
        error: err.message
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
