"use server"

import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"

export async function getSessionExpiry() {
  const cookieStore = await cookies()
  const token = cookieStore.get("poc_session")?.value
  
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload || !payload.exp) return null

  return payload.exp * 1000 // Return in milliseconds
}
