"""Gera os vetores de referência do FSRS-6 usados por TU-01 (scheduler-service.spec.ts).

Requer: pip install fsrs==6.3.2 (py-fsrs, implementação de referência do FSRS-6)
Uso: python3 scripts/gen-fsrs6-vectors.py > src/app/core/scheduler/fixtures/fsrs6-vectors.json

A configuração usada é a mesma da tabela "Configuração fixa do FSRS-6 (cliente)" da
TechSpec, com enable_fuzzing=False: o fuzz só altera o `due` exato (não `stability`,
`difficulty` nem `scheduled_days`), e o teste compara `scheduledDays`, não `due`.
"""

import json
from datetime import datetime, timedelta, timezone

from fsrs import Card, Rating, Scheduler

PY_FSRS_VERSION = "6.3.2"
BASE_TIME = datetime(2026, 1, 1, tzinfo=timezone.utc)

RATING_BY_NAME = {"again": Rating.Again, "hard": Rating.Hard, "good": Rating.Good, "easy": Rating.Easy}


def build_scheduler() -> Scheduler:
    return Scheduler(desired_retention=0.9, maximum_interval=36500, enable_fuzzing=False)


def run_steps(scheduler, steps):
    card = Card()
    reviewed_ats = []
    for rating_name, reviewed_at in steps:
        card, _log = scheduler.review_card(card, RATING_BY_NAME[rating_name], review_datetime=reviewed_at)
        reviewed_ats.append(reviewed_at)
    return card, reviewed_ats


def scenario(name, steps):
    scheduler = build_scheduler()
    card, reviewed_ats = run_steps(scheduler, steps)
    return {
        "scenario": name,
        "steps": [
            {"rating": {"again": 1, "hard": 2, "good": 3, "easy": 4}[rating_name], "reviewedAt": reviewed_at.isoformat().replace("+00:00", "Z")}
            for rating_name, reviewed_at in steps
        ],
        "expected": {
            "state": int(card.state.value),
            "stability": round(card.stability, 8),
            "difficulty": round(card.difficulty, 8),
            "scheduledDays": (card.due - reviewed_ats[-1]).days,
        },
    }


def review_at_due(scheduler, card, rating_name, offset=timedelta(0)):
    reviewed_at = card.due + offset
    card, _log = scheduler.review_card(card, RATING_BY_NAME[rating_name], review_datetime=reviewed_at)
    return card, reviewed_at


def scenario_from_prefix(name, prefix_steps, final_rating_name, offset=timedelta(0)):
    scheduler = build_scheduler()
    card, reviewed_ats = run_steps(scheduler, prefix_steps)
    card, final_reviewed_at = review_at_due(scheduler, card, final_rating_name, offset)
    all_steps = [(rating_name, reviewed_at) for rating_name, reviewed_at in zip([s[0] for s in prefix_steps], reviewed_ats)]
    all_steps.append((final_rating_name, final_reviewed_at))
    return {
        "scenario": name,
        "steps": [
            {"rating": {"again": 1, "hard": 2, "good": 3, "easy": 4}[rating_name], "reviewedAt": reviewed_at.isoformat().replace("+00:00", "Z")}
            for rating_name, reviewed_at in all_steps
        ],
        "expected": {
            "state": int(card.state.value),
            "stability": round(card.stability, 8),
            "difficulty": round(card.difficulty, 8),
            "scheduledDays": (card.due - final_reviewed_at).days,
        },
    }


def main():
    vectors = [
        scenario("novo-de-novo", [("again", BASE_TIME)]),
        scenario("novo-dificil", [("hard", BASE_TIME)]),
        scenario("novo-bom", [("good", BASE_TIME)]),
        scenario("novo-facil", [("easy", BASE_TIME)]),
        scenario("aprendizado-passo1-bom-bom", [("good", BASE_TIME), ("good", BASE_TIME + timedelta(minutes=10))]),
    ]
    review_prefix = [("good", BASE_TIME), ("good", BASE_TIME + timedelta(minutes=10))]
    for rating_name in ("again", "hard", "good", "easy"):
        vectors.append(scenario_from_prefix(f"revisao-no-prazo-{rating_name}", review_prefix, rating_name))
    vectors.append(scenario_from_prefix("revisao-atrasada-bom", review_prefix, "good", timedelta(days=10)))
    print(json.dumps(vectors, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
