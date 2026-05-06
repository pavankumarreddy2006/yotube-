# Technical Documentation

## Overview

This codebase implements a sports-focused YouTube automation platform with four major layers:

- research and topic discovery
- content generation and media production
- orchestration and delivery
- optimization and learning

The system is built primarily with Python and FastAPI, with a React dashboard for monitoring and control.

## High-Level Flow

1. The API or scheduler starts a job.
2. The queue dispatches the job into the pipeline.
3. The pipeline fetches sports candidates and trend hints.
4. The scoring logic selects the strongest topic.
5. `content.py` generates scripts and publishing metadata.
6. Thumbnail, voice, subtitles, and video are created.
7. Artifacts are validated and optionally uploaded.
8. Learning state and optimization guidance are updated.
9. The dashboard exposes run status, artifacts, analytics, and intelligence data.

## Module Breakdown

### `app.py`

Responsible for:

- serving the FastAPI backend
- exposing dashboard endpoints
- exposing runtime settings management
- exposing analytics and intelligence endpoints
- streaming dashboard events
- serving the frontend build

Important endpoints:

- `GET /dashboard-state`
- `GET /analytics`
- `GET /intelligence`
- `POST /automation/start`
- `POST /ask-ai`

### `main.py`

The central orchestrator. It handles:

- run startup and retry logic
- stage transitions and status persistence
- candidate fetching
- topic selection
- content generation
- thumbnail generation
- audio synthesis
- video rendering
- quality checks
- uploads
- latest run persistence
- optimization report generation

### `data.py`

Builds `TopicCandidate` objects from:

- NewsAPI
- CricAPI
- pytrends
- local fallback stories

It also:

- deduplicates candidates
- tags trending items
- selects daily highlights

### `content.py`

Generates the content package used by the media pipeline.

Main outputs:

- `title`
- `description`
- `tags`
- `thumbnail_text`
- `hook`
- `shorts_script`
- `long_script`
- `highlights`
- `visual_queries`
- `hashtags`

Two modes exist:

- LLM-backed generation when `OPENAI_API_KEY` is configured
- fallback templated generation when upstream generation is unavailable

### `ml_engine/intelligence.py`

Provides the optimization and learning layer.

Key dataclasses:

- `TrendSignal`
- `CompetitorInsight`
- `OpportunityScore`
- `PerformanceSnapshot`
- `OptimizationRecommendation`
- `DailyLearningState`

Key functions:

- `build_trend_signals`
- `build_competitor_insights`
- `rank_content_opportunities`
- `simulate_performance_snapshot`
- `generate_optimization_recommendations`
- `update_learning_state`
- `intelligence_snapshot`

State persistence:

- `output/learning_state.json`

### `services/planning_service.py`

Transforms scripts into renderable timing plans.

Responsibilities:

- sentence splitting
- word timing generation
- subtitle cue generation
- scene plan construction
- motion, emotion, transition, and overlay defaults

### `video.py`

Builds final video outputs from:

- audio
- thumbnail/background/image sources
- subtitle cues
- scene plans
- formatting settings

### `voice.py`

Handles TTS generation. Provider selection is runtime-configurable and depends on environment configuration.

### `thumbnail.py` and `thumbnail_generator.py`

Generate thumbnails and support text overlays, visual layout, and validation.

### `runtime.py`

Stores mutable application settings in:

- `output/runtime_settings.json`

Examples:

- default language
- default mode
- upload toggle
- preferred sources
- prompt seed and style

## Data Models

### `TopicCandidate`

Defined in `data.py`.

Represents a candidate story with metadata such as:

- title
- summary
- source
- category
- players
- tournament
- score details
- trend flags

### `ContentPackage`

Defined in `content.py`.

Represents the generated package used for rendering and publishing.

### Render Models

Defined in `backend/models/pipeline.py`.

Includes:

- `RenderFormat`
- `WordTiming`
- `SubtitleCue`
- `ScenePlan`
- `VoiceoverPlan`
- `VideoRenderPlan`
- `PipelineArtifacts`

## Runtime State

### `output/pipeline_status.json`

Stores the live status used by the dashboard:

- running state
- progress label
- current stage
- logs
- notifications
- preview URLs

### `output/latest_run.json`

Stores the most recent successful run:

- selected topic
- scored topic
- output paths
- upload results
- cloud artifact URLs
- recommendations
- performance snapshot
- top opportunities

### `output/learning_state.json`

Stores rolling optimization knowledge:

- runs analyzed
- preferred formats
- best topics
- title/thumbnail/hook patterns
- rolling metrics
- latest recommendations

## Modes

Supported pipeline modes:

- `full`
- `short`
- `long`
- `upload_only`
- `test`

## Dashboard Data

`GET /dashboard-state` returns a consolidated payload that includes:

- status
- news
- logs
- runtime settings
- event history
- intelligence snapshot

`GET /analytics` exposes:

- run status
- queue health
- generated artifact links
- latest run metadata
- performance snapshot
- recommendations
- learning state

`GET /intelligence` exposes:

- trend signals
- competitor insights
- ranked opportunities
- recommendations
- learning state

## Scheduler

The scheduler is started on API startup and checks whether:

- daily runner is enabled
- the configured daily time matches the current time
- a run has already completed today
- another run is not already active

If all checks pass, a new queued run is created.

## Error Handling Strategy

The codebase uses several resilience patterns:

- fallback content generation when LLM generation fails
- fallback news stories when APIs are unavailable
- retry wrappers around external API calls
- duplicate-content protection
- pipeline retry attempts
- quality checks before upload

## Known Simplifications

The platform is structurally ready for a stronger autonomous loop, but these areas are still heuristic:

- no live YouTube Analytics ingestion
- no live competitor video scraping
- no automatic thumbnail A/B test execution
- no true model retraining pipeline
- recommendation outputs are rule-based and simulated

## Recommended Next Improvements

1. Connect real YouTube Analytics API data into `PerformanceSnapshot`.
2. Add a storage layer for per-video historical analytics instead of only rolling summaries.
3. Add real competitor ingestion through approved APIs or imported datasets.
4. Add automatic prompt adaptation based on recent winners and losers.
5. Extend the frontend to visualize trend signals, opportunity rankings, and recommendation history.

## Development Notes

Run tests:

```powershell
python -m unittest discover tests
```

Run API locally:

```powershell
python -m uvicorn app:app --reload
```

Run a pipeline job:

```powershell
python main.py full
```
