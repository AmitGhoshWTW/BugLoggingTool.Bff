// BugLoggingTool.Bff/Models/JiraCreateRequest.cs
// Matches payload built by React jiraService.js -> buildPayload()

namespace BugLoggingTool.Bff.Models;

public class JiraCreateRequest
{
    public string   ReportId    { get; set; } = string.Empty;
    public Reporter Reporter    { get; set; } = new();
    public string   Category    { get; set; } = string.Empty;
    public string   Description { get; set; } = string.Empty;
    public string   CreatedAt   { get; set; } = string.Empty;
    public object?  Metadata    { get; set; }
    public List<ScreenshotAttachment> Screenshots { get; set; } = new();
    public List<LogFileAttachment>    LogFiles    { get; set; } = new();
}

public class Reporter
{
    public string Name       { get; set; } = string.Empty;
    public string Email      { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
}

public class ScreenshotAttachment
{
    public string Id       { get; set; } = string.Empty;
    public string Base64   { get; set; } = string.Empty;
    public string MimeType { get; set; } = "image/png";
}

public class LogFileAttachment
{
    public string  Id            { get; set; } = string.Empty;
    public string  Filename      { get; set; } = string.Empty;
    public string? ContentBase64 { get; set; }
    public long    Filesize      { get; set; }
}
