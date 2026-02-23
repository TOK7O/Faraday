using System.Net;

namespace Faraday.API.Middleware
{
    public class ErrorHandlingMiddleware(RequestDelegate next)
    {
        public async Task Invoke(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var code = HttpStatusCode.InternalServerError;

            if (exception is InvalidOperationException) code = HttpStatusCode.BadRequest; // 400
            if (exception is KeyNotFoundException) code = HttpStatusCode.NotFound; // 404
            if (exception is UnauthorizedAccessException) code = HttpStatusCode.Forbidden; // 403

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)code;

            var result = System.Text.Json.JsonSerializer.Serialize(new { message = exception.Message });

            return context.Response.WriteAsync(result);
        }
    }
}

