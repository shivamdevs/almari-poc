import { NextResponse } from "next/server"

import { TOTP } from "otpauth"
import { signSessionToken } from "@/lib/auth"

function verifyTOTP(token: string) {
  const secret = process.env.TOTP_SECRET
  if (!secret) {
    console.warn("TOTP_SECRET is not set in environment variables.")
    if (process.env.NODE_ENV === "development") {
      return token === "000000"
    }
    return false
  }
  
  const totp = new TOTP({ secret })
  const delta = totp.validate({ token, window: 1 })
  
  return delta !== null
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      )
    }

    const isValid = verifyTOTP(code)

    if (isValid) {
      const token = await signSessionToken()
      const response = NextResponse.json({ success: true })
      
      response.cookies.set("poc_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60, // 15 minutes
        path: "/",
      })

      return response
    } else {
      return NextResponse.json(
        { error: "Invalid or expired TOTP code" },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
