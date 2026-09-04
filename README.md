# Daily Form

A deliberately small personal tracker for calories and macros, running and weight training, and body weight. It uses React, Supabase, a Netlify Function, and OpenAI image analysis.

Features include day-by-day history, searchable food presets with scalable serving sizes, exercise calorie estimates, and personal calorie/macro goals based on weight, height, age, sex, activity, and target loss rate.

Saved meals and workouts can be reopened from their pencil buttons, edited, and updated without creating duplicate entries.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app works in local-storage mode when the Supabase variables are absent. The password is `pallab`.

To test the photo scanner locally, add `OPENAI_API_KEY` to `.env` and run Netlify's local environment instead:

```bash
npx netlify dev
```

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste [supabase/schema.sql](supabase/schema.sql), and run it. The script is safe to rerun when upgrading an existing project.
3. Copy the project URL and anon key from **Project Settings > API** into `.env`.
4. Restart the local server.

This is a single-user personal app. Its password gate is intentionally simple and is not strong authentication. The database policies allow the anon key to read and write, so do not use this schema for sensitive health records or a public multi-user product.

## Goal and estimate notes

- The initial profile is 195 lb, 5 ft 11 in, age 30, male, light activity, and a 1.5 lb/week target. Edit any assumption with the settings button.
- Calorie targets use the Mifflin-St Jeor equation. Protein starts at 0.8 g/lb, fat at 28% of target calories, and carbs receive the remaining calories.
- Calories, protein, carbs, and fat can all be overridden in the goal editor. **Reset to calculated** removes the override.
- Exercise calories use standard MET estimates and your current profile weight. You can edit the burn before saving or restore the estimate. They are useful estimates, not measurements from a heart-rate monitor.
- **Describe with AI** inside **Log exercise** can interpret an activity, duration, distance, and intensity, then opens the normal editable workout form.
- The built-in food list covers common foods and supports custom manual entries. AI estimates can come from a photo or written meal description, and every food name and nutrition value remains editable before saving.

## Deploy to Netlify

1. Push this folder to a Git repository and import it in Netlify.
2. Netlify reads the build and redirect settings from `netlify.toml`.
3. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, and `APP_PASSWORD` under **Site configuration > Environment variables**.
4. Set `APP_PASSWORD` to `pallab` and deploy.

OpenAI receives a resized meal photo only when **Scan food** is used. Its estimate opens in the normal meal form for review before anything is saved.

## Commands

```bash
npm run dev
npm run build
npm run lint
```