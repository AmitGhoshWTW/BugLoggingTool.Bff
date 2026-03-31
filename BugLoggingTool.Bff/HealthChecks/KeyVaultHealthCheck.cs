using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BugLoggingTool.Bff.HealthChecks
{
    public class KeyVaultHealthCheck : IHealthCheck
    {
        private readonly IWebHostEnvironment _env;

        public KeyVaultHealthCheck(IWebHostEnvironment env)
        {
            _env = env;
        }

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default(CancellationToken))
        {
            // TODO: Ensure that a required secret is available in KeyVault
            return Task.FromResult(HealthCheckResult.Unhealthy("Not yet implemented"));
        }
    }
}
