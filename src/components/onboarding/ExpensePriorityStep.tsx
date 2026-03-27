import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants"

const priorityLabels = ["Skip", "Low", "Below Avg", "Medium", "Above Avg", "High"]
const priorityColors = [
  "bg-gray-200 text-gray-700",
  "bg-green-100 text-green-700",
  "bg-blue-100 text-blue-700",
  "bg-yellow-100 text-yellow-700",
  "bg-orange-100 text-orange-700",
  "bg-red-100 text-red-700",
]

interface ExpensePriorityStepProps {
  priorities: Record<string, number>
  onUpdate: (priorities: Record<string, number>) => void
}

export function ExpensePriorityStep({ priorities, onUpdate }: ExpensePriorityStepProps) {
  const discretionary = DEFAULT_EXPENSE_CATEGORIES.filter((c) => !c.isFixed)
  const fixed = DEFAULT_EXPENSE_CATEGORIES.filter((c) => c.isFixed)

  const setPriority = (key: string, value: number) => {
    onUpdate({ ...priorities, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Spending Priorities</h2>
        <p className="text-sm text-muted-foreground">
          Set your priorities for each discretionary category (0-5). The system will
          recommend budget allocations based on your priorities and income. Fixed costs
          (rent, insurance, etc.) are handled separately.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Fixed Costs (not adjustable by priority)
        </h3>
        <div className="flex flex-wrap gap-2">
          {fixed.map((cat) => (
            <Badge key={cat.key} variant="secondary">
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Discretionary Categories
        </h3>
        {discretionary.map((cat) => {
          const value = priorities[cat.key] ?? 3
          return (
            <div key={cat.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{cat.name}</Label>
                <Badge className={`text-xs ${priorityColors[value]}`}>
                  {value} — {priorityLabels[value]}
                </Badge>
              </div>
              <Slider
                value={[value]}
                min={0}
                max={5}
                step={1}
                onValueChange={([v]) => setPriority(cat.key, v)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
