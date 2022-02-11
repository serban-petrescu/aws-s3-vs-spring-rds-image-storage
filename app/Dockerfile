FROM maven:3-jdk-11-slim

VOLUME [ "/tmp" ]

RUN mkdir -p /opt
WORKDIR /opt
COPY . /opt
RUN mvn package

CMD java -jar -Djava.security.egd=file:/dev/./urandom ./target/backend.jar