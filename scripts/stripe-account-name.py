"""Read a Stripe /v1/account response on stdin, print a human-readable account label.

A separate file rather than an inline `python3 -c` in stripe.sh: the nested quoting
between bash double quotes, single-quoted python, and JSON keys is a reliable source of
silent breakage, and it broke on the first run.

Prints "ERROR:<message>" when Stripe rejected the key, so the caller can distinguish a bad
key from a network failure. Exits non-zero only on unparseable input.
"""

import json
import sys


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 1

    if "error" in data:
        print("ERROR:" + data["error"].get("message", "unknown error"))
        return 0

    business = data.get("business_profile") or {}
    dashboard = (data.get("settings") or {}).get("dashboard") or {}

    name = business.get("name") or dashboard.get("display_name") or "unnamed account"
    print(name + " (" + data.get("id", "?") + ")")
    return 0


if __name__ == "__main__":
    sys.exit(main())
