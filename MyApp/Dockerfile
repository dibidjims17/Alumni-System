# Build from the MyApp/ directory (Railway service Root Directory: /MyApp).
FROM mcr.microsoft.com/dotnet/sdk:9.0-bookworm-slim AS build
WORKDIR /src

# Restore from project files first so dependency layers remain cached when
# application source changes.
COPY MyApp.Domain/MyApp.Domain.csproj MyApp.Domain/
COPY MyApp.Shared/MyApp.Shared.csproj MyApp.Shared/
COPY MyApp.Application/MyApp.Application.csproj MyApp.Application/
COPY MyApp.Infrastructure/MyApp.Infrastructure.csproj MyApp.Infrastructure/
COPY MyApp.API/MyApp.API.csproj MyApp.API/
RUN dotnet restore MyApp.API/MyApp.API.csproj

COPY . .
RUN dotnet publish MyApp.API/MyApp.API.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0-bookworm-slim AS runtime

# QuestPDF needs system font discovery in Linux containers.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

# Railway volume mount: /app/Uploads. Creating it in the image also keeps
# local/container runs functional when no volume is attached.
RUN mkdir -p /app/Uploads

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080

# Railway injects PORT. The fallback makes the image runnable elsewhere.
ENTRYPOINT ["/bin/sh", "-c", "exec dotnet MyApp.API.dll --urls http://0.0.0.0:${PORT:-8080}"]
