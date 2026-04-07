from __future__ import annotations

import argparse
import csv
import json
import socket
import ssl
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# =========================
# Data models
# =========================

@dataclass
class Target:
    host: str
    port: int = 443
    sni: Optional[str] = None
    criticality: str = "med"  # low|med|high|critical
    owner: str = ""
    internet_facing: bool = True  # optional CSV field; default True


@dataclass
class ScanResult:
    host: str
    port: int
    sni: str
    ok: bool
    error: str = ""
    tls_version: Optional[str] = None
    cipher: Optional[Tuple[str, str, int]] = None
    alpn: Optional[str] = None
    der_cert: Optional[bytes] = None
    scan_time_seconds: Optional[float] = None


# =========================
# Time helpers
# =========================

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()

def _parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)

def _days_until(iso_dt: str) -> Optional[int]:
    try:
        dt = _parse_iso(iso_dt)
        now = datetime.now(timezone.utc)
        return int((dt - now).total_seconds() // 86400)
    except Exception:
        return None


# =========================
# Input parsing
# =========================

_CRIT_ALLOWED = {"low", "med", "high", "critical"}

def _parse_bool(s: str, default: bool = True) -> bool:
    v = (s or "").strip().lower()
    if v in {"true", "t", "yes", "y", "1"}:
        return True
    if v in {"false", "f", "no", "n", "0"}:
        return False
    return default

def load_targets_csv(path: str) -> List[Target]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    targets: List[Target] = []
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            norm = {(k or "").strip().lower(): (v or "").strip() for k, v in (row or {}).items()}

            # host aliases
            host = norm.get("host") or norm.get("hostname") or norm.get("fqdn") or norm.get("ip") or ""
            if not host:
                continue

            # port
            port_str = norm.get("port") or "443"
            try:
                port = int(port_str)
            except ValueError:
                port = 443

            # sni aliases
            sni = norm.get("sni") or norm.get("servername") or norm.get("server_name") or host

            # criticality aliases
            criticality = (norm.get("criticality") or norm.get("crit") or "med").lower()
            if criticality not in _CRIT_ALLOWED:
                criticality = "med"

            # owner aliases
            owner = norm.get("owner") or norm.get("team") or norm.get("service_owner") or norm.get("business_owner") or ""

            # exposure aliases
            internet_facing = _parse_bool(
                norm.get("internet_facing") or norm.get("external") or norm.get("public") or norm.get("internet") or "",
                default=True,
            )

            targets.append(Target(
                host=host, port=port, sni=sni,
                criticality=criticality, owner=owner,
                internet_facing=internet_facing,
            ))

    if not targets:
        raise ValueError("No valid targets found in CSV.")
    return targets


# =========================
# TLS fetch
# =========================

def fetch_server_cert(host: str, port: int, sni: str, timeout: float = 6.0) -> ScanResult:
    start = time.time()
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE  # inventory only

        # Harmless ALPN probe for basic insight (h2/http1.1)
        try:
            ctx.set_alpn_protocols(["h2", "http/1.1"])
        except Exception:
            pass

        with socket.create_connection((host, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=sni) as ssock:
                der = ssock.getpeercert(binary_form=True)
                tls_version = ssock.version()
                cipher = ssock.cipher()
                try:
                    alpn = ssock.selected_alpn_protocol()
                except Exception:
                    alpn = None

                return ScanResult(
                    host=host,
                    port=port,
                    sni=sni,
                    ok=True,
                    tls_version=tls_version,
                    cipher=cipher,
                    alpn=alpn,
                    der_cert=der,
                    scan_time_seconds=round(time.time() - start, 3),
                )
    except Exception as e:
        return ScanResult(
            host=host,
            port=port,
            sni=sni,
            ok=False,
            error=f"{type(e).__name__}: {e}",
            scan_time_seconds=round(time.time() - start, 3),
        )


# =========================
# Certificate parsing (cryptography)
# =========================

def parse_leaf_cert(der_bytes: bytes) -> Dict[str, Any]:
    """
    Requires: pip install cryptography
    Imported inside so scan failures can still be reported even without cryptography installed.
    """
    from cryptography import x509
    from cryptography.hazmat.primitives.asymmetric import rsa, ec, ed25519, ed448, dsa

    cert = x509.load_der_x509_certificate(der_bytes)

    subject = cert.subject.rfc4514_string()
    issuer = cert.issuer.rfc4514_string()
    not_before = _iso(cert.not_valid_before_utc)
    not_after = _iso(cert.not_valid_after_utc)
    serial_number = str(cert.serial_number)

    # SAN
    san: List[str] = []
    try:
        ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        san = [str(x) for x in ext.value.get_values_for_type(x509.DNSName)]
    except Exception:
        san = []

    # Basic constraints: CA?
    is_ca = False
    try:
        bc = cert.extensions.get_extension_for_class(x509.BasicConstraints)
        is_ca = bool(bc.value.ca)
    except Exception:
        is_ca = False

    # Key usage
    key_usage: List[str] = []
    try:
        ku = cert.extensions.get_extension_for_class(x509.KeyUsage).value
        flags = {
            "digital_signature": ku.digital_signature,
            "content_commitment": ku.content_commitment,
            "key_encipherment": ku.key_encipherment,
            "data_encipherment": ku.data_encipherment,
            "key_agreement": ku.key_agreement,
            "key_cert_sign": ku.key_cert_sign,
            "crl_sign": ku.crl_sign,
            "encipher_only": getattr(ku, "encipher_only", False),
            "decipher_only": getattr(ku, "decipher_only", False),
        }
        key_usage = [k for k, v in flags.items() if v]
    except Exception:
        key_usage = []

    # Extended key usage (store OIDs for portability)
    extended_key_usage: List[str] = []
    try:
        eku = cert.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value
        extended_key_usage = [oid.dotted_string for oid in eku]
    except Exception:
        extended_key_usage = []

    # Public key info
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

    # Signature algorithm (name or dotted string)
    signature_algo = ""
    try:
        signature_algo = cert.signature_algorithm_oid._name or cert.signature_algorithm_oid.dotted_string
    except Exception:
        signature_algo = ""

    return {
        "subject": subject,
        "issuer": issuer,
        "serial_number": serial_number,
        "not_before": not_before,
        "not_after": not_after,
        "san": san,
        "is_ca": is_ca,
        "key_usage": key_usage,
        "extended_key_usage": extended_key_usage,
        "signature_algo": signature_algo,
        "pubkey_algo": pubkey_algo,
        "pubkey_bits": pubkey_bits,
    }


# =========================
# PQC prioritization scoring (research-aligned + explainable)
# =========================

def score_cert_pqc(
    *,
    pubkey_algo: str,
    pubkey_bits: Optional[int],
    not_before: str,
    not_after: str,
    tls_version: Optional[str],
    signature_algo: str,
    is_ca: bool,
    key_usage: List[str],
    extended_key_usage: List[str],
    criticality: str,
    internet_facing: bool,
) -> Dict[str, Any]:
    """
    Environment-agnostic PQC prioritization rubric (explainable):

      Priority = (DataLifetimeRisk × ExposureRisk) + (CryptoBreakability × MigrationComplexity) + Urgency

    - Not a "CVE-style" quantum vulnerability score.
    - Prioritizes harvest-now-decrypt-later (HNDL) exposure, business impact proxies, and migration difficulty.
    """

    reasons: List[str] = []

    # ---- Normalize / proxy inputs ----
    crit = (criticality or "med").strip().lower()
    crit_weight = {"low": 0.8, "med": 1.0, "high": 1.2, "critical": 1.35}.get(crit, 1.0)

    tv = (tls_version or "").upper()
    sig = (signature_algo or "").lower()
    algo = (pubkey_algo or "").upper()

    # validity length
    validity_days: Optional[int] = None
    try:
        nb = _parse_iso(not_before)
        na = _parse_iso(not_after)
        validity_days = int((na - nb).total_seconds() // 86400)
    except Exception:
        validity_days = None

    days_to_expiry = _days_until(not_after)

    ku = set([k.strip().lower() for k in (key_usage or [])])
    eku = set([e.strip().lower() for e in (extended_key_usage or [])])

    # ---- 1) Crypto Breakability (0..100) ----
    # Baseline signal: RSA/ECC families are Shor targets; treat as "migration signal".
    breakability = 0

    if algo == "RSA":
        breakability = 85
        reasons.append("Breakability: RSA public key (Shor target)")
        if pubkey_bits is not None and pubkey_bits <= 1024:
            breakability = 100
            reasons.append("Breakability: weak RSA key size (<=1024)")
        elif pubkey_bits is not None and pubkey_bits < 2048:
            breakability = min(100, breakability + 10)
            reasons.append("Breakability: RSA key size below 2048")
    elif algo in {"ECDSA", "EC", "ECC"}:
        breakability = 85
        reasons.append("Breakability: ECC public key (Shor target)")
    elif algo in {"ED25519", "ED448"}:
        breakability = 85
        reasons.append(f"Breakability: {algo} (discrete log family; Shor target)")
    elif algo == "DSA":
        breakability = 90
        reasons.append("Breakability: DSA (legacy + Shor target)")
    else:
        breakability = 70
        reasons.append("Breakability: unknown public key algorithm (visibility gap)")

    # Signature hygiene (legacy indicator)
    if "md5" in sig:
        breakability = min(100, breakability + 15)
        reasons.append("Crypto hygiene: MD5 signature (broken)")
    elif "sha1" in sig:
        breakability = min(100, breakability + 10)
        reasons.append("Crypto hygiene: SHA-1 signature (deprecated)")

    breakability = max(0, min(100, breakability))

    # ---- 2) Exposure / Harvestability (0..100) ----
    exposure = 0

    if internet_facing:
        exposure += 55
        reasons.append("Exposure: internet-facing endpoint (higher HNDL harvestability)")
    else:
        exposure += 25
        reasons.append("Exposure: internal-only endpoint (lower harvestability)")

    if "TLSV1.0" in tv or tv == "TLSV1":
        exposure += 35
        reasons.append("Exposure: TLS 1.0 in use (obsolete)")
    elif "TLSV1.1" in tv:
        exposure += 30
        reasons.append("Exposure: TLS 1.1 in use (obsolete)")
    elif "TLSV1.2" in tv:
        exposure += 12
        reasons.append("Exposure: TLS 1.2 in use (prefer TLS 1.3)")
    elif "TLSV1.3" in tv:
        reasons.append("Exposure: TLS 1.3 in use (good)")

    if validity_days is not None and validity_days > 398:
        exposure += 8
        reasons.append(f"Exposure: long-lived certificate validity ({validity_days} days)")

    exposure = max(0, min(100, exposure))

    # ---- 3) Data Lifetime proxy (0..100) ----
    # We cannot see data sensitivity directly; proxy via criticality + certificate role/usages.
    lifetime = int(20 * crit_weight)
    reasons.append(f"Lifetime: criticality '{crit}' weight {crit_weight}")

    if is_ca:
        lifetime += 30
        reasons.append("Lifetime: CA certificate role (broad trust impact)")

    # Key exchange / confidentiality relevance
    if "key_encipherment" in ku or "key_agreement" in ku:
        lifetime += 25
        reasons.append("Lifetime: key exchange usage (confidentiality + HNDL relevant)")

    # Trust infrastructure relevance
    if "key_cert_sign" in ku or "crl_sign" in ku:
        lifetime += 25
        reasons.append("Lifetime: signing trust infrastructure (cert/CRL signing)")

    # EKU (OID-based; portable)
    # serverAuth: 1.3.6.1.5.5.7.3.1
    # clientAuth: 1.3.6.1.5.5.7.3.2
    # codeSigning: 1.3.6.1.5.5.7.3.3
    # emailProtection: 1.3.6.1.5.5.7.3.4
    if "1.3.6.1.5.5.7.3.3" in eku:
        lifetime += 35
        reasons.append("Lifetime: code signing EKU (long-lived trust + high PQC priority)")
    if "1.3.6.1.5.5.7.3.2" in eku:
        lifetime += 15
        reasons.append("Lifetime: client auth EKU (identity/authentication)")
    if "1.3.6.1.5.5.7.3.4" in eku:
        lifetime += 15
        reasons.append("Lifetime: email protection EKU (often long-lived sensitivity)")

    lifetime = max(0, min(100, lifetime))

    # ---- 4) Migration complexity (0..100) ----
    complexity = 10  # baseline

    if is_ca:
        complexity += 55
        reasons.append("Complexity: CA migration affects many dependents")

    if "TLSV1.0" in tv or "TLSV1.1" in tv:
        complexity += 25
        reasons.append("Complexity: obsolete TLS suggests legacy stack/vendor constraints")
    elif "TLSV1.2" in tv:
        complexity += 10
        reasons.append("Complexity: TLS 1.2 may require coordinated upgrades for hybrid/PQC later")

    if validity_days is not None and validity_days > 398:
        complexity += 10
        reasons.append("Complexity: long-lived cert suggests slower rotation/crypto agility")

    complexity = max(0, min(100, complexity))

    # ---- 5) Urgency (expiry) (0..100) ----
    urgency = 0
    if days_to_expiry is not None:
        if days_to_expiry < 0:
            urgency += 35
            reasons.append("Urgency: certificate expired")
        elif days_to_expiry <= 30:
            urgency += 20
            reasons.append(f"Urgency: certificate expires soon ({days_to_expiry} days)")
        elif days_to_expiry <= 90:
            urgency += 8
            reasons.append(f"Urgency: certificate expires within 90 days ({days_to_expiry} days)")

    urgency = max(0, min(100, urgency))

    # ---- Combine into 0..100 priority score ----
    hndl_component = int((lifetime * exposure) / 100)  # 0..100
    plan_component = int((breakability * 0.6) + (complexity * 0.4))  # 0..100

    score = int(
        (hndl_component * 0.55) +
        (plan_component * 0.40) +
        (urgency * 0.15)
    )

    score = max(0, min(100, score))

    if score >= 80:
        severity = "critical"
    elif score >= 60:
        severity = "high"
    elif score >= 35:
        severity = "med"
    else:
        severity = "low"

    return {
        "score": score,
        "severity": severity,
        "reasons": reasons[:18],  # keep CSV readable; tune if you want
        "days_until_expiry": days_to_expiry,

        # Subscores (explainability)
        "sub_breakability": breakability,
        "sub_exposure": exposure,
        "sub_lifetime": lifetime,
        "sub_complexity": complexity,
        "sub_urgency": urgency,
        "sub_hndl_component": hndl_component,
        "sub_plan_component": plan_component,
    }


# =========================
# Reporting
# =========================

def _cipher_split(cipher: Optional[Tuple[str, str, int]]) -> Tuple[str, str, Optional[int]]:
    if not cipher:
        return "", "", None
    name, proto, bits = cipher
    return name or "", proto or "", int(bits) if bits is not None else None

def write_reports(out_dir: str, findings: List[Dict[str, Any]]) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # JSON
    (out / "findings.json").write_text(json.dumps(findings, indent=2), encoding="utf-8")

    # CSV
    fieldnames = [
        "scan_timestamp_utc",
        "target_id",
        "host","port","sni","internet_facing","criticality","owner",
        "ok","error",
        "tls_version","alpn",
        "cipher_name","cipher_protocol","cipher_bits",
        "scan_time_seconds",

        "subject","issuer","serial_number",
        "signature_algo","is_ca",
        "pubkey_algo","pubkey_bits",
        "not_before","not_after","days_until_expiry",
        "san","key_usage","extended_key_usage",

        "score","severity",
        "sub_breakability","sub_exposure","sub_lifetime","sub_complexity","sub_urgency",
        "sub_hndl_component","sub_plan_component",
        "reasons",
    ]

    with (out / "findings.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for item in findings:
            row = dict(item)
            row["san"] = "; ".join(item.get("san", []) or [])
            row["key_usage"] = "; ".join(item.get("key_usage", []) or [])
            row["extended_key_usage"] = "; ".join(item.get("extended_key_usage", []) or [])
            row["reasons"] = "; ".join(item.get("reasons", []) or [])
            w.writerow(row)

    # Summary
    ok = [x for x in findings if x.get("ok")]
    failed = [x for x in findings if not x.get("ok")]

    by_sev = {"critical": 0, "high": 0, "med": 0, "low": 0}
    for x in ok:
        by_sev[x.get("severity", "low")] += 1

    top = sorted(ok, key=lambda x: x.get("score", 0), reverse=True)[:10]

    lines: List[str] = []
    lines.append("PQCScan Summary")
    lines.append("=" * 40)
    lines.append(f"Total targets: {len(findings)}")
    lines.append(f"Successful:   {len(ok)}")
    lines.append(f"Failed:       {len(failed)}")
    lines.append("")
    lines.append("Severity breakdown (successful only):")
    for k in ["critical", "high", "med", "low"]:
        lines.append(f"- {k}: {by_sev[k]}")
    lines.append("")
    lines.append("Top 10 by score:")
    for x in top:
        lines.append(f"- {x['host']}:{x['port']} ({x.get('pubkey_algo')}, score {x.get('score')}, {x.get('severity')})")
        rs = x.get("reasons", []) or []
        if rs:
            lines.append(f"  Reasons: {', '.join(rs[:4])}")

    (out / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


# =========================
# Scan orchestration
# =========================

def scan_one_target(t: Target, timeout: float) -> Dict[str, Any]:
    r = fetch_server_cert(t.host, t.port, t.sni or t.host, timeout=timeout)
    scan_ts = utc_now_iso()
    target_id = f"{t.host}:{t.port}|{t.sni or t.host}"
    cipher_name, cipher_protocol, cipher_bits = _cipher_split(r.cipher)

    base: Dict[str, Any] = {
        "scan_timestamp_utc": scan_ts,
        "target_id": target_id,

        "host": t.host,
        "port": t.port,
        "sni": t.sni or t.host,
        "internet_facing": bool(t.internet_facing),
        "criticality": t.criticality,
        "owner": t.owner,

        "ok": r.ok,
        "error": r.error,
        "tls_version": r.tls_version,
        "alpn": r.alpn,

        "cipher_name": cipher_name,
        "cipher_protocol": cipher_protocol,
        "cipher_bits": cipher_bits,
        "scan_time_seconds": r.scan_time_seconds,

        # Cert fields
        "subject": "",
        "issuer": "",
        "serial_number": "",
        "signature_algo": "",
        "is_ca": False,
        "pubkey_algo": "",
        "pubkey_bits": None,
        "not_before": "",
        "not_after": "",
        "san": [],
        "key_usage": [],
        "extended_key_usage": [],

        # Scoring fields
        "days_until_expiry": None,
        "score": 0,
        "severity": "low",
        "reasons": [],

        "sub_breakability": 0,
        "sub_exposure": 0,
        "sub_lifetime": 0,
        "sub_complexity": 0,
        "sub_urgency": 0,
        "sub_hndl_component": 0,
        "sub_plan_component": 0,
    }

    if r.ok and r.der_cert:
        try:
            ci = parse_leaf_cert(r.der_cert)
            base.update(ci)

            sc = score_cert_pqc(
                pubkey_algo=ci.get("pubkey_algo", ""),
                pubkey_bits=ci.get("pubkey_bits"),
                not_before=ci.get("not_before", ""),
                not_after=ci.get("not_after", ""),
                tls_version=r.tls_version,
                signature_algo=ci.get("signature_algo", ""),
                is_ca=bool(ci.get("is_ca", False)),
                key_usage=ci.get("key_usage", []) or [],
                extended_key_usage=ci.get("extended_key_usage", []) or [],
                criticality=t.criticality,
                internet_facing=bool(t.internet_facing),
            )
            base.update(sc)
        except Exception as e:
            base["ok"] = False
            base["error"] = f"CertParseError: {type(e).__name__}: {e}"
            base["reasons"] = ["Cert parse error"]
    else:
        base["reasons"] = ["Scan failed"]

    return base

def run_scan_from_csv(
    input_csv: str,
    timeout: float = 6.0,
    max_workers: Optional[int] = None,
) -> List[Dict[str, Any]]:
    targets = load_targets_csv(input_csv)
    if max_workers is None:
        max_workers = min(32, max(4, len(targets)))

    findings: List[Dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = {ex.submit(scan_one_target, t, timeout): t for t in targets}
        for fut in as_completed(futs):
            t = futs[fut]
            try:
                findings.append(fut.result())
            except Exception as e:
                findings.append({
                    "scan_timestamp_utc": utc_now_iso(),
                    "target_id": f"{t.host}:{t.port}|{t.sni or t.host}",
                    "host": t.host,
                    "port": t.port,
                    "sni": t.sni or t.host,
                    "internet_facing": bool(t.internet_facing),
                    "criticality": t.criticality,
                    "owner": t.owner,
                    "ok": False,
                    "error": f"WorkerError: {type(e).__name__}: {e}",
                    "tls_version": None,
                    "alpn": None,
                    "cipher_name": "",
                    "cipher_protocol": "",
                    "cipher_bits": None,
                    "scan_time_seconds": None,
                    "subject": "",
                    "issuer": "",
                    "serial_number": "",
                    "signature_algo": "",
                    "is_ca": False,
                    "pubkey_algo": "",
                    "pubkey_bits": None,
                    "not_before": "",
                    "not_after": "",
                    "san": [],
                    "key_usage": [],
                    "extended_key_usage": [],
                    "days_until_expiry": None,
                    "score": 0,
                    "severity": "low",
                    "reasons": ["Unhandled worker exception"],
                    "sub_breakability": 0,
                    "sub_exposure": 0,
                    "sub_lifetime": 0,
                    "sub_complexity": 0,
                    "sub_urgency": 0,
                    "sub_hndl_component": 0,
                    "sub_plan_component": 0,
                })

    # Highest risk first, failures last
    findings.sort(key=lambda x: (not x.get("ok", False), -(x.get("score", 0))))
    return findings


# =========================
# CLI
# =========================

def cmd_scan(args: argparse.Namespace) -> int:
    findings = run_scan_from_csv(
        args.input,
        timeout=args.timeout,
        max_workers=args.workers,
    )
    write_reports(args.out, findings)
    print(f"✅ Done. Wrote reports to: {args.out}")
    return 0

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="pqcscan",
        description="PQC readiness TLS certificate scanner (single-file, environment-agnostic MVP)",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="Scan targets and write reports")
    s.add_argument("--input", required=True, help="CSV file with at least 'host' column")
    s.add_argument("--out", required=True, help="Output directory")
    s.add_argument("--timeout", type=float, default=6.0, help="Socket timeout seconds (default 6)")
    s.add_argument("--workers", type=int, default=None, help="Thread workers for scanning (default: auto)")
    s.set_defaults(func=cmd_scan)

    return p

def main() -> int:
    args = build_parser().parse_args()
    return args.func(args)

if __name__ == "__main__":
    raise SystemExit(main())
