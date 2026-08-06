import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_unsafe_secret_for_poc_only"
)

export function getSessionDurationMs() {
  const envVal = process.env.SESSION_DURATION
  if (envVal) return parseInt(envVal, 10)
  return process.env.NODE_ENV === "development" ? 60 * 60 * 1000 : 15 * 60 * 1000
}

export async function signSessionToken() {
  const durationMs = getSessionDurationMs()
  const exp = Math.floor(Date.now() / 1000) + Math.floor(durationMs / 1000)

  const token = await new SignJWT({ authed: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
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
