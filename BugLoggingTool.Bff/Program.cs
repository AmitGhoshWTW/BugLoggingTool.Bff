using System;
using System.IO;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;
using BugLoggingTool.Bff.Chassis;

namespace BugLoggingTool.Bff
{
    public class Program
    {
        public static IConfiguration Configuration { get; private set; }

        public static int Main(string[] args)
        {
            var configBuilder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddEnvironmentVariables();

            Configuration = configBuilder.Build();

            Serilog.Debugging.SelfLog.Enable(Console.Error);

            Log.Logger = new LoggerConfiguration()
                .ConfigureLogging(Configuration)
                .CreateLogger();

            var programlogger = Log.ForContext<Program>();
            programlogger.Information("BLT BFF starting...");

            programlogger.Information("Current Directory: {dir}", Directory.GetCurrentDirectory());
            programlogger.Information("ASPNETCORE_ENVIRONMENT: {env}", Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"));

            try
            {
                // CreateHostBuilder(args).Build().Run();
                var hostBuilder = CreateHostBuilder(args);

                Console.WriteLine("Host building...");
                var host = hostBuilder.Build();

                Console.WriteLine("Host built. Starting...");
                host.Run();

                Console.WriteLine("Host started.");
                programlogger.Information("BLT BFF exiting normally");
            }
            catch (Exception ex)
            {
                programlogger.Fatal(ex, "BLT BFF terminated unexpectedly.");
                return 1;
            }
            finally
            {
                Log.CloseAndFlush();
            }

            return 0;
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                    webBuilder.UseConfiguration(Configuration);
                    // Specifying WebRoot ensures wwwroot is created on startup if missing
                    // and files added later (by Vite build) are served automatically
                    webBuilder.UseWebRoot("wwwroot");
                })
                .UseSerilog();
    }
}
