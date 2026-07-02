FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv git bash ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["bash"]
