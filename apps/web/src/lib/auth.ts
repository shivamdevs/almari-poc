import { SignJWT, jwtVerify } from "jose"
import { authenticator } from "otplib"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_unsafe_secret_for_poc_only"
)

export async function signSessionToken() {
  const token = await new SignJWT({ authed: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET)

  return token
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    return null
  }
}

export function verifyTOTP(token: string) {
  const secret = process.env.TOTP_SECRET
  if (!secret) {
    console.warn("TOTP_SECRET is not set in environment variables.")
    // For development without .env, allow a fallback or just fail
    // In production, this should definitely fail
    if (process.env.NODE_ENV === "development") {
      return token === "000000" // Dev backdoor if no secret is set
    }
    return false
  }
  return authenticator.verify({ token, secret })
}
