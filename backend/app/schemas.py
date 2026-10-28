"""Strict API input and output contracts."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class PPEItem(BaseModel):
    detected: Optional[bool] = None
    status: str
    notes: str = ""


class Hazard(BaseModel):
    hazard: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    remedy: str


class PPEChecklist(BaseModel):
    helmet: PPEItem
    high_visibility_vest: PPEItem
    steel_toe_boots: PPEItem
    safety_harness: PPEItem


class SafetyReport(BaseModel):
    safety_score: int = Field(ge=0, le=100)
    overall_status: str
    ppe_detection: PPEChecklist
    hazards: List[Hazard]
    analysis_mode: Literal["Gemini", "Demonstration"]
    image_name: str
    standards_note: str


class CrackReport(BaseModel):
    defect_type: Literal["Hairline", "Settlement", "Structural Shear", "Thermal Expansion", "Spalling", "Unclear"]
    estimated_width_mm: Optional[float] = Field(default=None, ge=0)
    severity: Literal["Low", "Medium", "High", "Critical", "Unclear"]
    root_causes: List[str]
    recommended_repairs: List[str]
    urgency: str
    analysis_mode: Literal["Gemini", "Demonstration"]
    image_name: str
    engineering_note: str


class PlanningRequest(BaseModel):
    structure_type: Literal["Residential house", "Apartment building", "Commercial building", "Warehouse / industrial"]
    built_up_sqft: int = Field(ge=100, le=2_000_000)
    location_tier: Literal["Tier 1", "Tier 2", "Tier 3"]
    completion_percentage: int = Field(ge=0, le=100)
    city: str = Field(min_length=1, max_length=100)


class ScheduleTask(BaseModel):
    task_name: str
    start_day: int
    duration_days: int
    progress_percentage: int = Field(ge=0, le=100)
    status: Literal["Upcoming", "In progress", "Complete"]


class PlanningResponse(BaseModel):
    currency: Literal["INR"] = "INR"
    structure_type: str
    built_up_sqft: int
    location_tier: str
    completion_percentage: int
    estimated_project_budget_inr: float
    estimated_capex_incurred_inr: float
    indicative_market_valuation_inr: float
    estimated_steel_kg: float
    estimated_cement_tonnes: float
    estimated_duration_days: int
    task_schedule: List[ScheduleTask]
    assumptions: List[str]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)
    weather: Literal["High Wind", "Heavy Rain", "Extreme Heat", "Normal"] = "Normal"


class ChatResponse(BaseModel):
    answer: str
    analysis_mode: Literal["Gemini", "Demonstration"]


class VisualizationRequest(BaseModel):
    structure_type: str = Field(min_length=2, max_length=80)
    built_up_sqft: int = Field(ge=100, le=2_000_000)
    city: str = Field(min_length=1, max_length=100)
    style: str = Field(min_length=2, max_length=80)


class VisualizationResponse(BaseModel):
    prompt: str

