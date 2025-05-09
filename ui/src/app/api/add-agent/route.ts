import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const modalUrl = process.env.MODAL_API_URL;

  console.log("🛜 /api/add-agent hit");
  console.log("Forwarding to Modal API:", modalUrl);

  if (!modalUrl) {
    return NextResponse.json(
      { error: "MODAL_API_URL is not defined" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${modalUrl}/add-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text(); // Read raw body (in case it's not JSON)
    console.log("Raw response from Modal:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Failed to parse Modal JSON:", err);
      return NextResponse.json(
        { error: "Invalid JSON from Modal", raw: text },
        { status: 500 }
      );
    }

    console.log("✅ Parsed response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Add agent failed:", error);
    return NextResponse.json(
      { error: "Add agent failed", details: String(error) },
      { status: 500 }
    );
  }
}
