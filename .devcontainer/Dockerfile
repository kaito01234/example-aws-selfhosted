FROM mcr.microsoft.com/devcontainers/base:bullseye

# install session-manager-plugin
RUN curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" \
  -o "session-manager-plugin.deb" \
  && dpkg -i session-manager-plugin.deb

# install ecspresso
RUN VERSION=v2.2.4 \
  && DOWNLOAD_URL=$(curl -sS https://api.github.com/repos/kayac/ecspresso/releases/tags/${VERSION}|jq -r '.assets[].browser_download_url|select(match("linux.amd64."))') \
  && curl -sfLO ${DOWNLOAD_URL} \
  && tar xzvf $(basename ${DOWNLOAD_URL}) \
  && install ecspresso /usr/local/bin/ecspresso \
  && rm -f LICENSE README.md ecspresso $(basename ${DOWNLOAD_URL})
