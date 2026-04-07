# PQCScan Summary

- Total targets: **9**
- Successful: **8**
- Failed: **1**

## Severity breakdown (successful only)
- critical: **0**
- high: **0**
- med: **3**
- low: **5**

## Top 10 by score

| Severity | Score | Host | TLS | PubKey | Days to Expiry | Reasons |
|---|---:|---|---|---|---:|---|
| MED | 37 | tls-v1-2.badssl.com:443 | TLSv1.2 | RSA 2048 | 84 | Breakability: RSA public key (Shor target); Exposure: internet-facing endpoint … |
| MED | 37 | badssl.com:443 | TLSv1.2 | RSA 2048 | 84 | Breakability: RSA public key (Shor target); Exposure: internet-facing endpoint … |
| MED | 37 | tls13.badssl.com:443 | TLSv1.2 | RSA 2048 | -2727 | Breakability: RSA public key (Shor target); Exposure: internet-facing endpoint … |
| LOW | 32 | developers.cloudflare.com:8443 | TLSv1.3 | ECDSA 256 | 69 | Breakability: ECC public key (Shor target); Exposure: internet-facing endpoint … |
| LOW | 30 | test.mosquitto.org:8883 | TLSv1.3 | RSA 2048 | 1592 | Breakability: RSA public key (Shor target); Exposure: internet-facing endpoint … |
| LOW | 27 | www.cloudflare.com:443 | TLSv1.3 | ECDSA 256 | 87 | Breakability: ECC public key (Shor target); Exposure: internet-facing endpoint … |
| LOW | 27 | example.com:443 | TLSv1.3 | ECDSA 256 | 49 | Breakability: ECC public key (Shor target); Exposure: internet-facing endpoint … |
| LOW | 27 | example.com:8443 | TLSv1.3 | ECDSA 256 | 49 | Breakability: ECC public key (Shor target); Exposure: internet-facing endpoint … |
