"""Full backup of the live roadweather.app site before a deploy (pure SFTP).

This DreamHost account is SFTP-only (SSH command execution is disabled), so the
backup is taken by recursively downloading the live site over SFTP and then
zipping it locally for safekeeping.

Output:
  <repo>/backups/roadweather.app-backup-<timestamp>/      (raw files)
  <repo>/backups/roadweather.app-backup-<timestamp>.zip   (single archive)

Read-only to the live site. Does not modify anything on the server.

Usage:
    python scripts/backup_prod.py
"""

from __future__ import annotations

from pathlib import Path
from datetime import datetime, timezone
import base64
import shutil
import stat
import sys
import xml.etree.ElementTree as ET

try:
    import paramiko
except ImportError:
    sys.exit("paramiko is not installed. Run:  pip install paramiko")

REPO_ROOT = Path(__file__).resolve().parent.parent
LOCAL_BACKUP_DIR = REPO_ROOT / "backups"
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


def _is_dir(sftp, entry, remote_child: str) -> bool:
    if stat.S_ISDIR(entry.st_mode):
        return True
    if stat.S_ISLNK(entry.st_mode):
        # Resolve symlink target to decide dir vs file.
        try:
            return stat.S_ISDIR(sftp.stat(remote_child).st_mode)
        except IOError:
            return False
    return False


# DreamHost diagnostics dir contains a self-referential symlink loop
# (.dh-diag/diag/diag/...) that is not real site content — skip it.
SKIP_NAMES = {".dh-diag"}


def download_tree(sftp, remote_path: str, local_path: Path, stats: dict) -> None:
    local_path.mkdir(parents=True, exist_ok=True)
    for entry in sftp.listdir_attr(remote_path):
        if entry.filename in SKIP_NAMES:
            continue
        remote_child = f"{remote_path}/{entry.filename}"
        local_child = local_path / entry.filename
        if _is_dir(sftp, entry, remote_child):
            download_tree(sftp, remote_child, local_child, stats)
        else:
            try:
                sftp.get(remote_child, str(local_child))
                stats["files"] += 1
                stats["bytes"] += local_child.stat().st_size
                if stats["files"] % 10 == 0:
                    log(f"  downloaded {stats['files']} files ...")
            except IOError as exc:
                stats["failed"].append(remote_child)
                log(f"  WARNING: could not download {remote_child}: {exc}")
                if local_child.exists():
                    try:
                        local_child.unlink()
                    except OSError:
                        pass


def main() -> None:
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

    try:
        sftp = client.open_sftp()
        try:
            sftp.stat(REMOTE_LIVE)
        except IOError:
            raise RuntimeError(f"Live directory '{REMOTE_LIVE}' not found on server; nothing to back up.")

        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        dest_dir = LOCAL_BACKUP_DIR / f"roadweather.app-backup-{stamp}"
        log(f"Downloading live site to {dest_dir} ...")
        stats = {"files": 0, "bytes": 0, "failed": []}
        download_tree(sftp, REMOTE_LIVE, dest_dir, stats)
        sftp.close()
        log(f"Downloaded {stats['files']} files ({stats['bytes']:,} bytes)")
        if stats["failed"]:
            log(f"WARNING: {len(stats['failed'])} entr(y/ies) could not be downloaded:")
            for path in stats["failed"]:
                log(f"    - {path}")

        log("Creating local zip archive ...")
        zip_base = str(dest_dir)
        zip_path = shutil.make_archive(zip_base, "zip", root_dir=dest_dir)
        zip_bytes = Path(zip_path).stat().st_size
        log(f"Backup archive: {zip_path} ({zip_bytes:,} bytes)")
        log("Backup complete.")
    finally:
        client.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
