import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (req) => {
  try {
    const { lat, lon } = await req.json();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto`;
    const r = await fetch(url);
    const data = await r.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type":"application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { "Content-Type":"application/json" }, status: 500 });
  }
});