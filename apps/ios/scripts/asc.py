#!/usr/bin/env python3
"""Small App Store Connect API helper for the release workflow (no extra packages).

    asc.py ensure-bundle-id com.datascratch.app "Datascratch"   # register if missing, enable Associated Domains
    asc.py check-app com.datascratch.app                        # fail with a clear message if no app record
    asc.py prune-ci-certs                                       # revoke development certificates made by earlier CI runs

Credentials come from the environment: KEY_ID, ISSUER_ID, KEY_PATH (the .p8 file).
The JWT (ES256) is signed with the `openssl` command line tool.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.appstoreconnect.apple.com/v1"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def der_to_raw(der: bytes) -> bytes:
    """ECDSA DER signature (SEQUENCE of two INTEGERs) -> 64-byte r||s."""
    assert der[0] == 0x30
    i = 2 if der[1] < 0x80 else 2 + (der[1] & 0x7F)
    parts = []
    for _ in range(2):
        assert der[i] == 0x02
        length = der[i + 1]
        value = der[i + 2:i + 2 + length].lstrip(b"\x00")
        parts.append(value.rjust(32, b"\x00"))
        i += 2 + length
    return parts[0] + parts[1]


def token() -> str:
    header = {"alg": "ES256", "kid": os.environ["KEY_ID"], "typ": "JWT"}
    now = int(time.time())
    payload = {"iss": os.environ["ISSUER_ID"], "iat": now, "exp": now + 15 * 60, "aud": "appstoreconnect-v1"}
    signing_input = f"{b64url(json.dumps(header).encode())}.{b64url(json.dumps(payload).encode())}"
    der = subprocess.run(["openssl", "dgst", "-sha256", "-sign", os.environ["KEY_PATH"]],
                         input=signing_input.encode(), capture_output=True, check=True).stdout
    return f"{signing_input}.{b64url(der_to_raw(der))}"


def call(method: str, path: str, body=None):
    request = urllib.request.Request(API + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None)
    request.add_header("Authorization", "Bearer " + token())
    request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise SystemExit(f"::error::App Store Connect API {method} {path} -> {error.code}: {detail[:500]}")


def ensure_bundle_id(identifier: str, name: str) -> None:
    query = urllib.parse.urlencode({"filter[identifier]": identifier, "filter[platform]": "IOS"})
    found = [b for b in call("GET", f"/bundleIds?{query}")["data"] if b["attributes"]["identifier"] == identifier]
    if found:
        bundle = found[0]
        print(f"Bundle ID {identifier} is registered.")
    else:
        bundle = call("POST", "/bundleIds", {"data": {"type": "bundleIds", "attributes": {
            "identifier": identifier, "name": name, "platform": "IOS"}}})["data"]
        print(f"Registered bundle ID {identifier}.")
    # The capability is a safety net (automatic signing enables it too), so a failure here only warns.
    try:
        capabilities = call("GET", f"/bundleIds/{bundle['id']}/bundleIdCapabilities")["data"]
        if any(c["attributes"].get("capabilityType") == "ASSOCIATED_DOMAINS" for c in capabilities):
            print("Associated Domains is enabled.")
            return
        call("POST", "/bundleIdCapabilities", {"data": {
            "type": "bundleIdCapabilities",
            "attributes": {"capabilityType": "ASSOCIATED_DOMAINS"},
            "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bundle["id"]}}}}})
        print("Enabled Associated Domains.")
    except SystemExit as error:
        print(str(error).replace("::error", "::warning", 1))


def check_app(identifier: str) -> None:
    query = urllib.parse.urlencode({"filter[bundleId]": identifier})
    apps = call("GET", f"/apps?{query}")["data"]
    if not apps:
        raise SystemExit(
            f"::error title=No app in App Store Connect::Create the app in App Store Connect first "
            f"(https://appstoreconnect.apple.com/apps → + → New App, Bundle ID {identifier}); "
            f"an app record cannot be created through the API. See apps/ios/RELEASE.md, step 3.")
    print(f"App record: {apps[0]['attributes'].get('name')} ({identifier}).")


# Every release run starts on a fresh runner, so cloud signing makes a new development
# certificate through the API key each time; Apple caps their number per account.
# Those certificates are useless once the runner is gone. Only certificates the API
# key created are touched: ones made in Xcode on a Mac carry the person's name.
CI_CERT_MARK = "Created via API"
DEVELOPMENT_TYPES = {"DEVELOPMENT", "IOS_DEVELOPMENT"}


def prune_ci_certs() -> None:
    certificates = call("GET", "/certificates?limit=200")["data"]
    revoked = 0
    for cert in certificates:
        attributes = cert["attributes"]
        name = attributes.get("displayName") or attributes.get("name") or ""
        until = (attributes.get("expirationDate") or "")[:10]
        if attributes.get("certificateType") in DEVELOPMENT_TYPES and CI_CERT_MARK in f"{name} {attributes.get('name') or ''}":
            call("DELETE", f"/certificates/{cert['id']}")
            revoked += 1
            print(f"revoked: {attributes.get('certificateType')} | {name} | until {until}")
        else:
            # The log is public: never print the name of a person's certificate.
            print(f"kept:    {attributes.get('certificateType')} | (not made by CI) | until {until}")
    print(f"Revoked {revoked} CI development certificate(s); {len(certificates) - revoked} kept.")


if __name__ == "__main__":
    command, *args = sys.argv[1:] or ["help"]
    if command == "ensure-bundle-id":
        ensure_bundle_id(args[0], args[1] if len(args) > 1 else args[0])
    elif command == "check-app":
        check_app(args[0])
    elif command == "prune-ci-certs":
        prune_ci_certs()
    else:
        print(__doc__)
        sys.exit(2)
