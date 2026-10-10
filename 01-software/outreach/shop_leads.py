#!/usr/bin/env python3
"""Build and work a list of US phone repair shops for Back Glass Pros outreach.

Standard library only, no paid tools, no API keys.

    # 1. Build the list (OpenStreetMap + each shop's own website for a public email)
    python3 shop_leads.py build --states TX,OK
    python3 shop_leads.py build --all-states --seed extra.csv

    # 2. Each morning: who is due which email today (respects the daily cap)
    python3 shop_leads.py due --cap 50

The list is private business data. It is written under 03-data/ (gitignored)
by default and must never be committed. Nothing here sends email.
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import csv
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "03-data" / "leads" / "shops.csv"
OVERPASS = "https://overpass-api.de/api/interpreter"
USER_AGENT = "BackGlassProsLeadBuilder/1.0 (+https://backglasspros.com)"

STATES = (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS "
    "MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
).split()

# Same-day delivery area (Michael, Dallas). Priority 1.
DFW_CITIES = {
    "dallas", "fort worth", "arlington", "plano", "irving", "garland",
    "grand prairie", "mesquite", "carrollton", "richardson", "frisco",
    "mckinney", "denton", "lewisville", "allen", "addison", "farmers branch",
    "euless", "bedford", "hurst", "grapevine", "coppell", "flower mound",
    "the colony", "rowlett", "duncanville", "desoto", "cedar hill", "lancaster",
    "north richland hills", "haltom city", "keller", "southlake", "mansfield",
    "rockwall", "wylie", "sachse", "little elm", "prosper", "balch springs",
}

# Stores that sell phones but do not buy repair parts.
EXCLUDE_NAMES = re.compile(
    r"\b(t-?mobile|verizon|at&t|at ?and ?t|cricket|metro ?by|metropcs|boost|"
    r"sprint|us cellular|u\.s\. cellular|apple store|best buy|walmart|target|"
    r"gamestop|xfinity|spectrum|visible|straight talk|simple mobile|h2o|"
    r"total wireless|tracfone|consumer cellular|google fi|mint mobile)\b",
    re.I,
)
CHAIN_NAMES = re.compile(
    r"\b(ubreakifix|asurion|cpr cell|cell ?phone repair \(cpr\)|experimax|"
    r"batteries plus|iTech|gadget ?fix|fixt|mr\.? ?phone|wireless zone|"
    r"phone medic|simply mac|the fix|iCracked|puls)\b",
    re.I,
)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}")
JUNK_EMAIL = re.compile(
    r"(example\.|domain\.|yourdomain|email\.com$|sentry|wixpress|"
    r"\.(png|jpe?g|gif|svg|webp|css|js)$|godaddy|squarespace|shopify|"
    r"wordpress|schema\.org|@2x|noreply|no-reply|donotreply)",
    re.I,
)
CONTACT_PATHS = ("", "/contact", "/contact-us", "/contact/", "/about")

FIELDS = [
    "lead_id", "business_name", "chain", "address", "city", "state", "zip",
    "phone", "email", "email_source", "website", "source", "priority",
    # tracking, filled in as outreach runs
    "status", "step1_sent", "step2_sent", "step3_sent", "replied",
    "reply_date", "outcome", "unsubscribed", "notes",
]


# ---------------------------------------------------------------- helpers


def digits(phone: str) -> str:
    d = re.sub(r"\D", "", phone or "")
    return d[-10:] if len(d) >= 10 else d


def fmt_phone(phone: str) -> str:
    d = digits(phone)
    return f"({d[:3]}) {d[3:6]}-{d[6:]}" if len(d) == 10 else (phone or "").strip()


def norm_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def host_of(url: str) -> str:
    try:
        return urllib.parse.urlparse(url).hostname or ""
    except ValueError:
        return ""


def clean_emails(text: str, website: str = "") -> list[str]:
    """Return plausible public business emails found in text, best first."""
    site = host_of(website).removeprefix("www.")
    seen: dict[str, None] = {}
    for m in EMAIL_RE.findall(text or ""):
        e = m.strip(".").lower()
        if JUNK_EMAIL.search(e) or len(e) > 80:
            continue
        seen.setdefault(e, None)
    emails = list(seen)
    # Prefer an address on the shop's own domain.
    emails.sort(key=lambda e: (0 if site and e.endswith("@" + site) else 1))
    return emails


def priority(city: str, state: str) -> str:
    if state == "TX" and (city or "").strip().lower() in DFW_CITIES:
        return "1"  # same-day delivery area
    if state in ("TX", "OK"):
        return "2"
    return "3"


def http_get(url: str, timeout: float = 12.0, data: bytes | None = None) -> str:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read(1_500_000)
        charset = r.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, "replace")


# ---------------------------------------------------------------- sources


def overpass_query(state: str) -> str:
    sel = [
        'nwr["shop"="mobile_phone"](area.a);',
        'nwr["shop"="electronics_repair"](area.a);',
        'nwr["craft"="electronics_repair"](area.a);',
        'nwr["service:mobile_phone:repair"="yes"](area.a);',
        'nwr["repair"~"mobile_phone|phone|smartphone"](area.a);',
    ]
    return (
        f'[out:json][timeout:180];area["ISO3166-2"="US-{state}"]->.a;'
        f"({''.join(sel)});out tags center;"
    )


def from_osm(state: str) -> list[dict]:
    body = urllib.parse.urlencode({"data": overpass_query(state)}).encode()
    for attempt in range(4):
        try:
            data = json.loads(http_get(OVERPASS, timeout=240, data=body))
            break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            wait = 15 * (attempt + 1)
            print(f"  {state}: overpass error {e}; retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
    else:
        return []
    rows = []
    for el in data.get("elements", []):
        t = el.get("tags", {})
        name = t.get("name") or t.get("brand") or ""
        if not name or EXCLUDE_NAMES.search(name) or EXCLUDE_NAMES.search(t.get("brand", "")):
            continue
        city = t.get("addr:city", "")
        street = " ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street")) if x)
        unit = t.get("addr:unit", "")
        rows.append({
            "business_name": name,
            "chain": "yes" if (t.get("brand") or CHAIN_NAMES.search(name)) else "",
            "address": f"{street} {unit}".strip(),
            "city": city,
            "state": t.get("addr:state", state) or state,
            "zip": t.get("addr:postcode", ""),
            "phone": fmt_phone(t.get("phone") or t.get("contact:phone", "")),
            "email": (t.get("email") or t.get("contact:email", "")).lower(),
            "email_source": "osm" if (t.get("email") or t.get("contact:email")) else "",
            "website": t.get("website") or t.get("contact:website") or t.get("url", ""),
            "source": f"osm:{el.get('type')}/{el.get('id')}",
        })
    return rows


def from_seed(path: Path) -> list[dict]:
    rows = []
    with path.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not r.get("business_name") or EXCLUDE_NAMES.search(r["business_name"]):
                continue
            rows.append({
                "business_name": r.get("business_name", "").strip(),
                "chain": r.get("chain", "").strip(),
                "address": r.get("address", "").strip(),
                "city": r.get("city", "").strip(),
                "state": r.get("state", "").strip().upper(),
                "zip": r.get("zip", "").strip(),
                "phone": fmt_phone(r.get("phone", "")),
                "email": r.get("email", "").strip().lower(),
                "email_source": "seed" if r.get("email") else "",
                "website": r.get("website", "").strip(),
                "source": r.get("source_url") or r.get("source") or f"seed:{path.name}",
            })
    return rows


def find_email(row: dict) -> dict:
    """Look for a public email on the shop's own website (home and contact pages)."""
    site = row.get("website", "").strip()
    if not site or row.get("email"):
        return row
    if not site.startswith("http"):
        site = "https://" + site
    base = site.rstrip("/")
    root = f"{urllib.parse.urlparse(base).scheme}://{host_of(base)}"
    for path in CONTACT_PATHS:
        url = (base if path == "" else root + path)
        try:
            html = http_get(url)
        except Exception:  # noqa: BLE001 - dead sites are common; move on
            if path == "":
                return row
            continue
        mailto = " ".join(re.findall(r"mailto:([^\"'?>\s]+)", html))
        found = clean_emails(mailto + " " + html, base)
        if found:
            row["email"], row["email_source"] = found[0], url
            return row
    return row


# ---------------------------------------------------------------- merge


def merge(rows: list[dict], existing: list[dict]) -> list[dict]:
    """Dedupe on email, phone, then name+city. Existing rows keep their tracking."""
    out: list[dict] = []
    index: dict[str, int] = {}

    def keys(r):
        k = []
        if r.get("email"):
            k.append("e:" + r["email"].lower())
        if digits(r.get("phone", "")):
            k.append("p:" + digits(r["phone"]))
        k.append("n:" + norm_name(r.get("business_name", "")) + "|" + (r.get("city") or "").lower())
        return k

    for r in existing + rows:
        hit = next((index[k] for k in keys(r) if k in index), None)
        if hit is None:
            out.append({f: r.get(f, "") for f in FIELDS})
            hit = len(out) - 1
        else:
            cur = out[hit]
            for f in ("address", "city", "zip", "phone", "email", "email_source", "website", "chain"):
                if not cur.get(f) and r.get(f):
                    cur[f] = r[f]
        for k in keys(out[hit]):
            index.setdefault(k, hit)

    next_id = 1 + max((int(r["lead_id"][1:]) for r in out if re.fullmatch(r"L\d+", r.get("lead_id", ""))), default=0)
    for r in out:
        if not r.get("lead_id"):
            r["lead_id"], next_id = f"L{next_id:05d}", next_id + 1
        r["state"] = (r.get("state") or "").upper()
        r["priority"] = priority(r.get("city", ""), r["state"])
        r["status"] = r.get("status") or ("new" if r.get("email") else "no_email")
    out.sort(key=lambda r: (r["priority"], r["state"], r.get("city", "").lower(), r["business_name"].lower()))
    return out


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    tmp.replace(path)


# ---------------------------------------------------------------- commands


def cmd_build(a) -> None:
    states = STATES if a.all_states else [s.strip().upper() for s in a.states.split(",") if s.strip()]
    rows: list[dict] = []
    for seed in a.seed or []:
        rows += from_seed(Path(seed))
        print(f"seed {seed}: {len(rows)} rows so far")
    if not a.no_osm:
        for s in states:
            got = from_osm(s)
            print(f"osm {s}: {len(got)} shops")
            rows += got
            time.sleep(2)  # be polite to the free Overpass server
    if not a.no_crawl:
        todo = [r for r in rows if r.get("website") and not r.get("email")]
        print(f"checking {len(todo)} shop websites for a public email ...")
        with cf.ThreadPoolExecutor(max_workers=a.workers) as ex:
            for n, _ in enumerate(ex.map(find_email, todo), 1):
                if n % 50 == 0:
                    print(f"  {n}/{len(todo)}")
    out = merge(rows, read_csv(Path(a.out)))
    write_csv(Path(a.out), out)
    with_email = sum(1 for r in out if r.get("email"))
    print(f"wrote {len(out)} shops ({with_email} with email) to {a.out}")


def cmd_due(a) -> None:
    """Print today's sends: follow-ups first, then new leads, up to --cap."""
    rows = read_csv(Path(a.out))
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()

    def days_since(s: str) -> int:
        return (today - dt.date.fromisoformat(s)).days if s else -1

    def stopped(r):
        return (r.get("replied") or r.get("unsubscribed") or
                r.get("status") in ("replied", "unsubscribed", "bounced", "no_email", "do_not_contact"))

    due = []
    for r in rows:
        if stopped(r) or not r.get("email"):
            continue
        if r.get("step2_sent") and not r.get("step3_sent") and days_since(r["step2_sent"]) >= 7:
            due.append((0, "step3", r))
        elif r.get("step1_sent") and not r.get("step2_sent") and days_since(r["step1_sent"]) >= 4:
            due.append((0, "step2", r))
        elif not r.get("step1_sent"):
            due.append((1, "step1", r))
    due.sort(key=lambda x: (x[0], x[2].get("priority", "3")))
    picked = due[: a.cap]
    w = csv.writer(sys.stdout)
    w.writerow(["lead_id", "step", "email", "business_name", "city", "priority"])
    for _, step, r in picked:
        w.writerow([r["lead_id"], step, r["email"], r["business_name"], r.get("city", ""), r.get("priority", "")])
    print(f"# {len(picked)} due today of {len(due)} pending (cap {a.cap})", file=sys.stderr)


def main(argv=None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default=str(DEFAULT_OUT), help="lead CSV (private, never commit)")
    sub = p.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("build", help="pull shops and look up public emails")
    b.add_argument("--states", default="TX,OK")
    b.add_argument("--all-states", action="store_true")
    b.add_argument("--seed", action="append", help="extra CSV(s) with business_name,city,state,phone,email,website")
    b.add_argument("--no-osm", action="store_true")
    b.add_argument("--no-crawl", action="store_true")
    b.add_argument("--workers", type=int, default=12)
    b.set_defaults(func=cmd_build)

    d = sub.add_parser("due", help="list today's emails to send, follow-ups first")
    d.add_argument("--cap", type=int, default=50)
    d.add_argument("--today", help="YYYY-MM-DD, for testing")
    d.set_defaults(func=cmd_due)

    a = p.parse_args(argv)
    a.func(a)


if __name__ == "__main__":
    main()
