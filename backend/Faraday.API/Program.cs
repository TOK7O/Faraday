using System.Text;
using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Faraday.API.Services;
using Faraday.API.Services.Interfaces;
using Faraday.API.Workers;

var builder = WebApplication.CreateBuilder(args);

// --- 1. LOAD .ENV FILE ---
// TraversePath() automatically looks up the directory tree until it finds .env
Env.TraversePath().Load();

// Debug: Verify it loaded
var testEnv = Environment.GetEnvironmentVariable("SMTP_SERVER");
Console.WriteLine($"[BOOTSTRAP] .env loaded. SMTP_SERVER found: {testEnv ?? "NULL"}");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// DB CONFIG
builder.Services.AddDbContext<FaradayDbContext>(options =>
    options.UseNpgsql(connectionString));

// Auth and JWT configuration
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing in configuration.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
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
});

builder.Services.AddControllers();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

builder.Services.AddEndpointsApiExplorer();

// Configure Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Faraday WMS API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer [space] [token]'.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// --- SERVICE REGISTRATION ---
builder.Services.Configure<EmailSettings>(builder.Configuration);

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

// Register Workers (Hosted)
builder.Services.AddHostedService<BackupBackgroundWorker>();
builder.Services.AddHostedService<SimulationBackgroundWorker>();

var app = builder.Build();

// Database Migration & Seeding
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<FaradayDbContext>();

    try
    {
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[WARNING] Migration failed: {ex.Message}. Attempting to continue...");
    }

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
    }
}

// Pipeline Configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Faraday WMS API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();