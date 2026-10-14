import hashlib
import os
import sys
import time
from concurrent import futures
import datetime

# Ensure local dir is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import grpc
    import crawler_pb2
    import crawler_pb2_grpc
except ImportError:
    # If not yet generated, attempt to compile on startup if grpc_tools is present
    try:
        from grpc_tools import protoc
        proto_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../proto"))
        protoc.main([
            "grpc_tools.protoc",
            f"-I{proto_path}",
            "--python_out=.",
            "--grpc_python_out=.",
            os.path.join(proto_path, "crawler/v1/crawler.proto")
        ])
        import grpc
        import crawler_pb2
        import crawler_pb2_grpc
    except Exception as e:
        print(f"Warning: protobuf bindings not compiled yet: {e}")
        grpc = None


class CrawlerServiceServicer:
    """Implements crawler.v1.CrawlerService."""

    def CrawlPage(self, request, context):
        print(f"[CrawlerService] Received crawl request for job={request.job_id}, url={request.source_url}")
        
        # Security: basic scheme validation
        if not (request.source_url.startswith("http://") or request.source_url.startswith("https://")):
            return crawler_pb2.CrawlPageResponse(
                job_id=request.job_id,
                source_id=request.source_id,
                changed=False,
                http_status=400,
                error_code="INVALID_URL_SCHEME",
                error_message="Only HTTP and HTTPS URLs are permitted"
            )

        # In Phase 0: Stub / mock fetch response with sha256 hash
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        sample_content = f"<html><body>Source: {request.source_url} fetched at {now_iso}</body></html>"
        content_hash = hashlib.sha256(sample_content.encode("utf-8")).hexdigest()
        changed = (content_hash != request.expected_content_hash)

        return crawler_pb2.CrawlPageResponse(
            job_id=request.job_id,
            source_id=request.source_id,
            changed=changed,
            content_hash=content_hash,
            artifact_storage_key=f"artifacts/{request.source_id}/{content_hash}.html",
            http_status=200,
            fetched_at_iso=now_iso,
            error_code="",
            error_message=""
        )

    def Health(self, request, context):
        return crawler_pb2.HealthResponse(ready=True)


def serve():
    if grpc is None:
        print("gRPC is not installed or bindings failed. Exiting.")
        sys.exit(1)

    port = os.getenv("GRPC_PORT", "50052")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    crawler_pb2_grpc.add_CrawlerServiceServicer_to_server(CrawlerServiceServicer(), server)
    server.add_insecure_port(f"[::]:{port}")
    print(f"[CrawlerService] Starting Python gRPC crawler on port {port}...")
    server.start()
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == "__main__":
    serve()

