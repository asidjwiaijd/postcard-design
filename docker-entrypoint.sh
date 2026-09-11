#!/bin/sh
set -e

DATA_DIR="${DATA_DIR:-/data}"
# 绑定挂载的宿主目录属主通常不是镜像里的 app 用户，
# 这里在启动时对齐一次，再降权运行，省得部署时手动 chown。
PUID="${PUID:-1001}"
PGID="${PGID:-1001}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  current_uid="$(stat -c %u "$DATA_DIR")"
  if [ "$current_uid" != "$PUID" ]; then
    echo "[entrypoint] 把 $DATA_DIR 的属主改成 $PUID:$PGID（原来是 $current_uid）"
    chown -R "$PUID:$PGID" "$DATA_DIR"
  fi
  exec setpriv --reuid="$PUID" --regid="$PGID" --init-groups "$@"
fi

# 已经用 --user 指定了非 root，直接跑
exec "$@"
