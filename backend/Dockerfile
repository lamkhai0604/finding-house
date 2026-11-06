# T-114a: the image Render runs (D-029). The smoke workflow builds and tests this same file.
# Build:  docker build -t finding-house-backend backend
# Run:    docker run --rm -p 8080:8080 --env-file .env finding-house-backend

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
# Dependencies first, so code changes reuse the cached dependency layer.
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp -DskipTests package \
    && cp target/finding-house-backend-*.jar /tmp/app.jar

FROM eclipse-temurin:21-jre
# Run as an unprivileged user.
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=build /tmp/app.jar app.jar
USER 10001
# The free instance has 512 MB: keep the heap well below it and use the small serial collector.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -Xss512k -XX:+ExitOnOutOfMemoryError"
# Render sets PORT; application.yml reads it (default 8080).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
