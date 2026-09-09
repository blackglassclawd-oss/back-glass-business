export const supportReview = {
  contact: { status: "existing", url: "https://backglasspros.com/pages/contact", note: "The live Shopify contact form is the verified support route. No email, phone, address or support hours have been independently approved." },
  about: { status: "review-required", note: "Jason: approve business identity and About copy. The legacy since-2015 claim lacks confirmed supporting evidence." },
  shipping: { status: "review-required", note: "Michael and Jason: verify dispatch location, cutoff, timezone, carriers and delivery wording. Legacy FAQ shipping promises are not reapproved by their presence online." },
  returns: { status: "review-required", note: "Live return-refund-and-exchange-policy contains support email, phone and address placeholders. Confirm the policy itself before editing or promoting it." },
  warranty: { status: "review-required", note: "Michael and Jason: approve warranty coverage, exclusions and process. No terms supplied." },
  faq: { status: "review-required", note: "Legacy FAQ grade/process and shipping assertions need re-verification; ensure approved visible answers match FAQ schema." },
} as const;
