import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ════════════════════════════════════════
// Types
// ════════════════════════════════════════

interface IgResult {
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  authorName?: string;
}

interface ProviderResult {
  provider: string;
  data: IgResult | null;
  error?: string;
}

// ════════════════════════════════════════
// Common fetch headers (mobile UA to avoid blocks)
// ════════════════════════════════════════

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════

function isInstagramUrl(input: string): { valid: boolean; type: string } {
  try {
    const url = new URL(input);
    if (!url.hostname.includes("instagram.com")) return { valid: false, type: "unknown" };
    const p = url.pathname.toLowerCase();
    if (p.includes("/reel/")) return { valid: true, type: "reel" };
    if (p.includes("/p/")) return { valid: true, type: "post" };
    if (p.includes("/tv/")) return { valid: true, type: "tv" };
    if (p.includes("/stories/")) return { valid: true, type: "story" };
    return { valid: true, type: "post" };
  } catch {
    return { valid: false, type: "invalid" };
  }
}

function pickBest(html: string): string | null {
  // Priority: highest quality .mp4 URL
  const urls = [...html.matchAll(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi)];
  const candidates = urls.map((m) => m[0]);
  // Prefer ones without "progressive" or "low" keywords
  const good = candidates.filter((u) => !u.includes("low") && !u.includes("_a1.") && !u.includes("profile_pic"));
  if (good.length > 0) return good[good.length - 1]; // last one = usually highest quality
  return candidates[0] || null;
}

function pickThumbnail(html: string): string | null {
  const jpgMatch = html.match(/https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|webp)[^"'\s<>"]*/i);
  return jpgMatch ? jpgMatch[0] : null;
}

// ════════════════════════════════════════
// Provider 1: snapinsta.app
// ════════════════════════════════════════

async function trySnapinsta(igUrl: string): Promise<ProviderResult> {
  try {
    // Step 1: POST to ajaxSearch
    const formBody = new URLSearchParams({
      q: igUrl,
      t: "media",
      lang: "en",
    }).toString();

    const res1 = await fetch("https://snapinsta.app/api/ajaxSearch", {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": DESKTOP_UA,
        "Origin": "https://snapinsta.app",
        "Referer": "https://snapinsta.app/",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!res1.ok) return { provider: "snapinsta", data: null, error: `HTTP ${res1.status}` };

    const data1 = await res1.json();
    const htmlRaw = (data1 as Record<string, unknown>).data as string;
    if (!htmlRaw) return { provider: "snapinsta", data: null, error: "no data field" };

    // Parse download links from HTML response
    const linkMatches = [...htmlRaw.matchAll(/href="([^"]+)"/gi)];
    const downloadLinks = linkMatches.map((m) => m[1]).filter((l) => l.includes("snapinsta") && l.includes("download"));

    if (downloadLinks.length === 0) {
      // Try extracting direct video URL from the HTML
      const videoUrl = pickBest(htmlRaw);
      if (videoUrl) {
        return {
          provider: "snapinsta",
          data: {
            videoUrl,
            thumbnailUrl: pickThumbnail(htmlRaw) || undefined,
          },
        };
      }
      return { provider: "snapinsta", data: null, error: "no download links found" };
    }

    // Step 2: Follow the first download link to get the actual video URL
    const downloadUrl = downloadLinks[0];
    const res2 = await fetch(downloadUrl, {
      headers: { ...BASE_HEADERS, "User-Agent": DESKTOP_UA, "Referer": "https://snapinsta.app/" },
      signal: AbortSignal.timeout(10000),
      redirect: "manual", // Don't follow redirect, get the Location header
    });

    // Check redirect location
    const location = res2.headers.get("location");
    if (location && (location.includes(".mp4") || location.includes("video"))) {
      return {
        provider: "snapinsta",
        data: {
          videoUrl: location,
          thumbnailUrl: pickThumbnail(htmlRaw) || undefined,
        },
      };
    }

    // If no redirect, try parsing the page for video URL
    const res2Text = await res2.text();
    const directVideo = pickBest(res2Text);
    if (directVideo) {
      return {
        provider: "snapinsta",
        data: {
          videoUrl: directVideo,
          thumbnailUrl: pickThumbnail(res2Text) || undefined,
        },
      };
    }

    return { provider: "snapinsta", data: null, error: "could not resolve download link" };
  } catch (e) {
    return { provider: "snapinsta", data: null, error: String(e) };
  }
}

// ════════════════════════════════════════
// Provider 2: indown.io
// ════════════════════════════════════════

async function tryIndown(igUrl: string): Promise<ProviderResult> {
  try {
    const formBody = new URLSearchParams({
      url: igUrl,
    }).toString();

    const res = await fetch("https://indown.io/download", {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": DESKTOP_UA,
        "Origin": "https://indown.io",
        "Referer": "https://indown.io/",
      },
      body: formBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { provider: "indown", data: null, error: `HTTP ${res.status}` };

    const html = await res.text();
    const videoUrl = pickBest(html);
    if (videoUrl) {
      return {
        provider: "indown",
        data: {
          videoUrl,
          thumbnailUrl: pickThumbnail(html) || undefined,
        },
      };
    }
    return { provider: "indown", data: null, error: "no video found" };
  } catch (e) {
    return { provider: "indown", data: null, error: String(e) };
  }
}

// ════════════════════════════════════════
// Provider 3: ddinstagram.com
// ════════════════════════════════════════

async function tryDdinstagram(igUrl: string): Promise<ProviderResult> {
  try {
    const ddUrl = igUrl.replace(/instagram\.com/gi, "ddinstagram.com");

    const res = await fetch(ddUrl, {
      headers: { ...BASE_HEADERS, "User-Agent": MOBILE_UA },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return { provider: "ddinstagram", data: null, error: `HTTP ${res.status}` };

    const html = await res.text();

    // ddinstagram wraps video in <video><source src="...">
    const sourceMatch = html.match(/<source\s+[^>]*src=["']([^"']+)["']/i);
    if (sourceMatch) {
      return {
        provider: "ddinstagram",
        data: {
          videoUrl: sourceMatch[1],
          thumbnailUrl: pickThumbnail(html) || undefined,
        },
      };
    }

    // Direct .mp4 link
    const videoUrl = pickBest(html);
    if (videoUrl) {
      return {
        provider: "ddinstagram",
        data: { videoUrl, thumbnailUrl: pickThumbnail(html) || undefined },
      };
    }

    return { provider: "ddinstagram", data: null, error: "no video source found" };
  } catch (e) {
    return { provider: "ddinstagram", data: null, error: String(e) };
  }
}

// ════════════════════════════════════════
// Provider 4: fastdl.app
// ════════════════════════════════════════

async function tryFastdl(igUrl: string): Promise<ProviderResult> {
  try {
    const formBody = new URLSearchParams({
      q: igUrl,
      t: "media",
      lang: "en",
    }).toString();

    const res = await fetch("https://fastdl.app/api/ajaxSearch", {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": DESKTOP_UA,
        "Origin": "https://fastdl.app",
        "Referer": "https://fastdl.app/",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { provider: "fastdl", data: null, error: `HTTP ${res.status}` };

    const data = await res.json();
    const htmlRaw = (data as Record<string, unknown>).data as string;
    if (!htmlRaw) return { provider: "fastdl", data: null, error: "no data field" };

    const videoUrl = pickBest(htmlRaw);
    if (videoUrl) {
      return {
        provider: "fastdl",
        data: {
          videoUrl,
          thumbnailUrl: pickThumbnail(htmlRaw) || undefined,
        },
      };
    }
    return { provider: "fastdl", data: null, error: "no video link parsed" };
  } catch (e) {
    return { provider: "fastdl", data: null, error: String(e) };
  }
}

// ════════════════════════════════════════
// Provider 5: sssinstagram.com (JSON API)
// ════════════════════════════════════════

async function trySssinstagram(igUrl: string): Promise<ProviderResult> {
  try {
    const res = await fetch("https://sssinstagram.com/api/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": DESKTOP_UA,
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://sssinstagram.com",
        "Referer": "https://sssinstagram.com/zh",
      },
      body: JSON.stringify({ target_url: igUrl }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return { provider: "sssinstagram", data: null, error: `HTTP ${res.status}` };

    const data = await res.json();
    const resp = data as Record<string, unknown>;

    if (!resp.success) {
      return { provider: "sssinstagram", data: null, error: (resp.message as string) || "API returned failure" };
    }

    // Response contains HTML with download links
    const responseHtml = (resp.response as string) || "";
    const videoUrl = pickBest(responseHtml);

    if (videoUrl) {
      return {
        provider: "sssinstagram",
        data: {
          videoUrl,
          thumbnailUrl: pickThumbnail(responseHtml) || undefined,
        },
      };
    }

    // Try to find download button links
    const linkMatch = responseHtml.match(/href="(https?:\/\/[^"]+download[^"]+)"/i);
    if (linkMatch) {
      // Follow the download redirect to get actual video
      try {
        const dlRes = await fetch(linkMatch[1], {
          headers: { "User-Agent": DESKTOP_UA, "Referer": "https://sssinstagram.com/" },
          signal: AbortSignal.timeout(10000),
          redirect: "manual",
        });
        const location = dlRes.headers.get("location");
        if (location) {
          return {
            provider: "sssinstagram",
            data: {
              videoUrl: location,
              thumbnailUrl: pickThumbnail(responseHtml) || undefined,
            },
          };
        }
      } catch { /* redirect failed */ }
    }

    return { provider: "sssinstagram", data: null, error: "could not extract video from response" };
  } catch (e) {
    return { provider: "sssinstagram", data: null, error: String(e) };
  }
}

// ════════════════════════════════════════
// Provider 6: Direct Instagram (try mobile UA first)
// ════════════════════════════════════════

async function tryDirectInstagram(igUrl: string): Promise<ProviderResult> {
  try {
    const res = await fetch(igUrl, {
      headers: {
        ...BASE_HEADERS,
        "User-Agent": MOBILE_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return { provider: "instagram-direct", data: null, error: `HTTP ${res.status}` };

    const html = await res.text();

    // og:video
    const ogVideoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);
    if (ogVideoMatch) {
      const videoUrl = ogVideoMatch[1].replace(/&amp;/g, "&");

      // caption from og:title
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      let caption = ogTitleMatch ? ogTitleMatch[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'") : undefined;

      // author name
      let authorName: string | undefined;
      if (caption) {
        const idx = caption.indexOf(" on Instagram");
        if (idx > 0) {
          authorName = caption.substring(0, idx);
          caption = undefined; // not useful as caption
        }
      }

      // thumbnail
      const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      const thumbnailUrl = ogImgMatch ? ogImgMatch[1].replace(/&amp;/g, "&") : undefined;

      return {
        provider: "instagram-direct",
        data: { videoUrl, thumbnailUrl, caption, authorName },
      };
    }

    // __NEXT_DATA__ approach
    const videoUrlMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
    if (videoUrlMatch) {
      const videoUrl = videoUrlMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      return {
        provider: "instagram-direct",
        data: { videoUrl, thumbnailUrl: pickThumbnail(html) || undefined },
      };
    }

    // Any .mp4
    const mp4 = pickBest(html);
    if (mp4) {
      return {
        provider: "instagram-direct",
        data: { videoUrl: mp4, thumbnailUrl: pickThumbnail(html) || undefined },
      };
    }

    return { provider: "instagram-direct", data: null, error: "no video found in page" };
  } catch (e) {
    return { provider: "instagram-direct", data: null, error: String(e) };
  }
}

// ════════════════════════════════════════
// API Handler
// ════════════════════════════════════════

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const inputUrl = (body.url || "").trim();

    if (!inputUrl) {
      return NextResponse.json({ success: false, error: "请输入 Instagram 链接" }, { status: 400 });
    }

    const { valid } = isInstagramUrl(inputUrl);
    if (!valid) {
      return NextResponse.json({ success: false, error: "不是有效的 Instagram 链接，请检查后重试" }, { status: 400 });
    }

    // Race all providers — first to return a valid result wins
    const providers = [
      trySnapinsta(inputUrl),
      trySssinstagram(inputUrl),
      tryIndown(inputUrl),
      tryFastdl(inputUrl),
      tryDdinstagram(inputUrl),
      tryDirectInstagram(inputUrl),
    ];

    const results = await Promise.allSettled(providers);

    // Collect results
    const successes: ProviderResult[] = [];
    const failures: string[] = [];

    for (const r of results) {
      if (r.status === "fulfilled") {
        const pr = r.value as ProviderResult;
        if (pr.data && pr.data.videoUrl) {
          successes.push(pr);
        } else {
          failures.push(`${pr.provider}: ${pr.error || "no result"}`);
        }
      } else {
        failures.push(`rejected: ${r.reason}`);
      }
    }

    if (successes.length === 0) {
      console.log("[instagram] All providers failed:", failures);
      return NextResponse.json(
        {
          success: false,
          error: "所有解析服务均失败。请检查链接是否有效，或稍后重试。",
          debug: failures.slice(0, 3),
        },
        { status: 422 }
      );
    }

    // Use the first successful result
    const winner = successes[0];

    console.log(`[instagram] ✅ Resolved via ${winner.provider} (${successes.length} providers succeeded)`);

    return NextResponse.json({
      success: true,
      videoUrl: winner.data!.videoUrl,
      thumbnailUrl: winner.data!.thumbnailUrl || null,
      caption: winner.data!.caption || null,
      authorName: winner.data!.authorName || null,
      sourceUrl: inputUrl,
      provider: winner.provider,
    });
  } catch (error) {
    console.error("[instagram] Fatal error:", error);
    return NextResponse.json({ success: false, error: "服务器内部错误，请稍后重试" }, { status: 500 });
  }
}
