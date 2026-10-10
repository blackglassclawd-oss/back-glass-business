# Repair shop outreach list

Builds and works the list of US phone repair shops that the
[email sequence](../../10-knowledge/outreach/shop-email-sequence.md) goes to.
Python 3 standard library only; no paid tools or API keys.

## Build the list

```sh
cd 01-software/outreach
python3 shop_leads.py build --states TX,OK          # first wave
python3 shop_leads.py build --all-states            # nationwide, appends and dedupes
python3 shop_leads.py build --no-osm --seed seed.csv  # add shops found by hand
```

Sources: OpenStreetMap (via the free Overpass API) for shops tagged as phone
or electronics repair, then each shop's own website (home, contact and about
pages) for a public email. Carrier stores (T-Mobile, Cricket, ...) are
dropped; franchises are kept with `chain=yes`.

Output: `03-data/leads/shops.csv` (gitignored; never commit it). Re-running
`build` keeps every row's `lead_id` and tracking columns.

Needs outbound access to `overpass-api.de` and the shops' websites. Claude's
cloud sessions block those by default, so either run it on a Mac or allow
the hosts in the project's cloud environment settings.

## Track and send

The same CSV is the tracker. Import it into a Google Sheet (or keep it in
Numbers) and fill these columns as you go:

| Column | Values |
| --- | --- |
| `status` | `new`, `contacted`, `replied`, `customer`, `bounced`, `unsubscribed`, `do_not_contact`, `no_email` |
| `step1_sent` / `step2_sent` / `step3_sent` | date sent, `YYYY-MM-DD` |
| `replied`, `reply_date` | `yes`, date |
| `outcome` | see the reply table in the sequence doc |
| `unsubscribed` | `yes` = never email again |

Each morning, list who is due (follow-ups first, then new shops, DFW first):

```sh
python3 shop_leads.py due --cap 50 > today.csv
```

Nothing in this folder sends email. Sending needs Jason's approval.

## Tests

```sh
python3 -m unittest test_shop_leads
```
