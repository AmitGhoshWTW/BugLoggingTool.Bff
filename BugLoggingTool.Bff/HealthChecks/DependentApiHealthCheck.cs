using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BugLoggingTool.Bff.HealthChecks
{
    public class DependentApiHealthCheck : IHealthCheck
    {
        private readonly IWebHostEnvironment _env;

        public DependentApiHealthCheck(IWebHostEnvironment env)
        {
            _env = env;
        }

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default(CancellationToken))
        {
            // TODO: An http request to another service's /health endpoint
            return Task.FromResult(HealthCheckResult.Unhealthy("Not yet implemented"));
        }
    }
}
