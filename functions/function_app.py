"""Azure Functions entry point for scheduled wait-time ingestion.

Replaces the GitHub Actions cron. Scheduled workflows on GitHub are best-effort:
they were delivering ~6 of an intended 48 runs per day and firing at minutes
unrelated to the requested schedule, because GitHub deprioritizes repositories
that schedule frequently. A timer trigger runs on the Function App's own
scheduler instead, so the cadence is actually ours.
"""

import logging

import azure.functions as func

from ingest_core import ingest

app = func.FunctionApp()


# NCRONTAB, six fields, seconds first — "0 */30 * * * *" is every 30 minutes on
# the minute. use_monitor keeps the schedule durable across restarts and scale
# events so a missed slot is picked up rather than silently skipped.
@app.function_name(name="IngestWaitTimes")
@app.timer_trigger(
    arg_name="timer",
    schedule="0 */30 * * * *",
    run_on_startup=False,
    use_monitor=True,
)
def ingest_wait_times(timer: func.TimerRequest) -> None:
    if timer.past_due:
        logging.warning("Timer fired past due; the previous slot was missed.")

    try:
        inserted = ingest()
        logging.info("Ingestion complete: %d rows inserted.", inserted)
    except Exception:
        # Let the exception surface so the invocation is recorded as failed and
        # shows up in Application Insights rather than passing silently.
        logging.exception("Ingestion failed.")
        raise
