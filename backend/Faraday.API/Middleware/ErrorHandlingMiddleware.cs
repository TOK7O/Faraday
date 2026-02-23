using System.Net;

namespace Faraday.API.Middleware
{
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;

        public ErrorHandlingMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var code = HttpStatusCode.InternalServerError; // 500 if unexpected

            // Map specific exceptions to specific HTTP status codes
            if (exception is InvalidOperationException) code = HttpStatusCode.BadRequest; // 400
            if (exception is KeyNotFoundException) code = HttpStatusCode.NotFound; // 404
            if (exception is UnauthorizedAccessException) code = HttpStatusCode.Forbidden; // 403

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)code;

            // Formats the response exactly how your frontend expects it
            var result = System.Text.Json.JsonSerializer.Serialize(new { message = exception.Message });

            return context.Response.WriteAsync(result);
        }
    }
}

