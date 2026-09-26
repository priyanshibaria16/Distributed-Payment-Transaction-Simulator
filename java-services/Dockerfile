# Multi-stage build for Java Services
FROM maven:3.9.8-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copy POM files first for caching dependencies
COPY pom.xml ./
COPY shared/pom.xml ./shared/
COPY payment-command-service/pom.xml ./payment-command-service/
COPY payment-worker-service/pom.xml ./payment-worker-service/
COPY notification-service/pom.xml ./notification-service/
COPY refund-service/pom.xml ./refund-service/

# Copy all source code
COPY shared ./shared
COPY payment-command-service ./payment-command-service
COPY payment-worker-service ./payment-worker-service
COPY notification-service ./notification-service
COPY refund-service ./refund-service

# Build and package all services
RUN mvn clean package -DskipTests

# Runtime image
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN apk add --no-cache curl bash

# Copy the runnable service jar
COPY --from=build /app/payment-command-service/target/*.jar /app/app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
