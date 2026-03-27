import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useFamily } from "@/hooks/useFamily"
import { Users, Plus } from "lucide-react"

export function JoinFamily() {
  const [inviteCode, setInviteCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { joinFamily } = useFamily()
  const navigate = useNavigate()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setError("")
    setLoading(true)
    try {
      const success = await joinFamily(inviteCode)
      if (success) {
        navigate("/")
      } else {
        setError("Invalid invite code. Please check and try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
          <CardDescription>
            Join an existing family or create a new budget plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Join existing family */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Join a Family</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              If your partner already set up a family budget, enter the invite code they
              shared with you.
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">Invite Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !inviteCode.trim()}>
                {loading ? "Joining..." : "Join Family"}
              </Button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          {/* Create new family */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Start Fresh</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a new family budget plan. You can invite your partner later.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/onboarding")}
            >
              Create New Family Budget
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
