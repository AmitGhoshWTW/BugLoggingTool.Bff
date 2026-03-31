using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BugLoggingTool.Bff.HealthChecks
{
    public class DatabaseHealthCheck : IHealthCheck
    {
        private readonly IWebHostEnvironment _env;

        public DatabaseHealthCheck(IWebHostEnvironment env)
        {
            _env = env;
        }

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default(CancellationToken))
        {
            // TODO: Check that a connection can be opened and used.
            // It could run a simple "SELECT 1" query, or a query of "sys.tables" checking that one or more expected tables is present.
            // If a username and/or password is retrieved at runtime to make the connection, this check should also do that retrieval (bypassing any ephemeral cache).
            return Task.FromResult(HealthCheckResult.Unhealthy("Not yet implemented"));
        }
    }
}
