FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV GRPC_PORT=50052

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 50052

CMD ["python", "crawler_server.py"]

