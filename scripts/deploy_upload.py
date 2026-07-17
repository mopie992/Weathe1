"""Upload frontend/web-build to DreamHost over pure SFTP (no shell exec).

This DreamHost account is SFTP-only: SSH command execution is disabled, so the
deploy is done entirely through SFTP operations.

Strategy (fast + safe, near-atomic swap):
  1. Upload web-build into a fresh staging dir  (roadweather.app.staging-<ts>)
  2. Verify staging/index.html exists
  3. Swap with renames:
        remove old roadweather.app.prev
        rename roadweather.app         -> roadweather.app.prev
        rename roadweather.app.staging -> roadweather.app
     (live is unavailable only for the few ms between the two renames)
  4. Verify roadweather.app/index.html + build entrypoints
     (rolls back to the previous version if the final swap fails)

Credentials come from the FileZilla site named "RoadWeatherApp".

Usage:
    python scripts/deploy_upload.py
"""

from __future__ import annotations

from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
import base64
import json
import stat
import sys
import time
import xml.etree.ElementTree as ET

try:
    import paramiko
except ImportError:
    sys.exit("paramiko is not installed. Run:  pip install paramiko")

REPO_ROOT = Path(__file__).resolve().parent.parent
LOCAL_ROOT = REPO_ROOT / "frontend" / "web-build"
FILEZILLA_SITE = "RoadWeatherApp"
REMOTE_LIVE = "roadweather.app"
CONNECT_TIMEOUT = 20


def log(msg: str) -> None:
    print(msg, flush=True)


def load_filezilla_site(name: str):
    xml_path = Path.home() / "AppData" / "Roaming" / "FileZilla" / "sitemanager.xml"
    if not xml_path.is_file():
        sys.exit(f"FileZilla site manager not found at {xml_path}")
    root = ET.parse(xml_path).getroot()
    for server in root.findall(".//Server"):
        if server.findtext("Name") == name:
            return server
    sys.exit(f'FileZilla site "{name}" not found in {xml_path}')


def remote_exists(sftp, path: str) -> bool:
    try:
        sftp.stat(path)
        return True
    except IOError:
        return False


def sftp_rmtree(sftp, path: str) -> None:
    """Recursively delete a remote directory tree (does not follow symlinks)."""
    for entry in sftp.listdir_attr(path):
        child = f"{path}/{entry.filename}"
        if stat.S_ISDIR(entry.st_mode) and not stat.S_ISLNK(entry.st_mode):
            sftp_rmtree(sftp, child)
        else:
            sftp.remove(child)
    sftp.rmdir(path)


def upload_tree(sftp, local_dir: Path, remote_dir: str, stats: dict) -> None:
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass  # already exists
    for entry in sorted(local_dir.iterdir()):
        remote_child = f"{remote_dir}/{entry.name}"
        if entry.is_dir():
            upload_tree(sftp, entry, remote_child, stats)
        else:
            sftp.put(str(entry), remote_child)
            stats["files"] += 1
            stats["bytes"] += entry.stat().st_size
            if stats["files"] % 5 == 0:
                log(f"  uploaded {stats['files']} files ...")


def main() -> None:
    started = time.time()
    if not (LOCAL_ROOT / "index.html").is_file():
        sys.exit(f"Build missing: {LOCAL_ROOT / 'index.html'} (run npm run build:web first)")

    server = load_filezilla_site(FILEZILLA_SITE)
    host = server.findtext("Host")
    port = int(server.findtext("Port") or 22)
    user = server.findtext("User")
    password = base64.b64decode(server.findtext("Pass") or "").decode()

    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    log(f"Connecting to {user}@{host}:{port} ...")
    client.connect(host, port=port, username=user, password=password, timeout=CONNECT_TIMEOUT)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    staging = f"{REMOTE_LIVE}.staging-{stamp}"
    prev = f"{REMOTE_LIVE}.prev"

    try:
        sftp = client.open_sftp()

        # Fresh staging dir
        if remote_exists(sftp, staging):
            log("Removing stale staging dir ...")
            sftp_rmtree(sftp, staging)

        log(f"Uploading build to {staging} ...")
        stats = {"files": 0, "bytes": 0}
        upload_tree(sftp, LOCAL_ROOT, staging, stats)
        log(f"Uploaded {stats['files']} files ({stats['bytes']:,} bytes)")

        if not remote_exists(sftp, f"{staging}/index.html"):
            raise RuntimeError("Upload verification failed: staging/index.html missing")

        log("Swapping staging into place ...")
        if remote_exists(sftp, prev):
            log("  removing previous backup dir (.prev) ...")
            sftp_rmtree(sftp, prev)

        live_existed = remote_exists(sftp, REMOTE_LIVE)
        if live_existed:
            sftp.rename(REMOTE_LIVE, prev)
        try:
            sftp.rename(staging, REMOTE_LIVE)
        except IOError as exc:
            # Roll back so the site is not left down
            if live_existed and not remote_exists(sftp, REMOTE_LIVE):
                sftp.rename(prev, REMOTE_LIVE)
            raise RuntimeError(f"Final swap failed (rolled back): {exc}")

        if not remote_exists(sftp, f"{REMOTE_LIVE}/index.html"):
            raise RuntimeError("Post-swap verification failed: live/index.html missing")

        manifest = LOCAL_ROOT / "asset-manifest.json"
        if manifest.is_file():
            entrypoints = json.loads(manifest.read_text()).get("entrypoints", [])
            missing = [
                e for e in entrypoints
                if not remote_exists(sftp, PurePosixPath(REMOTE_LIVE, e).as_posix())
            ]
            if missing:
                raise RuntimeError(f"Entrypoint(s) missing on server: {missing}")
            log(f"Verified {len(entrypoints)} entrypoint file(s)")

        sftp.close()
        elapsed = time.time() - started
        log(f"Deploy complete in {elapsed:.1f}s: https://roadweather.app")
        if live_existed:
            log(f"Previous version kept as: {prev}")
    finally:
        client.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
