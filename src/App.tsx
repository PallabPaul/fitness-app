import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  LogOut,
  MessageSquareText,
  Plus,
  Scale,
  Settings2,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import {
  analyzeMealDescription,
  analyzeMealPhoto,
  type MealEstimate,
} from "./analyzePhoto";
import {
  analyzeExerciseDescription,
  type ExerciseEstimate,
} from "./analyzeExercise";
import {
  isSupabaseConfigured,
  loadFitnessData,
  saveMeal,
  saveProfile,
  saveWeight,
  saveWorkout,
} from "./data";
import {
  calculateGoals,
  calculateRecommendedGoals,
  defaultProfile,
  estimateExerciseCalories,
  exercisePresets,
  type Profile,
} from "./fitness";
import { foodPresets, type FoodPreset } from "./foods";
import "./App.css";

export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  eatenAt: string;
};
export type Workout = {
  id: string;
  type: "Running" | "Weights" | "Walking" | "Other";
  name: string;
  duration: number;
  distance?: number;
  notes?: string;
  caloriesBurned: number;
  completedAt: string;
};
export type WeightEntry = { id: string; weight: number; recordedAt: string };
type Modal =
  | "meal"
  | "workout"
  | "weight"
  | "photo"
  | "describe"
  | "describeExercise"
  | "profile"
  | null;

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const sameDay = (timestamp: string, date: Date) =>
  localDay(new Date(timestamp)) === localDay(date);
const entryTime = (day: Date) => {
  const value = new Date(day);
  const now = new Date();
  value.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return value.toISOString();
};

function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("fit-unlocked") === "yes",
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [toast, setToast] = useState("");
  const [mealDraft, setMealDraft] = useState<MealEstimate | null>(null);
  const [workoutDraft, setWorkoutDraft] = useState<ExerciseEstimate | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!unlocked) return;
    loadFitnessData()
      .then((data) => {
        setMeals(data.meals);
        setWorkouts(data.workouts);
        setWeights(data.weights);
        setProfile(data.profile);
      })
      .catch(() => setToast("Could not load your data"));
  }, [unlocked]);

  const dailyMeals = meals.filter((meal) => sameDay(meal.eatenAt, selectedDay));
  const dailyWorkouts = workouts.filter((workout) =>
    sameDay(workout.completedAt, selectedDay),
  );
  const dailyWeights = weights.filter((entry) =>
    sameDay(entry.recordedAt, selectedDay),
  );
  const totals = dailyMeals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fat: sum.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const burned = dailyWorkouts.reduce(
    (sum, workout) => sum + workout.caloriesBurned,
    0,
  );
  const goals = calculateGoals(profile);
  const isToday = localDay(selectedDay) === localDay(new Date());
  const dayLabel = isToday
    ? "Today"
    : new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(selectedDay);
  const data = { meals, workouts, weights, profile };

  function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (password.toLowerCase() !== "pallab") return setLoginError(true);
    sessionStorage.setItem("fit-unlocked", "yes");
    setUnlocked(true);
  }

  function moveDay(offset: number) {
    setSelectedDay((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + offset);
      return next;
    });
  }
  function closeWithToast(message: string) {
    setModal(null);
    setToast(message);
  }
  function openManualMeal() {
    setMealDraft(null);
    setModal("meal");
  }
  function openManualWorkout() {
    setWorkoutDraft(null);
    setModal("workout");
  }

  async function addMeal(values: Omit<Meal, "id" | "eatenAt">) {
    const meal = {
      ...values,
      id: crypto.randomUUID(),
      eatenAt: entryTime(selectedDay),
    };
    try {
      await saveMeal(meal, data);
      setMeals((current) => [meal, ...current]);
      setMealDraft(null);
      closeWithToast(`Meal added to ${dayLabel.toLowerCase()}`);
    } catch {
      setToast("Meal could not be saved");
    }
  }

  async function addWorkout(values: Omit<Workout, "id" | "completedAt">) {
    const workout = {
      ...values,
      id: crypto.randomUUID(),
      completedAt: entryTime(selectedDay),
    };
    try {
      await saveWorkout(workout, data);
      setWorkouts((current) => [workout, ...current]);
      setWorkoutDraft(null);
      closeWithToast("Workout logged");
    } catch {
      setToast("Workout could not be saved");
    }
  }

  async function addWeight(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = {
      id: crypto.randomUUID(),
      weight: Number(form.get("weight")),
      recordedAt: entryTime(selectedDay),
    };
    const nextProfile = { ...profile, weightLb: entry.weight };
    try {
      await saveWeight(entry, data);
      await saveProfile(nextProfile, { ...data, weights: [entry, ...weights] });
      setWeights((current) => [entry, ...current]);
      setProfile(nextProfile);
      closeWithToast("Weight and goals updated");
    } catch {
      setToast("Weight could not be saved");
    }
  }

  async function updateProfile(next: Profile) {
    try {
      await saveProfile(next, data);
      setProfile(next);
      closeWithToast("Goals updated");
    } catch {
      setToast("Profile could not be saved");
    }
  }

  async function handlePhoto(file?: File) {
    if (!file) return;
    setAnalyzing(true);
    try {
      setMealDraft(await analyzeMealPhoto(file));
      setModal("meal");
      setToast("Estimate ready to review");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Photo analysis failed",
      );
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDescription(description: string) {
    setAnalyzing(true);
    try {
      setMealDraft(await analyzeMealDescription(description));
      setModal("meal");
      setToast("Estimate ready to edit");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Meal analysis failed",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleExerciseDescription(description: string) {
    setAnalyzing(true);
    try {
      setWorkoutDraft(await analyzeExerciseDescription(description));
      setModal("workout");
      setToast("Exercise estimate ready to edit");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Exercise analysis failed",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  if (!unlocked)
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="brand-mark">
            <Activity size={24} />
          </div>
          <p className="eyebrow">Pallab's power log</p>
          <h1>
            Train hard.
            <br />
            Fuel smart.
          </h1>
          <p className="login-copy">
            Build your strength one meal, workout, and day at a time.
          </p>
          <form onSubmit={unlock} className="login-form">
            <label htmlFor="password">Password</label>
            <div className="password-row">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLoginError(false);
                }}
                autoFocus
                placeholder="Enter password"
              />
              <button type="submit">Enter</button>
            </div>
            {loginError && (
              <p className="form-error">That password is not correct.</p>
            )}
          </form>
        </section>
        <aside className="login-visual" aria-hidden="true">
          <span className="visual-number">01</span>
          <div className="visual-copy">
            <span>Push past</span>
            <strong>yesterday.</strong>
          </div>
        </aside>
      </main>
    );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span>
            <Activity size={18} />
          </span>{" "}
          POWER LOG
        </a>
        <div className="day-nav">
          <button
            className="icon-button"
            onClick={() => moveDay(-1)}
            title="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="day-button"
            onClick={() => setSelectedDay(new Date())}
          >
            <strong>{dayLabel}</strong>
            <small>
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(selectedDay)}
            </small>
          </button>
          <button
            className="icon-button"
            onClick={() => moveDay(1)}
            disabled={isToday}
            title="Next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={() => setModal("profile")}
            title="Edit goals"
          >
            <Settings2 size={18} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              sessionStorage.removeItem("fit-unlocked");
              setUnlocked(false);
            }}
            title="Lock dashboard"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main id="top" className="dashboard">
        <section className="intro">
          <div>
            <p className="eyebrow">
              {dayLabel} · {isSupabaseConfigured ? "Synced" : "Local mode"}
            </p>
            <h1>{isToday ? "Power up, Pallab." : dayLabel}</h1>
            <p>
              {isToday
                ? "Train. Fuel. Ascend."
                : "Review or add entries for this day."}
            </p>
          </div>
          <div className="quick-actions">
            <button className="photo-action" onClick={openManualMeal}>
              <Plus size={19} /> Add meal
            </button>
            <button onClick={openManualWorkout}>
              <Plus size={19} /> Log exercise
            </button>
          </div>
        </section>
        <section className="stats-grid" aria-label="Daily summary">
          <article className="calorie-card">
            <div className="stat-heading">
              <Flame size={18} />
              <p>Calories</p>
              <small>Personal goal {goals.calories.toLocaleString()}</small>
            </div>
            <div className="calorie-value">
              <strong>{totals.calories.toLocaleString()}</strong>
              <span>kcal eaten</span>
            </div>
            <Progress value={totals.calories} goal={goals.calories} />
            <p className="remaining">
              {Math.max(goals.calories - totals.calories, 0).toLocaleString()}{" "}
              remaining · {burned.toLocaleString()} exercise kcal burned
            </p>
          </article>
          {(
            [
              ["Protein", totals.protein, goals.protein, "#e55d36"],
              ["Carbs", totals.carbs, goals.carbs, "#d39a22"],
              ["Fat", totals.fat, goals.fat, "#3c8c70"],
            ] as const
          ).map(([label, value, goal, color]) => (
            <article
              className="macro-card"
              key={label}
              style={{ "--macro-color": color } as React.CSSProperties}
            >
              <p>{label}</p>
              <strong>
                {value}
                <small>g</small>
              </strong>
              <Progress value={value} goal={goal} />
              <span>{goal}g personal goal</span>
            </article>
          ))}
        </section>
        <button className="goal-strip" onClick={() => setModal("profile")}>
          <span>
            <Settings2 size={16} /> Based on {profile.weightLb} lb ·{" "}
            {profile.heightFt}′ {profile.heightIn}″ · {profile.weeklyLossLb}{" "}
            lb/week loss
          </span>
          <strong>
            {goals.maintenance.toLocaleString()} kcal estimated maintenance
          </strong>
        </button>
        <section className="content-grid">
          <Panel
            title={`${dayLabel}'s food`}
            eyebrow="Nutrition"
            onAdd={openManualMeal}
          >
            {!dailyMeals.length && (
              <Empty icon={<Utensils />} text="No meals logged for this day" />
            )}
            {dailyMeals.map((meal) => (
              <div className="entry" key={meal.id}>
                <span className="entry-icon">
                  <Utensils size={17} />
                </span>
                <div>
                  <strong>{meal.name}</strong>
                  <small>
                    {meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g
                    fat
                  </small>
                </div>
                <b>
                  {meal.calories}
                  <small> kcal</small>
                </b>
              </div>
            ))}
          </Panel>
          <Panel
            title={`${dayLabel}'s movement`}
            eyebrow="Training"
            onAdd={openManualWorkout}
            className="workouts-panel"
          >
            {!dailyWorkouts.length && (
              <Empty
                icon={<Dumbbell />}
                text="No exercise logged for this day"
              />
            )}
            {dailyWorkouts.map((workout) => (
              <div className="entry" key={workout.id}>
                <span className="entry-icon">
                  {workout.type === "Running" ? (
                    <Footprints size={17} />
                  ) : (
                    <Dumbbell size={17} />
                  )}
                </span>
                <div>
                  <strong>{workout.name}</strong>
                  <small>
                    {workout.duration} min
                    {workout.distance ? ` · ${workout.distance} mi` : ""}
                  </small>
                </div>
                <b>
                  {workout.caloriesBurned}
                  <small> kcal</small>
                </b>
              </div>
            ))}
          </Panel>
          <article className="panel weight-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Progress</p>
                <h2>Body weight</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setModal("weight")}
                title="Record weight"
              >
                <Plus size={19} />
              </button>
            </div>
            <div className="weight-content">
              <span className="scale-icon">
                <Scale size={22} />
              </span>
              {dailyWeights.length ? (
                <div>
                  <strong>
                    {dailyWeights[0].weight}
                    <small> lb</small>
                  </strong>
                  <p>Recorded {dayLabel.toLowerCase()}</p>
                </div>
              ) : (
                <div>
                  <strong>
                    {profile.weightLb}
                    <small> lb</small>
                  </strong>
                  <p>Current profile weight</p>
                </div>
              )}
              <button onClick={() => setModal("weight")}>Record weight</button>
            </div>
          </article>
        </section>
      </main>
      <footer>
        <span>POWER LOG</span>
        <p>Every session raises your level.</p>
      </footer>
      {toast && <div className="toast">{toast}</div>}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setModal(null)
          }
        >
          <section className="modal" role="dialog" aria-modal="true">
            <button
              className="modal-close icon-button"
              onClick={() => setModal(null)}
              title="Close"
            >
              <X size={19} />
            </button>
            {modal === "meal" && (
              <MealForm
                draft={mealDraft}
                onSave={addMeal}
                onScan={() => setModal("photo")}
                onDescribe={() => setModal("describe")}
              />
            )}
            {modal === "workout" && (
              <WorkoutForm
                draft={workoutDraft}
                weightLb={profile.weightLb}
                onSave={addWorkout}
                onDescribe={() => setModal("describeExercise")}
              />
            )}
            {modal === "weight" && (
              <EntryForm
                title="Record weight"
                eyebrow="Progress"
                onSubmit={addWeight}
              >
                <label>
                  Weight (lb)
                  <input
                    name="weight"
                    type="number"
                    min="50"
                    max="1000"
                    step="0.1"
                    defaultValue={profile.weightLb}
                    required
                    autoFocus
                  />
                </label>
              </EntryForm>
            )}
            {modal === "profile" && (
              <ProfileForm profile={profile} onSave={updateProfile} />
            )}
            {modal === "describe" && (
              <DescribeMealForm
                loading={analyzing}
                onAnalyze={handleDescription}
              />
            )}
            {modal === "describeExercise" && (
              <DescribeExerciseForm
                loading={analyzing}
                onAnalyze={handleExerciseDescription}
              />
            )}
            {modal === "photo" && (
              <div className="photo-modal">
                <p className="eyebrow">AI meal scan</p>
                <h2>Photograph your food</h2>
                <p>
                  Take a clear overhead photo. You can review ChatGPT's estimate
                  before saving it.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(event) => handlePhoto(event.target.files?.[0])}
                />
                <button
                  className="upload-zone"
                  onClick={() => fileRef.current?.click()}
                  disabled={analyzing}
                >
                  <span>
                    {analyzing ? <Sparkles size={27} /> : <Camera size={27} />}
                  </span>
                  <strong>
                    {analyzing ? "Analyzing meal…" : "Take or choose photo"}
                  </strong>
                  <small>
                    {analyzing
                      ? "This can take a few seconds"
                      : "JPG, PNG or HEIC"}
                  </small>
                </button>
                <div className="ai-note">
                  <Sparkles size={17} />
                  <span>
                    Food estimates are approximate. Adjust values when needed.
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MealForm({
  draft,
  onSave,
  onScan,
  onDescribe,
}: {
  draft: MealEstimate | null;
  onSave: (meal: Omit<Meal, "id" | "eatenAt">) => void;
  onScan: () => void;
  onDescribe: () => void;
}) {
  const [query, setQuery] = useState(draft?.name || "");
  const [selected, setSelected] = useState<FoodPreset | null>(null);
  const [servings, setServings] = useState(1);
  const [values, setValues] = useState({
    calories: draft?.calories || 0,
    protein: draft?.protein || 0,
    carbs: draft?.carbs || 0,
    fat: draft?.fat || 0,
  });
  const results =
    query.length > 1 && !selected
      ? foodPresets
          .filter((food) =>
            food.name.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 6)
      : [];
  function choose(food: FoodPreset) {
    setSelected(food);
    setQuery(food.name);
    setServings(1);
    setValues({
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
  }
  function scale(quantity: number) {
    setServings(quantity);
    if (selected)
      setValues({
        calories: Math.round(selected.calories * quantity),
        protein: Math.round(selected.protein * quantity),
        carbs: Math.round(selected.carbs * quantity),
        fat: Math.round(selected.fat * quantity),
      });
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave({ name: query, ...values });
  }
  return (
    <form className="entry-form" onSubmit={submit}>
      <p className="eyebrow">Nutrition</p>
      <div className="meal-form-title">
        <h2>{draft ? "Review meal estimate" : "Find or add food"}</h2>
        <div className="nested-ai-actions">
          <button type="button" onClick={onScan}>
            <Camera size={15} /> Scan food
          </button>
          <button type="button" onClick={onDescribe}>
            <MessageSquareText size={15} /> Describe with AI
          </button>
        </div>
      </div>
      {draft && (
        <div className="ai-note ai-review-note">
          <Sparkles size={17} />
          <span>
            AI estimate ready. Edit the food name or any nutrition number below
            before saving.
          </span>
        </div>
      )}
      <label className="food-search">
        Food
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          required
          autoComplete="off"
          placeholder="Start typing chicken, rice, oats…"
        />
        {results.length > 0 && (
          <div className="food-results">
            {results.map((food) => (
              <button
                type="button"
                key={`${food.name}-${food.serving}`}
                onClick={() => choose(food)}
              >
                <span>
                  <strong>{food.name}</strong>
                  <small>{food.serving}</small>
                </span>
                <b>{food.calories} kcal</b>
              </button>
            ))}
          </div>
        )}
      </label>
      {selected && (
        <div className="serving-row">
          <label>
            Serving size
            <input value={selected.serving} readOnly />
          </label>
          <label>
            Servings
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={servings}
              onChange={(event) => scale(Number(event.target.value))}
            />
          </label>
        </div>
      )}
      <div className="form-grid">
        <MacroInput
          label="Calories"
          value={values.calories}
          onChange={(calories) => setValues({ ...values, calories })}
        />
        <MacroInput
          label="Protein (g)"
          value={values.protein}
          onChange={(protein) => setValues({ ...values, protein })}
        />
        <MacroInput
          label="Carbs (g)"
          value={values.carbs}
          onChange={(carbs) => setValues({ ...values, carbs })}
        />
        <MacroInput
          label="Fat (g)"
          value={values.fat}
          onChange={(fat) => setValues({ ...values, fat })}
        />
      </div>
      <button type="submit" className="submit-button">
        Save meal
      </button>
    </form>
  );
}

function DescribeMealForm({
  loading,
  onAnalyze,
}: {
  loading: boolean;
  onAnalyze: (description: string) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    void onAnalyze(description);
  }
  return (
    <form className="entry-form describe-form" onSubmit={submit}>
      <p className="eyebrow">AI meal estimate</p>
      <h2>Describe what you ate</h2>
      <p className="form-note">
        Include amounts, ingredients, cooking method, and sauces when you can.
      </p>
      <label>
        Meal description
        <textarea
          rows={6}
          minLength={3}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Two scrambled eggs cooked in a teaspoon of butter, two slices of wheat toast, and a medium banana"
          required
          autoFocus
        />
      </label>
      <div className="ai-note">
        <Sparkles size={17} />
        <span>The result opens as an editable estimate before it is saved.</span>
      </div>
      <button className="submit-button" type="submit" disabled={loading}>
        {loading ? "Estimating meal…" : "Estimate calories & macros"}
      </button>
    </form>
  );
}

function WorkoutForm({
  draft,
  weightLb,
  onSave,
  onDescribe,
}: {
  draft: ExerciseEstimate | null;
  weightLb: number;
  onSave: (workout: Omit<Workout, "id" | "completedAt">) => void;
  onDescribe: () => void;
}) {
  const draftPreset = draft
    ? exercisePresets.findIndex((preset) => preset.name === draft.presetName)
    : 0;
  const [presetIndex, setPresetIndex] = useState(Math.max(draftPreset, 0));
  const [minutes, setMinutes] = useState(draft?.duration ?? 30);
  const [calorieOverride, setCalorieOverride] = useState<number | null>(null);
  const preset = exercisePresets[presetIndex];
  const estimatedCalories = estimateExerciseCalories(preset.met, minutes, weightLb);
  const calories = calorieOverride ?? estimatedCalories;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      type: preset.type,
      name: preset.name,
      duration: minutes,
      distance: Number(form.get("distance")) || undefined,
      notes: String(form.get("notes") || ""),
      caloriesBurned: calories,
    });
  }
  return (
    <form className="entry-form" onSubmit={submit}>
      <p className="eyebrow">Training</p>
      <div className="meal-form-title">
        <h2>{draft ? "Review exercise estimate" : "Log exercise"}</h2>
        <div className="nested-ai-actions">
          <button type="button" onClick={onDescribe}>
            <MessageSquareText size={15} /> Describe with AI
          </button>
        </div>
      </div>
      {draft && (
        <div className="ai-note ai-review-note">
          <Sparkles size={17} />
          <span>
            AI matched the closest activity. Edit the exercise, duration,
            distance, or calories before saving.
          </span>
        </div>
      )}
      <label>
        Exercise
        <select
          value={presetIndex}
          onChange={(event) => setPresetIndex(Number(event.target.value))}
        >
          {exercisePresets.map((exercise, index) => (
            <option key={exercise.name} value={index}>
              {exercise.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Duration (min)
          <input
            type="number"
            min="1"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            required
          />
        </label>
        <label>
          Distance (mi)
          <input
            name="distance"
            type="number"
            min="0"
            step="0.1"
            defaultValue={draft?.distance ?? undefined}
          />
        </label>
      </div>
      <div className="burn-estimate">
        <Flame size={18} />
        <label>
          <span>{calorieOverride == null ? "Estimated burn" : "Custom burn"}</span>
          <input
            type="number"
            min="0"
            value={calories}
            onChange={(event) => setCalorieOverride(Number(event.target.value))}
            aria-label="Calories burned"
            required
          />
          <small>kcal</small>
        </label>
        <button
          type="button"
          onClick={() => setCalorieOverride(null)}
          disabled={calorieOverride == null}
        >
          Use estimate
        </button>
      </div>
      <label>
        Notes
        <textarea name="notes" rows={3} placeholder="Optional notes" />
      </label>
      <button className="submit-button" type="submit">
        Save workout
      </button>
    </form>
  );
}

function DescribeExerciseForm({
  loading,
  onAnalyze,
}: {
  loading: boolean;
  onAnalyze: (description: string) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    void onAnalyze(description);
  }
  return (
    <form className="entry-form describe-form" onSubmit={submit}>
      <p className="eyebrow">AI exercise estimate</p>
      <h2>Describe your exercise</h2>
      <p className="form-note">
        Include the activity, duration, distance, and intensity when you can.
      </p>
      <label>
        Exercise description
        <textarea
          rows={6}
          minLength={3}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ran 3 miles at an easy pace in about 32 minutes"
          required
          autoFocus
        />
      </label>
      <div className="ai-note">
        <Sparkles size={17} />
        <span>The result opens as an editable estimate before it is saved.</span>
      </div>
      <button className="submit-button" type="submit" disabled={loading}>
        {loading ? "Estimating exercise…" : "Estimate exercise"}
      </button>
    </form>
  );
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
}) {
  const [values, setValues] = useState(profile);
  const goals = calculateGoals(values);
  const recommended = calculateRecommendedGoals(values);
  function setGoal(goal: keyof NonNullable<Profile["customGoals"]>, value: number) {
    setValues({
      ...values,
      customGoals: { ...goals, [goal]: value },
    });
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave(values);
  }
  return (
    <form className="entry-form" onSubmit={submit}>
      <p className="eyebrow">Personal goals</p>
      <h2>Your calorie target</h2>
      <p className="form-note">
        Uses the Mifflin-St Jeor equation and your chosen weekly loss rate.
      </p>
      <div className="profile-goal">
        <strong>{goals.calories.toLocaleString()}</strong>
        <span>{values.customGoals ? "custom kcal/day" : "kcal/day"}</span>
        <small>
          P {goals.protein}g · C {goals.carbs}g · F {goals.fat}g
        </small>
      </div>
      <div className="goal-editor-heading">
        <div>
          <strong>Edit daily goals</strong>
          <small>Enter the targets you want shown on the dashboard.</small>
        </div>
        <button
          type="button"
          onClick={() => setValues({ ...values, customGoals: null })}
          disabled={!values.customGoals}
        >
          Reset to calculated
        </button>
      </div>
      <div className="form-grid goal-fields">
        <label>
          Calories
          <input
            type="number"
            min="1000"
            value={goals.calories}
            onChange={(event) => setGoal("calories", Number(event.target.value))}
            required
          />
        </label>
        <label>
          Protein (g)
          <input
            type="number"
            min="0"
            value={goals.protein}
            onChange={(event) => setGoal("protein", Number(event.target.value))}
            required
          />
        </label>
        <label>
          Carbs (g)
          <input
            type="number"
            min="0"
            value={goals.carbs}
            onChange={(event) => setGoal("carbs", Number(event.target.value))}
            required
          />
        </label>
        <label>
          Fat (g)
          <input
            type="number"
            min="0"
            value={goals.fat}
            onChange={(event) => setGoal("fat", Number(event.target.value))}
            required
          />
        </label>
      </div>
      {values.customGoals && (
        <p className="custom-goal-note">
          Custom goals are active. Calculated recommendation: {recommended.calories.toLocaleString()} kcal · P {recommended.protein}g · C {recommended.carbs}g · F {recommended.fat}g
        </p>
      )}
      <div className="form-grid">
        <label>
          Weight (lb)
          <input
            type="number"
            min="50"
            value={values.weightLb}
            onChange={(event) =>
              setValues({ ...values, weightLb: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Age
          <input
            type="number"
            min="18"
            max="100"
            value={values.age}
            onChange={(event) =>
              setValues({ ...values, age: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Height feet
          <input
            type="number"
            min="3"
            max="8"
            value={values.heightFt}
            onChange={(event) =>
              setValues({ ...values, heightFt: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Height inches
          <input
            type="number"
            min="0"
            max="11"
            value={values.heightIn}
            onChange={(event) =>
              setValues({ ...values, heightIn: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <label>
        Sex used in equation
        <select
          value={values.sex}
          onChange={(event) =>
            setValues({ ...values, sex: event.target.value as Profile["sex"] })
          }
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>
      <label>
        Typical activity
        <select
          value={values.activity}
          onChange={(event) =>
            setValues({
              ...values,
              activity: event.target.value as Profile["activity"],
            })
          }
        >
          <option value="sedentary">Sedentary · mostly seated</option>
          <option value="light">Light · exercise 1–3 days/week</option>
          <option value="moderate">Moderate · exercise 3–5 days/week</option>
          <option value="active">Active · exercise 6–7 days/week</option>
        </select>
      </label>
      <label>
        Target loss
        <select
          value={values.weeklyLossLb}
          onChange={(event) =>
            setValues({
              ...values,
              weeklyLossLb: Number(
                event.target.value,
              ) as Profile["weeklyLossLb"],
            })
          }
        >
          <option value="0.5">0.5 lb per week</option>
          <option value="1">1 lb per week</option>
          <option value="1.5">1.5 lb per week</option>
        </select>
      </label>
      <button className="submit-button" type="submit">
        Use these goals
      </button>
    </form>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        required
      />
    </label>
  );
}
function Progress({ value, goal }: { value: number; goal: number }) {
  return (
    <div className="progress-track">
      <div style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} />
    </div>
  );
}
function Panel({
  title,
  eyebrow,
  onAdd,
  className = "",
  children,
}: {
  title: string;
  eyebrow: string;
  onAdd: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onAdd}
          title={`Add ${eyebrow.toLowerCase()}`}
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="entry-list">{children}</div>
    </article>
  );
}
function EntryForm({
  title,
  eyebrow,
  onSubmit,
  submitLabel = "Save entry",
  children,
}: {
  title: string;
  eyebrow: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <form className="entry-form" onSubmit={onSubmit}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
      <button type="submit" className="submit-button">
        {submitLabel}
      </button>
    </form>
  );
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

export default App;
