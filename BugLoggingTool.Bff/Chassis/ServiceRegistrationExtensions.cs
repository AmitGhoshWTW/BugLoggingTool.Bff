using System.Data;
using System.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;

namespace BugLoggingTool.Bff.Chassis
{
    public static class ServiceRegistrationExtensions
    {
        //public static IServiceCollection AddSqlConnection(this IServiceCollection services, string connectionString)
        //{
        //    services.AddScoped<IDbConnection>(sp =>
        //    {
        //        var sqlConnection = new SqlConnection();
        //        sqlConnection.ConnectionString = connectionString;
        //        return sqlConnection;
        //    });

        //    return services;
        //}
    }
}
