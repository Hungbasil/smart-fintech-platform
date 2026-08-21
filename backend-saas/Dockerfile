FROM maven:3.9.8-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/smart-wealth-0.0.1-SNAPSHOT.jar app.jar
COPY wait-for-postgres.sh /app/wait-for-postgres.sh
RUN apt-get update \
	&& apt-get install -y --no-install-recommends netcat-openbsd \
	&& rm -rf /var/lib/apt/lists/* \
	&& chmod +x /app/wait-for-postgres.sh
EXPOSE 8080
ENTRYPOINT ["/app/wait-for-postgres.sh", "java", "-jar", "/app/app.jar", "--spring.profiles.active=prod"]
