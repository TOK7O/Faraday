using System.Text;
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

// DB CONFIG
// Register Entity Framework Core context with PostgreSQL provider.
// Connection string is retrieved from appsettings.json ("DefaultConnection").
builder.Services.AddDbContext<FaradayDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Auth and JWT configuration
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing in configuration.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

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
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

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

// Registration of WMS services.
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRackService, RackService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IWarehouseAlgorithmService, WarehouseAlgorithmService>();
builder.Services.AddScoped<IOperationService, OperationService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IBackupService, BackupService>();

// Registration of WMS workers.
builder.Services.AddHostedService<BackupBackgroundWorker>();

var app = builder.Build();

// Create a temporary service scope to access the DbContext during application startup.
// This block ensures the database schema is up-to-date and the default admin user exists.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<FaradayDbContext>();

    // Automatically apply any pending migrations to the database.
    dbContext.Database.Migrate();

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
    }
}

// HTTP Request Pipeline Configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Note: DO NOT move UseAuthorization before UseAuthentication! Ask Dawid if you don't know why.
// Enable Authentication middleware to validate the JWT token.
app.UseAuthentication();

// Enable Authorization middleware to check user permissions/roles.
app.UseAuthorization();

app.MapControllers();

app.Run();