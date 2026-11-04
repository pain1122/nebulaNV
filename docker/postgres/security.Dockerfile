# syntax=docker/dockerfile:1.7
# Keep PostgreSQL's official runtime; update only its privilege-drop helper.
FROM --platform=$BUILDPLATFORM golang:1.26.10-alpine3.24@sha256:a2012b4a1d1f9f7e9f44e0d39b805a901e856b1dd80b4e6ee4338db547050308 AS helper-tests

ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOMAXPROCS=2 GOSUMDB=sum.golang.org
ARG GOPROXY="https://proxy.golang.org|https://goproxy.cn|https://goproxy.io|direct"
ENV GOPROXY=${GOPROXY}
WORKDIR /src
# Official 1.20 tag, resolved to a commit and verified archive bytes.
ADD --checksum=sha256:2b70da8a5480fafedc16bb1fc91b572f064d03df736cbd91a616af2f1b66ab51 https://codeload.github.com/tianon/gosu/tar.gz/29b939aa5bd4dc588af765b8248f6e39150d2565 /tmp/gosu.tar.gz
RUN tar -xzf /tmp/gosu.tar.gz --strip-components=1 -C /src && rm /tmp/gosu.tar.gz
# Upstream's test-only correction: short comment lines exercise the file cap
# without first hitting the separate line cap. Runtime module bytes stay intact.
ADD --checksum=sha256:5dd67fd1ccfd0287084ed60ce1b791c7094204e9a2158b765c2ec1b2b13d5adc https://raw.githubusercontent.com/moby/sys/764f6927e9b8e5cf9c5b3c67efcd7875064ec481/user/user_test.go /tmp/fixed-user_test.go

ARG TARGETOS
ARG TARGETARCH
RUN --mount=type=cache,id=nebula-gosu-go-mod,target=/go/pkg/mod,sharing=locked \
    --mount=type=cache,id=nebula-gosu-go-build,target=/root/.cache/go-build,sharing=locked \
    set -eux; set -o pipefail; \
    test "$TARGETOS/$TARGETARCH" = linux/amd64; \
    test "$(go version)" = 'go version go1.26.10 linux/amd64'; \
    test "$(go env GOSUMDB)" = sum.golang.org; \
    grep -Fqx 'const Version = "1.20"' version.go; \
    sha256sum go.mod go.sum > /tmp/source-modules.sha256; \
    go mod download; \
    go mod verify; \
    test "$(go list -mod=readonly -m -f '{{.Version}}' github.com/moby/sys/user)" = v0.4.1; \
    mkdir -p /out/provenance; \
    parser_module="$(go env GOMODCACHE)/github.com/moby/sys/user@v0.4.1"; \
    cp -a "$parser_module" /tmp/parser-tests; \
    chmod u+w /tmp/parser-tests/user_test.go; \
    cp /tmp/fixed-user_test.go /tmp/parser-tests/user_test.go; \
    parser_facts() { (cd "$1" && find . -type f ! -path ./user_test.go -exec sha256sum {} \; | LC_ALL=C sort); }; \
    parser_facts "$parser_module" > /out/provenance/parser-inputs.sha256; \
    parser_facts /tmp/parser-tests > /tmp/parser-test-inputs.sha256; \
    cmp /out/provenance/parser-inputs.sha256 /tmp/parser-test-inputs.sha256; \
    (cd /tmp/parser-tests && go test -mod=readonly -count=1 -v .) > /out/provenance/parser-tests.txt 2>&1 || { cat /out/provenance/parser-tests.txt; exit 1; }; \
    tail -n 3 /out/provenance/parser-tests.txt; \
    parser_facts /tmp/parser-tests > /tmp/parser-test-inputs.sha256; \
    cmp /out/provenance/parser-inputs.sha256 /tmp/parser-test-inputs.sha256; \
    sha256sum /tmp/fixed-user_test.go > /out/provenance/test-fixture.sha256; \
    printf '%s\n' 764f6927e9b8e5cf9c5b3c67efcd7875064ec481 > /out/provenance/test-fix-commit.txt; \
    go mod verify; \
    sha256sum -c /tmp/source-modules.sha256

FROM helper-tests AS helper-build
ARG TARGETOS
ARG TARGETARCH
RUN --mount=type=cache,id=nebula-gosu-go-mod,target=/go/pkg/mod,sharing=locked \
    --mount=type=cache,id=nebula-gosu-go-build,target=/root/.cache/go-build,sharing=locked \
    set -eux; set -o pipefail; \
    GOOS="$TARGETOS" GOARCH="$TARGETARCH" go build -mod=readonly -trimpath -buildvcs=false -ldflags=-w -o /out/gosu .; \
    sha256sum -c /tmp/source-modules.sha256; \
    go version -m /out/gosu > /out/provenance/binary.txt; \
    awk '$1 == "dep" && $2 == "github.com/moby/sys/user" && $3 == "v0.4.1" { found=1 } END { exit !found }' /out/provenance/binary.txt; \
    go list -mod=readonly -m all > /out/provenance/modules.txt; \
    sha256sum /out/gosu > /out/provenance/gosu.sha256; \
    printf '%s\n' 29b939aa5bd4dc588af765b8248f6e39150d2565 > /out/provenance/source-commit.txt

FROM postgres:18.6-trixie@sha256:3a4264520e121176619f54ff867d12774bc81e95e7b84db58d63bccdb6144b81 AS security-runtime
ENV GOSU_VERSION=1.20
LABEL io.nebulanv.vendor.gosu="1.20" \
      io.nebulanv.vendor.gosu.commit="29b939aa5bd4dc588af765b8248f6e39150d2565" \
      io.nebulanv.vendor.go="1.26.10" \
      org.opencontainers.image.version="18.6-nebula-gosu1.20-go1.26.10"
COPY --from=helper-build --chmod=0755 /out/gosu /usr/local/bin/gosu
COPY --from=helper-build /out/provenance /usr/share/nebula-vendor/gosu
COPY --from=helper-build /src/LICENSE /usr/share/licenses/gosu/LICENSE
# Exercise the real helper; do not start PostgreSQL or mount any existing data.
RUN set -eu; \
    test "$(gosu --version)" = '1.20 (go1.26.10 on linux/amd64; gc)'; \
    test "$(gosu postgres id -u)" = "$(id -u postgres)"; \
    test "$(gosu postgres id -g)" = "$(id -g postgres)"; \
    test "$(gosu postgres id -G)" = "$(id -G postgres)"; \
    test "$(gosu 12345:12346 id -u)" = 12345; \
    test "$(gosu 12345:12346 id -g)" = 12346; \
    test "$(gosu nobody id -u)" != 0; \
    if gosu nebula-user-must-not-exist true; then exit 1; fi; \
    postgres --version
# Inherit official ENTRYPOINT, CMD, PGDATA=/var/lib/postgresql/18/docker,
# and VOLUME /var/lib/postgresql. No PostgreSQL server or extension is rebuilt.
