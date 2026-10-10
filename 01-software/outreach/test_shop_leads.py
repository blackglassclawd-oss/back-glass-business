"""Offline tests: python3 -m unittest test_shop_leads (from this folder)."""

import contextlib
import csv
import io
import tempfile
import unittest
from pathlib import Path

import shop_leads as sl


class CleanEmails(unittest.TestCase):
    def test_prefers_own_domain_and_drops_junk(self):
        html = (
            'x <a href="mailto:Fixit@gmail.com">mail</a> '
            "info@dallasfix.com logo@2x.png user@example.com "
            "abc123@sentry.wixpress.com"
        )
        self.assertEqual(
            sl.clean_emails(html, "https://www.dallasfix.com/"),
            ["info@dallasfix.com", "fixit@gmail.com"],
        )


class Priority(unittest.TestCase):
    def test_tiers(self):
        self.assertEqual(sl.priority("Garland", "TX"), "1")
        self.assertEqual(sl.priority("Houston", "TX"), "2")
        self.assertEqual(sl.priority("Tulsa", "OK"), "2")
        self.assertEqual(sl.priority("Denver", "CO"), "3")


class Merge(unittest.TestCase):
    def test_dedupes_and_keeps_tracking(self):
        existing = [{
            "lead_id": "L00007", "business_name": "Fix It Fast", "city": "Plano",
            "state": "TX", "phone": "(972) 555-0101", "email": "", "status": "no_email",
            "step1_sent": "",
        }]
        new = [
            {"business_name": "Fix-It Fast", "city": "Plano", "state": "TX",
             "phone": "972.555.0101", "email": "hi@fixitfast.com"},
            {"business_name": "Okie Repair", "city": "Tulsa", "state": "OK", "phone": "9185550199"},
        ]
        out = sl.merge(new, existing)
        self.assertEqual(len(out), 2)
        plano = next(r for r in out if r["city"] == "Plano")
        self.assertEqual(plano["lead_id"], "L00007")
        self.assertEqual(plano["email"], "hi@fixitfast.com")
        tulsa = next(r for r in out if r["city"] == "Tulsa")
        self.assertEqual(tulsa["lead_id"], "L00008")
        self.assertEqual(tulsa["status"], "no_email")

    def test_excludes_carrier_stores(self):
        self.assertTrue(sl.EXCLUDE_NAMES.search("T-Mobile"))
        self.assertTrue(sl.EXCLUDE_NAMES.search("Cricket Wireless Authorized Retailer"))
        self.assertFalse(sl.EXCLUDE_NAMES.search("iFix Cell Phone Repair"))


class Due(unittest.TestCase):
    def test_follow_ups_first_and_stops_on_reply(self):
        rows = [
            {"lead_id": "L1", "email": "a@a.com", "priority": "2", "status": "new"},
            {"lead_id": "L2", "email": "b@b.com", "priority": "3", "status": "contacted",
             "step1_sent": "2026-10-01"},
            {"lead_id": "L3", "email": "c@c.com", "priority": "1", "status": "contacted",
             "step1_sent": "2026-10-01", "replied": "yes"},
            {"lead_id": "L4", "email": "d@d.com", "priority": "1", "status": "contacted",
             "step1_sent": "2026-10-01", "step2_sent": "2026-10-08"},
        ]
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "shops.csv"
            sl.write_csv(path, rows)
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(io.StringIO()):
                sl.main(["--out", str(path), "due", "--cap", "5", "--today", "2026-10-10"])
        got = [(r["lead_id"], r["step"]) for r in csv.DictReader(io.StringIO(buf.getvalue()))]
        # L4's step 3 isn't due until 7 days after step 2.
        self.assertEqual(got, [("L2", "step2"), ("L1", "step1")])


if __name__ == "__main__":
    unittest.main()
