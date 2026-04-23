import { SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:49000";

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // Exchange code for Twitch access token.
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Twitch token exchange failed:", text);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
  }

  const { access_token } = await tokenRes.json();

  // Fetch the user's login name from Twitch.
  const userRes = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Client-Id": TWITCH_CLIENT_ID,
    },
  });

  if (!userRes.ok) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 502 });
  }

  const { data } = await userRes.json();
  const user: string = data[0]?.login;
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 502 });
  }

  // Issue a JWT containing the verified channel name.
  const token = await new SignJWT({ channel: user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpiresIn("365d")
    .sign(getJwtSecret());

  return NextResponse.json({ user, token });
}
