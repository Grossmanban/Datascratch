# A stand-in for a fresh Ubuntu 24.04 VPS with SSH, for the deploy end-to-end test.
# Docker is used through the host's socket (mounted at run time), so containers the
# "VPS" starts run next to it on the host.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq \
  && apt-get install -y -qq --no-install-recommends openssh-server docker.io docker-compose-v2 sudo ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /run/sshd /root/.ssh && chmod 700 /root/.ssh \
  && sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/; s/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
