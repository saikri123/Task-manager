from __future__ import annotations

import argparse
import csv
import json
import socket
import ssl
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---- Data models ----

@dataclass
class Target:
    host: str
    port: int = 443
    sni: Optional[str] = None
    criticality: str = "med"
    owner: str = ""


@dataclass
class ScanResult:
    host: str
    port: int
    sni: str
    ok: bool
    error: str = ""
    tls_version: Optional[str] = None
    cipher: Optional[Tuple[str, str, int]] = None
    der_cert: Optional[bytes] = None
    scan_time_seconds: Optional[float] = None


# ---- Helpers: input ----

def load_targets_csv(path: str) -> List[Target]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    targets: List[Target] = []
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            norm = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}

            host = norm.get("host", "")
            if not host:
                continue

            port_str = norm.get("port") or "443"
            try:
                port = int(port_str)
            except ValueError:
                port = 443

            sni = norm.get("sni") or host
            criticality = (norm.get("criticality") or "med").lower()
            owner = norm.get("owner") or ""

            targets.append(Target(host=host, port=port, sni=sni, criticality=criticality, owner=owner))

    if not targets:
        raise ValueError("No valid targets found in CSV.")
    return targets


# ---- Helpers: TLS fetch ----

def fetch_server_cert(host: str, port: int, sni: str, timeout: float = 6.0) -> ScanResult:
    start = time.time()
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE  # inventory only

        with socket.create_connection((host, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=sni) as ssock:
                der = ssock.getpeercert(binary_form=True)
                tls_version = ssock.version()
                cipher = ssock.cipher()
                return ScanResult(
                    host=host,
                    port=port,
                    sni=sni,
                    ok=True,
                    tls_version=tls_version,
                    cipher=cipher,
                    der_cert=der,
                    scan_time_seconds=round(time.time() - start, 3),
                )
    except Exception as e:
        return ScanResult(
            host=host,
            port=port,
            sni=sni,
            ok=False,
            error=str(e),
            scan_time_seconds=round(time.time() - start, 3),
        )


# ---- Helpers: cert parsing (requires cryptography) ----

def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()

def parse_leaf_cert(der_bytes: bytes) -> Dict[str, Any]:
    # Import here so the script can still run scan failures even if cryptography isn't installed yet
    from cryptography import x509
    from cryptography.hazmat.primitives.asymmetric import rsa, ec, ed25519, ed448, dsa

    cert = x509.load_der_x509_certificate(der_bytes)

    subject = cert.subject.rfc4514_string()
    issuer = cert.issuer.rfc4514_string()
    not_before = _iso(cert.not_valid_before)
    not_after = _iso(cert.not_valid_after)

    san: List[str] = []
    try:
        ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        san = [str(x) for x in ext.value.get_values_for_type(x509.DNSName)]
    except Exception:
        san = []

    pub = cert.public_key()
    pubkey_algo = "UNKNOWN"
    pubkey_bits: Optional[int] = None

    if isinstance(pub, rsa.RSAPublicKey):
        pubkey_algo = "RSA"
        pubkey_bits = pub.key_size
    elif isinstance(pub, ec.EllipticCurvePublicKey):
        pubkey_algo = "ECDSA"
        pubkey_bits = pub.key_size
    elif isinstance(pub, ed25519.Ed25519PublicKey):
        pubkey_algo = "Ed25519"
    elif isinstance(pub, ed448.Ed448PublicKey):
        pubkey_algo = "Ed448"
    elif isinstance(pub, dsa.DSAPublicKey):
        pubkey_algo = "DSA"
        pubkey_bits = pub.key_size

    return {
        "subject": subject,
        "issuer": issuer,
        "not_before": not_before,
        "not_after": not_after,
        "san": san,
        "pubkey_algo": pubkey_algo,
        "pubkey_bits": pubkey_bits,
    }


# ---- Scoring (simple + explainable) ----

def _parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)

def _days_until(iso_dt: str) -> Optional[int]:
    try:
        dt = _parse_iso(iso_dt)
        now = datetime.now(timezone.utc)
        return int((dt - now).total_seconds() // 86400)
    except Exception:
        return None

def score_cert(pubkey_algo: str, pubkey_bits: Optional[int], not_before: str, not_after: str) -> Dict[str, Any]:
    score = 0
    reasons: List[str] = []

    # PQC migration target signal
    if pubkey_algo == "RSA":
        score += 30
        reasons.append("RSA certificate (migration target)")
        if pubkey_bits is not None and pubkey_bits <= 1024:
            score += 60
            reasons.append("Weak RSA key size (<=1024)")
        elif pubkey_bits is not None and pubkey_bits < 2048:
            score += 25
            reasons.append("RSA key size below 2048")
    elif pubkey_algo == "ECDSA":
        score += 20
        reasons.append("ECDSA certificate (migration target)")
    elif pubkey_algo in ("Ed25519", "Ed448"):
        score += 5
        reasons.append(f"{pubkey_algo} certificate (modern, still plan migration)")
    elif pubkey_algo == "DSA":
        score += 40
        reasons.append("DSA certificate (legacy/avoid)")
    else:
        score += 15
        reasons.append("Unknown public key algorithm (visibility gap)")

    # Operational risk: expiry
    days = _days_until(not_after)
    if days is not None:
        if days < 0:
            score += 50
            reasons.append("Certificate expired")
        elif days <= 30:
            score += 25
            reasons.append(f"Certificate expires soon ({days} days)")
        elif days <= 90:
            score += 10
            reasons.append(f"Certificate expires within 90 days ({days} days)")

    # Long-lived validity
    try:
        nb = _parse_iso(not_before)
        na = _parse_iso(not_after)
        validity_days = int((na - nb).total_seconds() // 86400)
        if validity_days > 398:
            score += 10
            reasons.append(f"Long-lived certificate validity ({validity_days} days)")
    except Exception:
        pass

    score = max(0, min(100, score))
    if score >= 80:
        severity = "critical"
    elif score >= 60:
        severity = "high"
    elif score >= 35:
        severity = "med"
    else:
        severity = "low"

    return {"score": score, "severity": severity, "reasons": reasons, "days_until_expiry": days}


# ---- Reports ----

def write_reports(out_dir: str, findings: List[Dict[str, Any]]) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # JSON
    (out / "findings.json").write_text(json.dumps(findings, indent=2), encoding="utf-8")

    # CSV
    fieldnames = [
        "host","port","sni","ok","error",
        "tls_version","cipher","scan_time_seconds",
        "subject","issuer","pubkey_algo","pubkey_bits",
        "not_before","not_after","days_until_expiry","san",
        "score","severity","reasons",
        "criticality","owner"
    ]
    with (out / "findings.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for item in findings:
            row = dict(item)
            row["san"] = "; ".join(item.get("san", []) or [])
            row["reasons"] = "; ".join(item.get("reasons", []) or [])
            w.writerow(row)

    # Summary
    ok = [x for x in findings if x.get("ok")]
    failed = [x for x in findings if not x.get("ok")]

    by_sev = {"critical":0,"high":0,"med":0,"low":0}
    for x in ok:
        by_sev[x.get("severity","low")] += 1

    top = sorted(ok, key=lambda x: x.get("score", 0), reverse=True)[:10]

    lines = []
    lines.append("PQCScan Summary")
    lines.append("="*40)
    lines.append(f"Total targets: {len(findings)}")
    lines.append(f"Successful:   {len(ok)}")
    lines.append(f"Failed:       {len(failed)}")
    lines.append("")
    lines.append("Severity breakdown (successful only):")
    for k in ["critical","high","med","low"]:
        lines.append(f"- {k}: {by_sev[k]}")
    lines.append("")
    lines.append("Top 10 by score:")
    for x in top:
        lines.append(f"- {x['host']}:{x['port']} ({x.get('pubkey_algo')}, score {x.get('score')}, {x.get('severity')})")
        rs = x.get("reasons", []) or []
        if rs:
            lines.append(f"  Reasons: {', '.join(rs[:4])}")

    (out / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---- CLI command ----

def cmd_scan(args: argparse.Namespace) -> int:
    targets = load_targets_csv(args.input)
    findings: List[Dict[str, Any]] = []

    for t in targets:
        r = fetch_server_cert(t.host, t.port, t.sni or t.host, timeout=args.timeout)
        base: Dict[str, Any] = {
            "host": t.host,
            "port": t.port,
            "sni": t.sni or t.host,
            "criticality": t.criticality,
            "owner": t.owner,
            "ok": r.ok,
            "error": r.error,
            "tls_version": r.tls_version,
            "cipher": None if not r.cipher else f"{r.cipher[0]} ({r.cipher[1]},{r.cipher[2]})",
            "scan_time_seconds": r.scan_time_seconds,
            "subject": "",
            "issuer": "",
            "pubkey_algo": "",
            "pubkey_bits": None,
            "not_before": "",
            "not_after": "",
            "san": [],
            "days_until_expiry": None,
            "score": 0,
            "severity": "low",
            "reasons": [],
        }

        if r.ok and r.der_cert:
            try:
                ci = parse_leaf_cert(r.der_cert)
                sc = score_cert(ci["pubkey_algo"], ci["pubkey_bits"], ci["not_before"], ci["not_after"])
                base.update(ci)
                base.update(sc)
            except Exception as e:
                base["ok"] = False
                base["error"] = f"Cert parse error: {e}"
                base["reasons"] = ["Cert parse error"]
        else:
            base["reasons"] = ["Scan failed"]

        findings.append(base)

    write_reports(args.out, findings)
    print(f"✅ Done. Wrote reports to: {args.out}")
    return 0

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pqcscan", description="PQC readiness TLS certificate scanner (single-file MVP)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="Scan targets and write reports")
    s.add_argument("--input", required=True, help="CSV file with at least 'host' column")
    s.add_argument("--out", required=True, help="Output directory")
    s.add_argument("--timeout", type=float, default=6.0, help="Socket timeout seconds (default 6)")
    s.set_defaults(func=cmd_scan)

    return p

def main() -> int:
    args = build_parser().parse_args()
    return args.func(args)

if __name__ == "__main__":
    raise SystemExit(main())
