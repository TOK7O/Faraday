FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Faraday.API.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish "Faraday.API.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN apt-get update && apt-get install -y postgresql-client
COPY --from=build /app/publish .

RUN mkdir -p /app/wwwroot/product-images && \
    chmod -R 755 /app/wwwroot
ENTRYPOINT ["dotnet", "Faraday.API.dll"]