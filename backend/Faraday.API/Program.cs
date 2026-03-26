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
using Faraday.API.Middleware;
using Microsoft.AspNetCore.Authentication;

var builder = WebApplication.CreateBuilder(args);

// ─── Logging ────────────────────────────────────────────────────────────────
var startupLogger = LoggerFactory.Create(c => c.AddConsole()).CreateLogger("Startup");
startupLogger.LogInformation("=== Faraday WMS API Starting ===");
startupLogger.LogInformation("Environment: {Env}", builder.Environment.EnvironmentName);

// ─── Environment variables ───────────────────────────────────────────────────
Env.TraversePath().Load();
Console.WriteLine($"[BOOTSTRAP] .env loaded. SMTP_SERVER: {Environment.GetEnvironmentVariable("SMTP_SERVER") ?? "NULL"}");

// ─── Database ────────────────────────────────────────────────────────────────
var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "faraday_db";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
var dbPass = Environment.GetEnvironmentVariable("DB_PASSWORD")
    ?? throw new InvalidOperationException("DB_PASSWORD not found in environment");

var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPass};SSL Mode=Require;Trust Server Certificate=true";
builder.Configuration["ConnectionStrings:DefaultConnection"] = connectionString;
builder.Services.AddDbContext<FaradayDbContext>(o => o.UseNpgsql(connectionString));

// ─── Misc configuration ──────────────────────────────────────────────────────
builder.Configuration["BACKUP_ENCRYPTION_KEY"] = Environment.GetEnvironmentVariable("BACKUP_ENCRYPTION_KEY");
builder.Configuration["BACKUP_ENCRYPTION_IV"] = Environment.GetEnvironmentVariable("BACKUP_ENCRYPTION_IV");
builder.Configuration["Gemini:ApiKey"] = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
builder.Configuration["SensorApi:ApiKey"] = Environment.GetEnvironmentVariable("SENSOR_API_KEY");

// ─── JWT configuration ───────────────────────────────────────────────────────
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? throw new InvalidOperationException("JWT_KEY not found in environment");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "FaradayServer";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "FaradayClient";

builder.Configuration["Jwt:Key"] = jwtKey;
builder.Configuration["Jwt:Issuer"] = jwtIssuer;
builder.Configuration["Jwt:Audience"] = jwtAudience;

startupLogger.LogInformation("JWT configured. Issuer={Issuer}, Audience={Audience}", jwtIssuer, jwtAudience);

// ─── Authentication ──────────────────────────────────────────────────────────
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        // Allow SignalR to pass the token via query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"].ToString();
                var path  = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(token) &&
                    (path.StartsWithSegments("/hubs/logs") ||
                     path.StartsWithSegments("/hubs/alerts") ||
                     path.StartsWithSegments("/hubs/sensors")))
                {
                    ctx.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    })
    // Static API-key scheme for IoT sensor devices (X-Api-Key header)
    .AddScheme<AuthenticationSchemeOptions, SensorApiKeyAuthHandler>(
        SensorApiKeyAuthHandler.SchemeName, null);

// ─── Authorization ───────────────────────────────────────────────────────────
builder.Services.AddAuthorization();

// ─── Controllers ─────────────────────────────────────────────────────────────
builder.Services.AddControllers();

// ─── CORS ─────────────────────────────────────────────────────────────────────
var clientUrl = Environment.GetEnvironmentVariable("CLIENT_APP_BASE_URL") ?? "http://localhost:5173";
Console.WriteLine($"[CORS] Allowing origin: {clientUrl}");
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy
            .WithOrigins(clientUrl, "http://localhost:5173", "http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// ─── SignalR ──────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ─── Swagger / OpenAPI ────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v2", new OpenApiInfo { Title = "Faraday WMS API", Version = "v2" });

    // JWT Bearer security definition – Swagger UI will send "Authorization: Bearer <token>"
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Wklej token JWT (bez prefiksu 'Bearer'). Swagger doda go automatycznie."
    });

    // API Key security definition for IoT sensors
    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Name        = "X-Api-Key",
        Type        = SecuritySchemeType.ApiKey,
        In          = ParameterLocation.Header,
        Description = "Klucz API dla urządzeń IoT (SENSOR_API_KEY)."
    });

    // Apply Bearer JWT scheme globally to every operation
    // Swashbuckle 10 changed AddSecurityRequirement to accept a factory Func
    c.AddSecurityRequirement(doc =>
    {
        var req = new OpenApiSecurityRequirement();
        req.Add(new OpenApiSecuritySchemeReference("Bearer", doc), new List<string>());
        return req;
    });

    // Apply API Key scheme globally to every operation
    c.AddSecurityRequirement(doc =>
    {
        var req = new OpenApiSecurityRequirement();
        req.Add(new OpenApiSecuritySchemeReference("ApiKey", doc), new List<string>());
        return req;
    });
});

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

// ─── Email settings ───────────────────────────────────────────────────────────
builder.Services.Configure<EmailSettings>(o =>
{
    o.SMTP_SERVER  = Environment.GetEnvironmentVariable("SMTP_SERVER");
    o.SMTP_PORT    = int.TryParse(Environment.GetEnvironmentVariable("SMTP_PORT"), out var p) ? p : 587;
    o.SMTP_EMAIL   = Environment.GetEnvironmentVariable("SMTP_EMAIL");
    o.SMTP_NAME    = Environment.GetEnvironmentVariable("SMTP_NAME") ?? "Faraday System";
    o.SMTP_PASSWORD = Environment.GetEnvironmentVariable("SMTP_PASSWORD");
});

// ─── Application services ────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRackService, RackService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IWarehouseAlgorithmService, WarehouseAlgorithmService>();
builder.Services.AddScoped<IOperationService, OperationService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<IMonitoringService, MonitoringService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IImageRecognitionService, ImageRecognitionService>();
builder.Services.AddScoped<IVoiceCommandService, VoiceCommandService>();
builder.Services.AddScoped<IAlertNotificationService, AlertNotificationService>();
builder.Services.AddScoped<ISensorService, SensorService>();
builder.Services.AddSingleton<ILogsService, LogsService>();

// ─── Background workers ───────────────────────────────────────────────────────
builder.Services.AddHostedService<BackupBackgroundWorker>();
builder.Services.AddHostedService<ExpirationMonitoringWorker>();

startupLogger.LogInformation("All services and workers registered.");

// ═════════════════════════════════════════════════════════════════════════════
var app = builder.Build();
// ═════════════════════════════════════════════════════════════════════════════

// Global error handling – must be first
app.UseMiddleware<ErrorHandlingMiddleware>();

// SignalR real-time log streaming
var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
loggerFactory.AddProvider(new SignalRLoggerProvider(app.Services));

// ─── Database initialisation ─────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<FaradayDbContext>();

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
            catch { /* may not exist yet */ }
            finally { dbContext.Database.CloseConnection(); }
        }

        if (!hasTables)
        {
            startupLogger.LogInformation("Fresh database – creating schema...");
            dbContext.Database.EnsureCreated();
            StoreModelHash(dbContext);
        }
        else
        {
            var pending = dbContext.Database.GetPendingMigrations().ToList();
            if (pending.Count > 0)
            {
                startupLogger.LogInformation("Applying {Count} pending migration(s)...", pending.Count);
                dbContext.Database.Migrate();
                StoreModelHash(dbContext);
            }

            var currentHash = ComputeModelHash(dbContext);
            if (currentHash != ReadStoredModelHash(dbContext))
            {
                startupLogger.LogWarning("MODEL CHANGE DETECTED – run: dotnet ef migrations add <Name> && dotnet ef database update");
            }
            else
            {
                startupLogger.LogInformation("Database schema is up to date.");
            }
        }
    }
    catch (Exception ex)
    {
        startupLogger.LogError(ex, "Database init error: {Msg}. Continuing...", ex.Message);
    }

    // Seed default admin if users table is empty
    if (!dbContext.Users.Any())
    {
        dbContext.Users.Add(new User
        {
            Username     = "admin",
            Email        = "admin@faraday.com",
            Role         = UserRole.Administrator,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            IsActive     = true
        });
        dbContext.SaveChanges();
        startupLogger.LogInformation("Default admin seeded: admin / admin123");
    }
}

// ─── Middleware pipeline ──────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v2/swagger.json", "Faraday WMS API v2");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAll");

// ORDER MATTERS: Authentication must come before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapHub<AlertsHub>("/hubs/alerts");
app.MapHub<LogsHub>("/hubs/logs");
app.MapHub<SensorHub>("/hubs/sensors");
app.MapControllers();
app.UseStaticFiles();

startupLogger.LogInformation("=== Faraday WMS API Started Successfully ===");
app.Run();
return;

// ─── Helpers ──────────────────────────────────────────────────────────────────

string ComputeModelHash(FaradayDbContext context)
{
    var str = context.Model.ToDebugString(MetadataDebugStringOptions.LongDefault);
    return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(str)));
}

string? ReadStoredModelHash(FaradayDbContext context)
{
    try
    {
        context.Database.OpenConnection();
        using var cmd = context.Database.GetDbConnection().CreateCommand();
        cmd.CommandText = "SELECT \"Hash\" FROM \"__SchemaVersion\" LIMIT 1";
        return cmd.ExecuteScalar()?.ToString();
    }
    catch { return null; }
    finally { try { context.Database.CloseConnection(); } catch { } }
}

void StoreModelHash(FaradayDbContext context)
{
    var hash = ComputeModelHash(context);
    context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS \"__SchemaVersion\" (\"Hash\" TEXT NOT NULL)");
    context.Database.ExecuteSqlRaw("DELETE FROM \"__SchemaVersion\"");
    context.Database.ExecuteSqlRaw("INSERT INTO \"__SchemaVersion\" (\"Hash\") VALUES ({0})", hash);
}
