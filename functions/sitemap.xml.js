export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Production GCP Cloud Run backend origin
  const backendBase = "https://royal-book-club-api-250166080085.us-central1.run.app";
  const backendUrl = backendBase + "/sitemap.xml" + url.search;
  
  // Clone incoming request headers and append the validation token
  const newHeaders = new Headers(request.headers);
  
  // CLOUDFLARE_SECRET is retrieved securely from Cloudflare Pages Environment Variables
  const secret = env.CLOUDFLARE_SECRET;
  if (secret) {
    newHeaders.set("X-Cloudflare-Secret", secret);
  }
  
  const init = {
    method: "GET",
    headers: newHeaders,
    redirect: "manual"
  };
  
  try {
    const modifiedRequest = new Request(backendUrl, init);
    const response = await fetch(modifiedRequest);
    
    if (response.status === 200) {
      return response;
    }
    
    // If backend returns non-200, return a valid empty XML sitemap instead of raw JSON error
    const errorText = await response.text();
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<!-- Backend returned status ${response.status}: ${errorText.substring(0, 200)} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
      {
        status: response.status,
        headers: { "Content-Type": "application/xml" }
      }
    );
  } catch (err) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<!-- Proxy error: ${err.message} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
      {
        status: 502,
        headers: { "Content-Type": "application/xml" }
      }
    );
  }
}
