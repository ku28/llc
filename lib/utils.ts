import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates an OPD Number in the format: YYMMDD TT VV
 * @param date - The visit date
 * @param tokenNumber - The token number for the day
 * @param visitCount - The visit count for this patient (1-indexed)
 * @returns A formatted OPD number string (e.g., "250617 07 03")
 */
export function generateOpdNo(date: Date, tokenNumber: number, visitCount: number): string {
  const yy = date.getFullYear().toString().slice(-2)
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  const token = tokenNumber.toString().padStart(2, '0')
  const visit = visitCount.toString().padStart(2, '0')
  return `${yy}${mm}${dd} ${token} ${visit}`
}
