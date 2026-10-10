# Repair shop email sequence (draft, not approved)

**Status:** draft 2026-10-10. Nothing is sent until Jason approves the copy,
the sender address and the first batch. Michael confirms every product,
price and delivery fact before it goes in an email.

**Audience:** independent phone repair shops with a public business email
(list built by [`01-software/outreach/shop_leads.py`](../../01-software/outreach/shop_leads.py)).
Priority 1 = DFW (same-day delivery), 2 = rest of TX and OK, 3 = nationwide.

**Format:** plain text, no images, no tracking pixels, no links except the
wholesale page. One email per shop per step, sent by hand or mail merge from
a real backglasspros.com mailbox. Email 2 and 3 go as replies in the same
thread so the shop sees the history.

## Fill before sending

| Placeholder | What | Who | Status |
| --- | --- | --- | --- |
| `{{sender}}` | First name + mailbox, e.g. Michael, sales@backglasspros.com | Jason | open |
| `{{postal_address}}` | Real mailing address (street, PO box or registered mailbox). Required by CAN-SPAM. | Jason / Michael | open |
| `{{wholesale_url}}` | Wholesale page on backglasspros.com | Wholesale page thread | not live |
| `{{price_line}}` | One true line, e.g. "iPhone 17 back glass from $X, coils from $Y" | Michael | open (Jul 28 sheet: cost or price?) |
| `{{shop_name}}`, `{{city}}` | From the list | list | ready |

Until `{{price_line}}` is confirmed, delete that line rather than guess.

## Email 1, day 0: the offer

**Subject (pick one, A/B test):**
- A: `iPhone 17 back glass for {{shop_name}}`
- B: `Back glass parts from a Dallas supplier`

```
Hi {{shop_name}} team,

I'm {{sender}} with Back Glass Pros in Dallas. We supply one thing:
iPhone back glass and rear housing parts for repair shops, including the
iPhone 17 series and the charging coils that go with them.

{{price_line}}

If back glass jobs come across your counter, can I send you our
wholesale price list?

{{sender}}
Back Glass Pros | backglasspros.com

--
This is a business offer from Back Glass Pros, {{postal_address}}.
Not interested? Reply "stop" and we won't email you again.
```

**DFW variant (priority 1 only),** add after the first paragraph once
Michael confirms the wording:

```
Since you're in {{city}}, we can drop parts off the same day you order.
```

## Email 2, day 4: make it easy

Reply in the same thread. Subject stays `Re: <email 1 subject>`.

```
Hi {{shop_name}} team,

Quick follow-up. Which iPhone models do you replace back glass on most?
Reply with two or three and I'll send prices for just those, so you can
compare against what you pay now.

{{sender}}
Back Glass Pros | {{wholesale_url}}

--
Back Glass Pros, {{postal_address}}.
Reply "stop" and we won't email you again.
```

## Email 3, day 11: close the loop

Reply in the same thread.

```
Hi {{shop_name}} team,

I haven't heard back, so I'll stop here. If you ever need iPhone back
glass or charging coils, the price list is at {{wholesale_url}}, or just
reply to this email.

Thanks,
{{sender}}
Back Glass Pros

--
Back Glass Pros, {{postal_address}}.
Reply "stop" and we won't email you again.
```

## CAN-SPAM checklist (15 U.S.C. 7704)

- [x] Honest From name and address: a real person at backglasspros.com.
- [x] Subject matches the body; `Re:` only on real replies in the same thread.
- [x] Identified as a business offer in the footer.
- [ ] Valid physical postal address in every email (`{{postal_address}}`).
- [x] Opt-out in every email (reply "stop"). Honor within 10 business days;
      we do it the same day. The reply mailbox must keep working for 30+ days.
- [x] Opt-outs are never emailed again, sold or shared (`unsubscribed` column).
- [x] Business addresses only, taken from the shop's own website or public
      listing; no bought lists, no guessed addresses.

## Sending rules

- Mailbox on backglasspros.com with SPF, DKIM and DMARC set before day 1.
  A new mailbox starts slow: 20/day in week 1, 50/day in week 2, up to
  100/day after that if bounces stay under 3% and nobody reports spam.
- Stop the whole sequence for a shop on any reply, bounce or "stop".
- Stop all sending and tell Jason at the first spam complaint.
- Never claim stock we don't have; Michael confirms stock for the models
  named in `{{price_line}}` before each week's sends.
- Unverified claims stay out (years in business, shipping cutoffs, free
  shipping, warranty terms) until Michael confirms them in QUESTIONS.md.

## Reply handling

Tag every reply in the tracker (`outcome` column) within one business day:

| Outcome | Next step | Owner |
| --- | --- | --- |
| `wants_prices` | Send price list / wholesale link | Michael |
| `wants_call` or local DFW | Call or drop by | Michael |
| `bulk` (chain, 100+ parts/mo) | Hand to the Bulk buyers thread | Jason |
| `not_now` | Recheck in 60 days | tracker |
| `not_interested` | Stop | tracker |
| `stop` | Mark `unsubscribed`, never email again | same day |
| `bounced` | Mark `bounced`, try the shop's phone instead | tracker |

## Weekly numbers (for the Monday scorecard)

Emails sent · bounce rate · reply rate · `wants_prices` · first orders ·
repeat orders · opt-outs. Benchmarks to beat for plain-text B2B cold email
(inferred, not measured here): 3-8% replies, under 3% bounces.
