# syntax=docker/dockerfile:1.7
# Candidate only: preserve the normal 4.51 runtime; replace its Go binary.
FROM --platform=$BUILDPLATFORM golang:1.26.10-alpine3.24@sha256:a2012b4a1d1f9f7e9f44e0d39b805a901e856b1dd80b4e6ee4338db547050308 AS builder

ENV SOURCE_COMMIT=153ab668c99731a6d29492bf6c61d0b4fa701101 \
    GOTOOLCHAIN=local \
    CGO_ENABLED=0 \
    GOMAXPROCS=2
RUN apk add --no-cache git
WORKDIR /src
RUN git init . && \
    git remote add origin https://github.com/seaweedfs/seaweedfs.git && \
    git fetch --depth=1 origin "$SOURCE_COMMIT" && \
    git checkout --detach FETCH_HEAD && \
    test "$(git rev-parse HEAD)" = "$SOURCE_COMMIT"

ARG TARGETOS
ARG TARGETARCH
# Public module mirrors with fallback on 403/timeouts; retain signed checksum DB
# verification. This affects download routing only, not selected module versions.
ARG GOPROXY="https://goproxy.cn|https://goproxy.io|direct"
ENV GOPROXY=${GOPROXY} \
    GOSUMDB=sum.golang.org
# Keep module and compiler caches out of the final image. The first run downloads
# Go dependencies; later visits reuse them. No Rust/backend/npm rebuild is needed.
RUN --mount=type=cache,id=nebula-seaweed-go-mod,target=/go/pkg/mod,sharing=locked \
    --mount=type=cache,id=nebula-seaweed-go-build,target=/root/.cache/go-build,sharing=locked \
    set -eux; set -o pipefail; \
    test "$TARGETOS/$TARGETARCH" = linux/amd64; \
    test "$(go version)" = 'go version go1.26.10 linux/amd64'; \
    test "$(go env GOSUMDB)" = sum.golang.org; \
    mkdir -p /out/provenance; \
    go list -mod=readonly -m all | sort > /tmp/modules-before; \
    test "$(go list -mod=readonly -m -f '{{.Version}}' github.com/go-jose/go-jose/v4)" = v4.1.5; \
    go mod edit -require=github.com/go-jose/go-jose/v4@v4.1.7; \
    go mod download github.com/go-jose/go-jose/v4; \
    go mod verify; \
    test "$(go list -mod=readonly -m -f '{{.Version}}' github.com/go-jose/go-jose/v4)" = v4.1.7; \
    grep -Fqx 'github.com/go-jose/go-jose/v4 v4.1.7 h1:Nac/98uT5LPkfbiFuYa8ktf62a2VxwQ4xbq1GK8pV5E=' go.sum; \
    grep -Fqx 'github.com/go-jose/go-jose/v4 v4.1.7/go.mod h1:x4oUasVrzR7071A4TnHLGSPpNOm2a21K9Kf04k1rs08=' go.sum; \
    go list -mod=readonly -m all | sort > /out/provenance/modules-after.txt; \
    grep -v '^github.com/go-jose/go-jose/v4 ' /tmp/modules-before > /tmp/other-before; \
    grep -v '^github.com/go-jose/go-jose/v4 ' /out/provenance/modules-after.txt > /tmp/other-after; \
    cmp /tmp/other-before /tmp/other-after; \
    if ! go test -mod=readonly github.com/go-jose/go-jose/v4/... > /out/provenance/go-jose-tests.txt 2>&1; then \
      cat /out/provenance/go-jose-tests.txt; exit 1; \
    fi; \
    cat /out/provenance/go-jose-tests.txt; \
    GOOS="$TARGETOS" GOARCH="$TARGETARCH" go build -mod=readonly -trimpath \
      -ldflags "-extldflags -static -X github.com/seaweedfs/seaweedfs/weed/util/version.COMMIT=$SOURCE_COMMIT" \
      -o /out/weed ./weed; \
    git diff --check; \
    test "$(git diff --name-only | tr '\n' ' ')" = 'go.mod go.sum '; \
    git diff --unified=0 -- go.mod go.sum > /out/provenance/module.patch; \
    awk '/^[+-]/ && $0 !~ /^(---|\+\+\+)/ && index($0, "github.com/go-jose/go-jose/v4") == 0 { exit 1 }' /out/provenance/module.patch; \
    go version -m /out/weed > /out/provenance/binary.txt; \
    awk '$1 == "dep" && $2 == "github.com/go-jose/go-jose/v4" && $3 == "v4.1.7" { found=1 } END { exit !found }' /out/provenance/binary.txt; \
    printf '%s\n' "$SOURCE_COMMIT" > /out/provenance/source-commit.txt

FROM chrislusf/seaweedfs:4.51@sha256:f7a49e3f3972ebed5be2ed4befa4a0c68eb7bdddba6e692d42729ceb545134b8 AS security-runtime
LABEL org.opencontainers.image.source="https://github.com/seaweedfs/seaweedfs" \
      org.opencontainers.image.revision="153ab668c99731a6d29492bf6c61d0b4fa701101" \
      org.opencontainers.image.version="4.51-nebula-gojose4.1.7" \
      io.nebulanv.vendor.go-jose="v4.1.7"
COPY --from=builder /out/weed /usr/bin/weed
COPY --from=builder /out/provenance /usr/share/nebula-vendor/seaweedfs
COPY --from=builder /src/LICENSE /usr/share/licenses/seaweedfs/LICENSE
RUN ["/usr/bin/weed", "version"]
# Inherit the original entrypoint, default command, users, runtime tools and data
# layout. The replacement binary remains static and uses normal (empty) tags.
