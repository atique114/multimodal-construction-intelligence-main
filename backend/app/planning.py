"""Indicative construction budget and valuation calculations."""
from .schemas import PlanningRequest, PlanningResponse, ScheduleTask

RATES = {
    "Residential house": {"cost": 2100, "steel": 4.0, "cement": 0.40, "value": 3300},
    "Apartment building": {"cost": 2600, "steel": 4.5, "cement": 0.45, "value": 3900},
    "Commercial building": {"cost": 3200, "steel": 5.0, "cement": 0.50, "value": 4700},
    "Warehouse / industrial": {"cost": 1900, "steel": 3.5, "cement": 0.32, "value": 2700},
}
TIER_MULTIPLIERS = {"Tier 1": 1.25, "Tier 2": 1.0, "Tier 3": 0.82}
BASE_DURATIONS = {
    "Residential house": 210,
    "Apartment building": 365,
    "Commercial building": 330,
    "Warehouse / industrial": 240,
}
PHASES = [
    ("Pre-construction & permits", 0.12),
    ("Foundation & substructure", 0.18),
    ("Structural frame", 0.22),
    ("Envelope & weatherproofing", 0.16),
    ("MEP & interior finishes", 0.22),
    ("Commissioning & handover", 0.10),
]
ASSUMPTIONS = [
    "Indicative planning estimates only; validate costs against local schedules and a project BOQ.",
    "Steel and cement quantities use broad area-based intensities, not structural design quantities.",
    "Market valuation is a placeholder estimate, not an appraisal or investment recommendation.",
]


def estimate(request: PlanningRequest) -> PlanningResponse:
    rates = RATES[request.structure_type]
    multiplier = TIER_MULTIPLIERS[request.location_tier]
    budget = request.built_up_sqft * rates["cost"] * multiplier
    total_days = max(30, round(BASE_DURATIONS[request.structure_type] * (request.built_up_sqft / 2000) ** 0.35))
    elapsed_days = total_days * request.completion_percentage / 100
    task_schedule = []
    start_day = 0
    for index, (task_name, share) in enumerate(PHASES):
        duration = round(total_days * share) if index < len(PHASES) - 1 else total_days - start_day
        finish_day = start_day + duration
        if elapsed_days >= finish_day:
            progress, status = 100, "Complete"
        elif elapsed_days <= start_day:
            progress, status = 0, "Upcoming"
        else:
            progress, status = round((elapsed_days - start_day) / duration * 100), "In progress"
        task_schedule.append(ScheduleTask(
            task_name=task_name, start_day=start_day + 1, duration_days=duration,
            progress_percentage=progress, status=status,
        ))
        start_day = finish_day
    return PlanningResponse(
        structure_type=request.structure_type,
        built_up_sqft=request.built_up_sqft,
        location_tier=request.location_tier,
        completion_percentage=request.completion_percentage,
        estimated_project_budget_inr=round(budget, 2),
        estimated_capex_incurred_inr=round(budget * request.completion_percentage / 100, 2),
        indicative_market_valuation_inr=round(request.built_up_sqft * rates["value"] * multiplier, 2),
        estimated_steel_kg=round(request.built_up_sqft * rates["steel"], 2),
        estimated_cement_tonnes=round(request.built_up_sqft * rates["cement"], 2),
        estimated_duration_days=total_days,
        task_schedule=task_schedule,
        assumptions=ASSUMPTIONS,
    )


def visualization_prompt(structure_type: str, built_up_sqft: int, city: str, style: str) -> str:
    return (f"Photorealistic conceptual {style} {structure_type}, {built_up_sqft:,} sq ft built-up, "
            f"located in {city}, climate-responsive Indian architecture, realistic materials, "
            "landscaped site, daylight architectural visualization, no text, no labels")
