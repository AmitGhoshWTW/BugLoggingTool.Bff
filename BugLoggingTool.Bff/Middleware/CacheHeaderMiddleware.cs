// BugLoggingTool.Bff/Middleware/CacheHeaderMiddleware.cs
//
// Applies cache headers required by the BLT 6-layer PWA update system.
//
//   index.html, sw.js, version.json  -> no-store   (must always be fresh)
//   /assets/*                         -> immutable  (content-hashed by Vite)
//   /icons/*                          -> 7 days
//   API routes                        -> skipped    (no cache header override)

namespace BugLoggingTool.Bff.Middleware;

public class CacheHeaderMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> NoCacheFiles =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "/index.html",
            "/",
            "/sw.js",
            "/version.json",
            "/manifest.json"
        };

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        context.Response.OnStarting(() =>
        {
            ApplyCacheHeader(context, path);
            return Task.CompletedTask;
        });

        await next(context);
    }

    private static void ApplyCacheHeader(HttpContext context, string path)
    {
        // Skip API and health routes
        if (path.StartsWith("/api/",      StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/health",    StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/readiness", StringComparison.OrdinalIgnoreCase))
            return;

        if (NoCacheFiles.Contains(path) || path == string.Empty)
        {
            // Never cache - drives SW update detection + version.json polling
            context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
            context.Response.Headers.Pragma        = "no-cache";
            context.Response.Headers.Expires       = "0";
        }
        else if (path.StartsWith("/assets/", StringComparison.OrdinalIgnoreCase))
        {
            // Content-hashed by Vite - filename changes every build, safe to cache forever
            context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
        else if (path.StartsWith("/icons/", StringComparison.OrdinalIgnoreCase))
        {
            // Icons rarely change - 7-day cache
            context.Response.Headers.CacheControl = "public, max-age=604800";
        }
        else
        {
            // Safe default for anything else
            context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        }
    }
}
