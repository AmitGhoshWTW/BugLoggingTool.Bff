using System.Diagnostics;
using System.IO;
using BugLoggingTool.Bff.Chassis;
using BugLoggingTool.Bff.HealthChecks;
using BugLoggingTool.Bff.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.CookiePolicy;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;

namespace BugLoggingTool.Bff
{
    public class Startup
    {
        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            Environment   = env;
        }

        public IConfiguration      Configuration { get; }
        public IWebHostEnvironment Environment   { get; }

        public void ConfigureServices(IServiceCollection services)
        {
//#if DEBUG
//            if (Environment.IsDevelopment())
//            {
//                // Start Vite dev server (hot reload) alongside .NET in development
//                StartViteDevServer(Path.Join(Environment.ContentRootPath, "FrontEnd"));
//            }
//#endif

#if DEBUG
            if (Environment.IsDevelopment() && !Environment.IsProduction())
            {
                // Only log, do not start Vite automatically
                Console.WriteLine("Running in Development mode. Start Vite manually with: npm run dev");
            }
#endif

#if DEBUG
            if (Environment.IsDevelopment() &&
                System.Environment.GetEnvironmentVariable("BLT_USE_VITE_HMR") == "true")
            {
                StartViteDevServer(Path.Join(Environment.ContentRootPath, "FrontEnd"));
            }
#endif
            // // Forward headers from Azure App Gateway
            // services.Configure<ForwardedHeadersOptions>(options =>
            // {
            //     options.ForwardedHostHeaderName  = ForwardedHeadersDefaults.XOriginalHostHeaderName;
            //     options.ForwardedProtoHeaderName = ForwardedHeadersDefaults.XForwardedProtoHeaderName;
            //     options.ForwardedHeaders         = ForwardedHeaders.All;
            //     options.KnownNetworks.Clear();
            //     options.KnownProxies.Clear();
            // });

            // Health checks (kept from template)
            //services.AddHealthChecks()
            //    .AddCheck<LivenessCheck>("Liveness",
            //        Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
            //        tags: ["basic"])
            //    //.AddCheck<KeyVaultHealthCheck>("keyvaultreadiness",
            //    //    failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
            //    //    tags: ["readiness"])
            //    //.AddCheck<DatabaseHealthCheck>("databasereadiness",
            //    //    failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
            //    //    tags: ["readiness"])
            //    .AddCheck<DependentApiHealthCheck>("dependentapireadiness",
            //        failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Unhealthy,
            //        tags: ["readiness"]);

            services.AddHealthChecks()
                .AddCheck<LivenessCheck>("Liveness");

            services.Configure<CookiePolicyOptions>(options =>
            {
                options.CheckConsentNeeded    = context => false;
                options.MinimumSameSitePolicy = SameSiteMode.None;
                options.HttpOnly              = HttpOnlyPolicy.Always;
                options.Secure                = CookieSecurePolicy.Always;
            });

            //services.AddApplicationInsightsTelemetry(Configuration);

            // -- NOTE: Authentication ---------------------------------------------
            // BLT uses CLIENT-SIDE MSAL (Azure AD SPA flow) - NOT server-side
            // OpenID Connect / FedAuth from the template. The React PWA handles
            // all auth via @azure/msal-browser. No server-side auth middleware needed.
            // Placeholder below - uncomment and configure if server-side auth is
            // required in a future phase:
            //
            // var fedAuthConfig = Configuration.GetSection("FedAuth").Get<AuthSettings>();
            // services.AddAuthentication()
            //     .AddCookie(...)
            //     .AddOpenIdConnect("FedAuth", options => { ... });

            services.AddControllers();

            // Allow Vite dev server origin during development (CORS)
            services.AddCors(options =>
            {
                options.AddPolicy("ViteDevPolicy", policy =>
                    policy.WithOrigins("http://localhost:5174", "http://localhost:4173")
                          .AllowAnyMethod()
                          .AllowAnyHeader());
            });
        }

#if DEBUG
        private void StartViteDevServer(string projectPath)
        {
            // In development, start Vite HMR server alongside .NET
            // Vite proxies to .NET for API calls via vite.config.js proxy setting
            var startinfo = new ProcessStartInfo("cmd")
            {
                WorkingDirectory        = projectPath,
                Arguments               = "/c npm run dev",
                UseShellExecute         = false,
                RedirectStandardOutput  = true,
                RedirectStandardError   = true,
            };
            var vite = Process.Start(startinfo);
            vite?.BeginOutputReadLine();
            vite?.BeginErrorReadLine();
        }
#endif

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseCors("ViteDevPolicy");
            }

            // app.UseForwardedHeaders();

            // -- BLT PWA cache headers --------------------------------------------
            // Must be BEFORE UseFileServer so headers are applied to static files.
            // Ensures index.html/sw.js/version.json are never cached (drives update
            // detection) and /assets/* are immutable (content-hashed by Vite).
            app.UseMiddleware<CacheHeaderMiddleware>();

            // Serve React PWA static files from wwwroot/
            // DefaultFiles maps / -> /index.html
            // app.UseFileServer();

            app.UseRouting();

            

            // Serve React PWA static files from wwwroot/
            // DefaultFiles maps / - /index.html
            app.UseDefaultFiles();
            app.UseStaticFiles();

            // API routes (JIRA placeholder + any future BFF endpoints)
            //app.MapControllers();

            // app.UseAuthentication();  // re-enable if server-side auth added
            // app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                // BLT API endpoints (JIRA placeholder + future BFF endpoints)
                endpoints.MapControllers();

                // Health checks (kept from template)
                endpoints.MapHealthChecks("/health", new HealthCheckOptions
                {
                    Predicate = check => check.Tags.Contains("basic")
                });
                endpoints.MapHealthChecks("/readiness", new HealthCheckOptions
                {
                    Predicate = check => check.Tags.Contains("readiness")
                });

                // SPA fallback - all unmatched routes return index.html
                // Allows React Router to handle client-side navigation
                endpoints.MapFallbackToFile("index.html");
            });
        }
    }
}
