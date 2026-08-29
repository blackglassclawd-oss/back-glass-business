export function loader() {
  return Response.json(
    {
      service: "backglass-ecommerce",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
