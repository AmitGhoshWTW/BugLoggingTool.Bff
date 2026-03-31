using Microsoft.Net.Http.Headers;

public static class LoadTestSlotExtensions {
    /// <summary>
    /// <description>
    /// This extension method adds the LoadTestSlotMessageHandler to the HttpClientBuilder.
    /// An HttpClient must be added to the service collection as either a typed or named client.
    /// </description>
    /// <example>
    /// <code>
    /// // Example 1: Add a typed HttpClient to the service collection and add the LoadTestSlotMessageHandler.
    /// builder.Services
    /// <br/>.AddTransient&lt;WeatherForecastService&gt;()
    /// <br/>.AddHttpClient&lt;WeatherForecastService&gt;()
    /// <br/>.AddLoadTestSlotHandler();
    /// </code>
    /// <code>
    /// // Example 2: Add a typed HttpClient via interface to the service collection and add the LoadTestSlotMessageHandler.
    /// builder.Services
    /// <br/>.AddTransient&lt;IWeatherForecastService, WeatherForecastService&gt;()
    /// <br/>.AddHttpClient&lt;IWeatherForecastService, WeatherForecastService&gt;()
    /// <br/>.AddLoadTestSlotHandler();
    /// </code>
    /// <code>
    /// // Example 3: Add a named HttpClient to the service collection and add the LoadTestSlotMessageHandler.
    /// builder.Services
    /// <br/>.AddTransient&lt;WeatherForecastService&gt;()
    /// <br/>.AddHttpClient("LoadTestHttpClient")
    /// <br/>.AddLoadTestSlotHandler();
    /// </code>
    /// </example>
    /// </summary>
    /// <returns>
    /// The builder object that was given to for extension.
    /// </returns>
    /// <param name="builder">
    /// The builder object that this method is extending.
    /// </param>
    public static IHttpClientBuilder AddLoadTestSlotHandler(this IHttpClientBuilder builder){
        builder.Services
            .AddTransient<LoadTestSlotMessageHandler>()
            .AddHttpContextAccessor();
        return builder.AddHttpMessageHandler<LoadTestSlotMessageHandler>();
    }
}

/// <summary>
/// This class is a DelegatingHandler that adds the x-ms-routing-name cookie if the slot name is `loadtest` to the request headers.
/// </summary>
public class LoadTestSlotMessageHandler : DelegatingHandler
{
    private const string RoutingCookieName = "x-ms-routing-name";
    private const string LoadTestCookieValue = "loadtest";
    private const string StageMktpHost = "api.stage.mktp.io";
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LoadTestSlotMessageHandler(IHttpContextAccessor httpContextAccessor){
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (_httpContextAccessor.HttpContext == null)
            return base.SendAsync(request, cancellationToken);

        var routingCookie = _httpContextAccessor.HttpContext.Request.Cookies
            .SingleOrDefault(c => c.Key.ToLower() == RoutingCookieName);

        var cookie = request.RequestUri != null &&
            request.RequestUri.Host.ToLower().Contains(StageMktpHost) &&
            routingCookie.Key != null &&
            routingCookie.Value.ToLower() == LoadTestCookieValue ? $"{routingCookie.Key}={routingCookie.Value}"
            : null;

        if (cookie != null)
        {
            request.Headers.Add(HeaderNames.Cookie, cookie);
        }

        return base.SendAsync(request, cancellationToken);
    }
}
