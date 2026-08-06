"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScissorsIcon } from "lucide-react"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (code.length !== 6) {
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
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push("/")
        router.refresh()
      } else {
        setError(data.error || "Authentication failed")
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              placeholder="000000"
              required
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={loading}
              autoComplete="off"
            />
            {error && (
              <p className="text-sm text-red-500 font-medium text-center">
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-11"
            disabled={loading || code.length !== 6}
          >
            {loading ? "Verifying..." : "Enter Lab"}
          </Button>
        </form>
      </div>
    </div>
  )
}
