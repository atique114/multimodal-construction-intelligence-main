export type PPEItem = { detected: boolean | null; status: string; notes: string }
export type Hazard = { hazard: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; remedy: string }
export type SafetyReport = {
  safety_score: number; overall_status: string; ppe_detection: Record<string, PPEItem>
  hazards: Hazard[]; analysis_mode: 'Gemini' | 'Demonstration'; image_name: string; standards_note: string
}
export type CrackReport = {
  defect_type: string; estimated_width_mm: number | null; severity: string; root_causes: string[]
  recommended_repairs: string[]; urgency: string; analysis_mode: 'Gemini' | 'Demonstration'
  image_name: string; engineering_note: string
}
export type PlanInput = { structure_type: string; built_up_sqft: number; location_tier: string; completion_percentage: number; city: string }
export type PlanReport = PlanInput & {
  currency: 'INR'; estimated_project_budget_inr: number; estimated_capex_incurred_inr: number
  indicative_market_valuation_inr: number; estimated_steel_kg: number; estimated_cement_tonnes: number; assumptions: string[]
  estimated_duration_days: number; task_schedule: { task_name: string; start_day: number; duration_days: number; progress_percentage: number; status: 'Upcoming' | 'In progress' | 'Complete' }[]
}
export type Message = { role: 'user' | 'assistant'; content: string }
export type ChatReport = { answer: string; analysis_mode: 'Gemini' | 'Demonstration' }

const API_ROOT = import.meta.env.VITE_API_URL || ''

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = typeof body.detail === 'string' ? body.detail : message
    } catch { /* Keep the HTTP fallback. */ }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export async function analyzeImage(kind: 'safety' | 'cracks', photo: File, context: string) {
  const form = new FormData()
  form.append('photo', photo)
  form.append('context', context)
  const res = await fetch(`${API_ROOT}/api/${kind}/analyze`, { method: 'POST', body: form })
  return parseResponse<SafetyReport | CrackReport>(res)
}

export async function estimatePlan(input: PlanInput) {
  const res = await fetch(`${API_ROOT}/api/planning/estimate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  return parseResponse<PlanReport>(res)
}

export async function makeVisualizationPrompt(input: { structure_type: string; built_up_sqft: number; city: string; style: string }) {
  const res = await fetch(`${API_ROOT}/api/visualization/prompt`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  return parseResponse<{ prompt: string }>(res)
}

export async function sendMessage(message: string, history: Message[], weather: string) {
  const res = await fetch(`${API_ROOT}/api/assistant/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, weather }),
  })
  return parseResponse<ChatReport>(res)
}

export async function getHealth() {
  const res = await fetch(`${API_ROOT}/api/health`)
  return parseResponse<{ status: string; ai_configured: boolean }>(res)
}
