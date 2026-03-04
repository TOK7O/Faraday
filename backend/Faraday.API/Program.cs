using System.Security.Cryptography;
using System.Text;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Faraday.API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Faraday.API.Services;
using Faraday.API.Services.Interfaces;
using Faraday.API.Workers;
using Faraday.API.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Log application startup
var startupLogger = LoggerFactory.Create(config => 
{
    config.AddConsole();
}).CreateLogger("Startup");

startupLogger.LogInformation("=== Faraday WMS API Starting ===");
startupLogger.LogInformation("Environment: {Environment}", builder.Environment.EnvironmentName);

Env.TraversePath().Load();

var testEnv = Environment.GetEnvironmentVariable("SMTP_SERVER");
Console.WriteLine($"[BOOTSTRAP] .env loaded. SMTP_SERVER found: {testEnv ?? "NULL"}");

startupLogger.LogInformation("Environment variables loaded successfully from .env file");

var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "faraday_db";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
var dbPass = Environment.GetEnvironmentVariable("DB_PASSWORD");

startupLogger.LogInformation("Database Host: {DbHost}", dbHost);

if (string.IsNullOrEmpty(dbPass))
{
    throw new InvalidOperationException("No password for the database inside .env!");
}

var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPass};SSL Mode=Require;Trust Server Certificate=true";

builder.Configuration["ConnectionStrings:DefaultConnection"] = connectionString;


// DB CONFIG
// Register Entity Framework Core context with PostgreSQL provider.
builder.Services.AddDbContext<FaradayDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Configuration["BACKUP_ENCRYPTION_KEY"] = Environment.GetEnvironmentVariable("BACKUP_ENCRYPTION_KEY");
builder.Configuration["BACKUP_ENCRYPTION_IV"] = Environment.GetEnvironmentVariable("BACKUP_ENCRYPTION_IV");

// Auth and JWT configuration
builder.Configuration["Jwt:Key"] = Environment.GetEnvironmentVariable("JWT_KEY") ?? throw new InvalidOperationException("JWT_KEY not found in environment");
builder.Configuration["Jwt:Issuer"] = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "FaradayServer";
builder.Configuration["Jwt:Audience"] = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "FaradayClient";
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing in configuration.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

startupLogger.LogInformation("JWT Authentication configured. Issuer: {Issuer}, Audience: {Audience}", 
    jwtIssuer, jwtAudience);

// Gemini API key loaded
builder.Configuration["Gemini:ApiKey"] = Environment.GetEnvironmentVariable("GEMINI_API_KEY");

// Configure the authentication service to use JWT Bearer tokens as the default scheme.
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Define parameters for validating incoming tokens.
    // IssuerSigningKey validation is critical to ensure the token was signed by this server.
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    // Konfiguracja pozwalająca SignalR na przesyłanie tokena w URL (Query String)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];

            // Jeśli zapytanie ma token i idzie do Huba (Logs lub Alerts)
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/hubs/logs") || path.StartsWithSegments("/hubs/alerts")))
            {
                // Przypisz token z URL do kontekstu autoryzacji
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});


builder.Services.AddControllers();

// Configure CORS
var clientUrl = Environment.GetEnvironmentVariable("CLIENT_APP_BASE_URL") ?? "http://localhost:5173";
Console.WriteLine($"[CORS] Allowing origin: {clientUrl}");
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            
            policy.WithOrigins(clientUrl, "http://localhost:5173", "http://localhost:3000")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSignalR();

// Configure Swagger generation to include support for JWT Bearer Authentication.
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Faraday WMS API", Version = "v1" });

    // Define the security scheme for the Swagger UI (Bearer token input).
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer [space] [token]'. Example: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    // Apply the defined security requirement globally to all endpoints.
    c.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer"),
            []
        }
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

builder.Services.Configure<EmailSettings>(options =>
{
    options.SMTP_SERVER = Environment.GetEnvironmentVariable("SMTP_SERVER");
    var portEnv = Environment.GetEnvironmentVariable("SMTP_PORT");
    options.SMTP_PORT = int.TryParse(portEnv, out var port) ? port : 587;
    options.SMTP_EMAIL = Environment.GetEnvironmentVariable("SMTP_EMAIL");
    options.SMTP_NAME = Environment.GetEnvironmentVariable("SMTP_NAME") ?? "Faraday System";
    options.SMTP_PASSWORD = Environment.GetEnvironmentVariable("SMTP_PASSWORD");
});

// Register Services (Scoped)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRackService, RackService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IWarehouseAlgorithmService, WarehouseAlgorithmService>();
builder.Services.AddScoped<IOperationService, OperationService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<IMonitoringService, MonitoringService>();
builder.Services.AddScoped<IEmailService, EmailService>(); // Registered only once here
builder.Services.AddScoped<IImageRecognitionService, ImageRecognitionService>();
builder.Services.AddScoped<IVoiceCommandService, VoiceCommandService>();
builder.Services.AddScoped<IAlertNotificationService, AlertNotificationService>();
builder.Services.AddSingleton<ILogsService, LogsService>();
startupLogger.LogInformation("All services registered successfully");

// Registration of WMS workers.
builder.Services.AddHostedService<BackupBackgroundWorker>();
builder.Services.AddHostedService<SimulationBackgroundWorker>();
builder.Services.AddHostedService<ExpirationMonitoringWorker>();
startupLogger.LogInformation("Background workers registered successfully");

var app = builder.Build();

// Make sure this is added early in the pipeline, right after builder.Build()
app.UseMiddleware<Faraday.API.Middleware.ErrorHandlingMiddleware>();


// Register SignalR Logger Provider
var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
loggerFactory.AddProvider(new SignalRLoggerProvider(app.Services));
app.Logger.LogInformation("SignalR Logger Provider registered for real-time log streaming");

// Create a temporary service scope to access the DbContext during application startup.
// This block ensures the database schema is up-to-date and the default admin user exists.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<FaradayDbContext>();

    // Ensure the database schema is up-to-date.
    try
    {
        startupLogger.LogInformation("Checking database schema...");

        bool hasTables = false;
        if (dbContext.Database.CanConnect())
        {
            try
            {
                dbContext.Database.OpenConnection();
                using var cmd = dbContext.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'";
                hasTables = Convert.ToInt32(cmd.ExecuteScalar()) > 0;
            }
            catch { /* Database might not exist yet */ }
            finally
            {
                dbContext.Database.CloseConnection();
            }
        }

        if (!hasTables)
        {
            // Fresh database — create schema from current model
            startupLogger.LogInformation("Fresh database detected. Creating schema...");
            dbContext.Database.EnsureCreated();
            StoreModelHash(dbContext);
            startupLogger.LogInformation("Database schema created successfully");
        }
        else
        {
            // Apply any pending migrations
            var pendingMigrations = dbContext.Database.GetPendingMigrations().ToList();
            if (pendingMigrations.Count != 0)
            {
                startupLogger.LogInformation("Applying {Count} pending migration(s)...", pendingMigrations.Count);
                dbContext.Database.Migrate();
                StoreModelHash(dbContext);
                startupLogger.LogInformation("Migrations applied successfully");
            }

            // Check if model changed since last migration/startup
            var currentHash = ComputeModelHash(dbContext);
            var storedHash = ReadStoredModelHash(dbContext);

            if (currentHash != storedHash)
            {
                startupLogger.LogWarning("============================================================");
                startupLogger.LogWarning("  MODEL CHANGE DETECTED — database schema is out of date!");
                startupLogger.LogWarning("  Run the following commands to update the database (inside Faraday.API folder):");
                startupLogger.LogWarning("    dotnet ef migrations add <MigrationName>");
                startupLogger.LogWarning("    dotnet ef database update");
                startupLogger.LogWarning("============================================================");
            }
            else
            {
                startupLogger.LogInformation("Database schema is up to date");
            }
        }
    }
    catch (Exception ex)
    {
        startupLogger.LogError(ex, "Database initialization failed: {Message}. Attempting to continue...", ex.Message);
    }

    // Seed default administrator account if the Users table is empty.
    if (!dbContext.Users.Any())
    {
        dbContext.Users.Add(new User
        {
            Username = "admin",
            Email = "admin@faraday.com",
            Role = UserRole.Administrator,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            IsActive = true
        });
        dbContext.SaveChanges();
        startupLogger.LogInformation("Default administrator account seeded: admin / admin123");
    }
}

// Swagger on VPS also enabled
// if (app.Environment.IsDevelopment())
// {
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Faraday WMS API v1");
    c.RoutePrefix = "swagger";
});
// }
// Enable CORS
app.UseCors("AllowAll");

// app.UseHttpsRedirection(); // Commented out to prevent Docker port issues

// Note: DO NOT move UseAuthorization before UseAuthentication! Ask Dawid if you don't know why.
// Enable Authentication middleware to validate the JWT token.
app.UseAuthentication();

// Enable Authorization middleware to check user permissions/roles.
app.UseAuthorization();

app.MapHub<AlertsHub>("/hubs/alerts");
app.MapHub<LogsHub>("/hubs/logs");

app.MapControllers();

app.UseStaticFiles();

startupLogger.LogInformation("=== Faraday WMS API Started Successfully ===");

app.Run();
return;

// Database schema management helpers

string ComputeModelHash(FaradayDbContext context)
{
    var modelString = context.Model.ToDebugString(MetadataDebugStringOptions.LongDefault);
    var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(modelString));
    return Convert.ToHexString(hashBytes);
}

string? ReadStoredModelHash(FaradayDbContext context)
{
    try
    {
        context.Database.OpenConnection();
        using var cmd = context.Database.GetDbConnection().CreateCommand();
        cmd.CommandText = "SELECT \"Hash\" FROM \"__SchemaVersion\" LIMIT 1";
        var result = cmd.ExecuteScalar()?.ToString();
        return result;
    }
    catch
    {
        return null;
    }
    finally
    {
        try { context.Database.CloseConnection(); } catch { }
    }
}

void StoreModelHash(FaradayDbContext context)
{
    var hash = ComputeModelHash(context);
    context.Database.ExecuteSqlRaw(
        "CREATE TABLE IF NOT EXISTS \"__SchemaVersion\" (\"Hash\" TEXT NOT NULL)");
    context.Database.ExecuteSqlRaw("DELETE FROM \"__SchemaVersion\"");
    context.Database.ExecuteSqlRaw(
        "INSERT INTO \"__SchemaVersion\" (\"Hash\") VALUES ({0})", hash);
}
