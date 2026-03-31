// BugLoggingTool.Bff/Controllers/JiraController.cs
//
// PLACEHOLDER - JIRA integration controller.
// All endpoints return 501 Not Implemented.
//
// Payload from React jiraService.js -> buildPayload():
//   { reportId, reporter, category, description, createdAt, metadata, screenshots[], logFiles[] }
//
// Expected response by React jiraService.js:
//   { success: true, key: "BLT-123", url: "https://yourorg.atlassian.net/browse/BLT-123" }
//
// To retrofit (Phase 2):
//   1. Add PackageReference for Atlassian SDK or HttpClient JIRA REST calls
//   2. Add Jira:BaseUrl / Jira:ApiToken to appsettings.json + Key Vault
//   3. Create IJiraService + JiraService
//   4. Register in Startup.cs ConfigureServices
//   5. Replace NotImplemented responses below

using BugLoggingTool.Bff.Models;
using Microsoft.AspNetCore.Mvc;

namespace BugLoggingTool.Bff.Controllers;

[ApiController]
[Route("api/jira")]
public class JiraController(ILogger<JiraController> logger) : ControllerBase
{
    // POST /api/jira/create  <-- called by React jiraService.js -> sendReportToJira()
    [HttpPost("create")]
    public IActionResult CreateTicket([FromBody] JiraCreateRequest request)
    {
        logger.LogInformation("[JIRA Placeholder] CreateTicket: {ReportId}", request.ReportId);

        return StatusCode(501, new
        {
            success  = false,
            error    = "JIRA integration not yet implemented. Retrofit JiraController.cs to complete.",
            reportId = request.ReportId
        });
    }

    // POST /api/jira/bulk  <-- called by React jiraService.js -> sendBulkToJira()
    [HttpPost("bulk")]
    public IActionResult CreateBulk([FromBody] List<JiraCreateRequest> requests)
    {
        logger.LogInformation("[JIRA Placeholder] BulkCreate: {Count} reports", requests.Count);

        return StatusCode(501, new
        {
            success = false,
            error   = "JIRA bulk not yet implemented.",
            count   = requests.Count
        });
    }

    // GET /api/jira/health  <-- connectivity check
    [HttpGet("health")]
    public IActionResult Health() =>
        Ok(new { status = "placeholder", implemented = false });
}
