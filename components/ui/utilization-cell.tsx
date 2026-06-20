"use client"

import { cn } from "@/lib/utils"
import { UtilizationValue } from "@/types"

type Props = {
  value: UtilizationValue | null
  isEditable: boolean
  isWeekend: boolean
  isLoading?: boolean
  onClick?: () => void
}

const colorMap: Record<UtilizationValue, string> = {
  L: "bg-yellow-100 text-yellow-900",
  M: "bg-green-100 text-green-900",
  H: "bg-red-100 text-red-900",
  C: "bg-blue-100 text-blue-900",
  S: "bg-purple-100 text-purple-900",
  I: "bg-gray-100 text-gray-700",
  "I*": "bg-gray-200 text-gray-800",
  F: "bg-gray-50 text-gray-400",
}

export function UtilizationCell({ value, isEditable, isWeekend, isLoading, onClick }: Props) {
  const displayValue = isLoading ? "..." : value || (isWeekend ? "F" : "-")
  const colorClass = value && !isLoading ? colorMap[value] : isWeekend ? colorMap.F : "bg-white"

  return (
    <button
      onClick={isEditable && !isLoading ? onClick : undefined}
      disabled={!isEditable || isLoading}
      className={cn(
        "w-11 h-10 text-xs font-medium transition-colors",
        colorClass,
        isEditable && !isLoading && "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:z-10",
        (!isEditable || isLoading) && "cursor-not-allowed",
        isLoading && "opacity-60"
      )}
    >
      {displayValue}
    </button>
  )
}
