FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
ENV MAVEN_OPTS="-XX:MaxRAMPercentage=70.0 -XX:+UseSerialGC"
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:InitialRAMPercentage=15.0 -XX:MaxRAMPercentage=50.0 -XX:MaxMetaspaceSize=192m -XX:CompressedClassSpaceSize=128m -XX:ReservedCodeCacheSize=96m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_TOMCAT_THREADS_MAX=16
ENV SERVER_TOMCAT_THREADS_MIN_SPARE=2
ENV SPRING_TASK_SCHEDULING_POOL_SIZE=1
ENV SPRING_MAIN_LAZY_INITIALIZATION=true
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -jar app.jar --spring.profiles.active=${SPRING_PROFILES_ACTIVE}"]
