"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScissorsIcon } from "lucide-react"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submitCode = async (otpCode: string) => {
    setError("")

    if (otpCode.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: otpCode }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push("/")
        router.refresh()
      } else {
        setError(data.error || "Authentication failed")
        setCode("") // Clear input on failure
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <ScissorsIcon className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Almari POC Lab
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter your TOTP code to access the lab
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => setCode(value)}
            onComplete={(value) => submitCode(value)}
            disabled={loading}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <div className="h-4">
            {error && (
              <p className="text-sm text-red-500 font-medium text-center">
                {error}
              </p>
            )}
            {loading && !error && (
              <p className="text-sm text-zinc-500 font-medium text-center">
                Verifying...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
