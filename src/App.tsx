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
  Mic,
  Pencil,
  Plus,
  Scale,
  Settings2,
  Sparkles,
  Square,
  Target,
  Timer,
  Trash2,
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
  deleteMeal,
  deleteWorkout,
  isSupabaseConfigured,
  loadFitnessData,
  saveMeal,
  saveProfile,
  saveWeight,
  saveWorkout,
  updateMeal,
  updateWeight,
  updateWorkout,
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
import { WellnessPages } from "./WellnessPages";
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
type AppView = "log" | "goals" | "fast";

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
  const [activeView, setActiveView] = useState<AppView>("log");
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [toast, setToast] = useState("");
  const [mealDraft, setMealDraft] = useState<MealEstimate | null>(null);
  const [workoutDraft, setWorkoutDraft] = useState<ExerciseEstimate | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
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
  const selectedDayEnd = new Date(selectedDay);
  selectedDayEnd.setHours(23, 59, 59, 999);
  const effectiveWeight = weights
    .filter((entry) => new Date(entry.recordedAt) <= selectedDayEnd)
    .sort(
      (left, right) =>
        new Date(right.recordedAt).getTime() -
        new Date(left.recordedAt).getTime(),
    )[0]?.weight ?? profile.weightLb;
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
    setEditingMeal(null);
    setModal("meal");
  }
  function openManualWorkout() {
    setWorkoutDraft(null);
    setEditingWorkout(null);
    setModal("workout");
  }

  function openMealEdit(meal: Meal) {
    setMealDraft(null);
    setEditingMeal(meal);
    setModal("meal");
  }

  function openWorkoutEdit(workout: Workout) {
    setWorkoutDraft(null);
    setEditingWorkout(workout);
    setModal("workout");
  }

  async function removeMeal(meal: Meal) {
    if (!window.confirm(`Delete ${meal.name}? This cannot be undone.`)) return;
    try {
      await deleteMeal(meal.id, data);
      setMeals((current) => current.filter((item) => item.id !== meal.id));
      setToast("Meal deleted");
    } catch {
      setToast("Meal could not be deleted");
    }
  }

  async function removeWorkout(workout: Workout) {
    if (!window.confirm(`Delete ${workout.name}? This cannot be undone.`)) return;
    try {
      await deleteWorkout(workout.id, data);
      setWorkouts((current) => current.filter((item) => item.id !== workout.id));
      setToast("Workout deleted");
    } catch {
      setToast("Workout could not be deleted");
    }
  }

  async function addMeal(values: Omit<Meal, "id" | "eatenAt">) {
    if (editingMeal) {
      const meal = { ...editingMeal, ...values };
      try {
        await updateMeal(meal, data);
        setMeals((current) => current.map((item) => item.id === meal.id ? meal : item));
        setEditingMeal(null);
        closeWithToast("Meal updated");
      } catch {
        setToast("Meal could not be updated");
      }
      return;
    }
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
    if (editingWorkout) {
      const workout = { ...editingWorkout, ...values };
      try {
        await updateWorkout(workout, data);
        setWorkouts((current) => current.map((item) => item.id === workout.id ? workout : item));
        setEditingWorkout(null);
        closeWithToast("Workout updated");
      } catch {
        setToast("Workout could not be updated");
      }
      return;
    }
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
    const existing = dailyWeights[0];
    const entry = existing
      ? { ...existing, weight: Number(form.get("weight")) }
      : {
          id: crypto.randomUUID(),
          weight: Number(form.get("weight")),
          recordedAt: entryTime(selectedDay),
        };
    try {
      if (existing) {
        await updateWeight(entry, data);
        setWeights((current) =>
          current.map((item) => (item.id === entry.id ? entry : item)),
        );
      } else {
        await saveWeight(entry, data);
        setWeights((current) => [entry, ...current]);
      }
      closeWithToast(existing ? "Weight updated for this day" : "Weight recorded for this day");
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
        <nav className="view-switch" aria-label="Power Log pages">
          <button className={activeView === "log" ? "active" : ""} onClick={() => setActiveView("log")}><Activity size={15} /><span>Log</span></button>
          <button className={activeView === "goals" ? "active" : ""} onClick={() => setActiveView("goals")}><Target size={15} /><span>Goals</span></button>
          <button className={activeView === "fast" ? "active" : ""} onClick={() => setActiveView("fast")}><Timer size={15} /><span>Fast</span></button>
        </nav>
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
          {activeView === "log" && <button
            className="icon-button"
            onClick={() => setModal("profile")}
            title="Edit goals"
          >
            <Settings2 size={18} />
          </button>}
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
      {activeView === "log" ? <main id="top" className="dashboard">
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
                <button className="entry-edit" onClick={() => openMealEdit(meal)} title={`Edit ${meal.name}`}>
                  <Pencil size={15} />
                </button>
                <button className="entry-delete" onClick={() => void removeMeal(meal)} title={`Delete ${meal.name}`}>
                  <Trash2 size={15} />
                </button>
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
                <button className="entry-edit" onClick={() => openWorkoutEdit(workout)} title={`Edit ${workout.name}`}>
                  <Pencil size={15} />
                </button>
                <button className="entry-delete" onClick={() => void removeWorkout(workout)} title={`Delete ${workout.name}`}>
                  <Trash2 size={15} />
                </button>
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
                  <strong>—</strong>
                  <p>No weight recorded {dayLabel.toLowerCase()}</p>
                </div>
              )}
              <button onClick={() => setModal("weight")}>Record weight</button>
            </div>
          </article>
        </section>
      </main> : <WellnessPages view={activeView} selectedDay={selectedDay} onToast={setToast} />}
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
                draft={editingMeal || mealDraft}
                editing={Boolean(editingMeal)}
                onSave={addMeal}
                onScan={() => setModal("photo")}
                onDescribe={() => setModal("describe")}
              />
            )}
            {modal === "workout" && (
              <WorkoutForm
                draft={workoutDraft}
                editing={editingWorkout}
                weightLb={effectiveWeight}
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
                    defaultValue={dailyWeights[0]?.weight ?? effectiveWeight}
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
  editing,
  onSave,
  onScan,
  onDescribe,
}: {
  draft: MealEstimate | null;
  editing: boolean;
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
        <h2>{editing ? "Edit meal" : draft ? "Review meal estimate" : "Find or add food"}</h2>
        {!editing && (
          <div className="nested-ai-actions">
            <button type="button" onClick={onScan}>
              <Camera size={15} /> Scan food
            </button>
            <button type="button" onClick={onDescribe}>
              <MessageSquareText size={15} /> Describe with AI
            </button>
          </div>
        )}
      </div>
      {draft && !editing && (
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
        {editing ? "Update meal" : "Save meal"}
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
      <VoiceDescriptionInput
        label="Meal description"
        value={description}
        onChange={setDescription}
        placeholder="Two scrambled eggs cooked in a teaspoon of butter, two slices of wheat toast, and a medium banana"
      />
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
  editing,
  weightLb,
  onSave,
  onDescribe,
}: {
  draft: ExerciseEstimate | null;
  editing: Workout | null;
  weightLb: number;
  onSave: (workout: Omit<Workout, "id" | "completedAt">) => void;
  onDescribe: () => void;
}) {
  const draftPreset = editing || draft
    ? exercisePresets.findIndex((preset) => preset.name === (editing?.name || draft?.presetName))
    : 0;
  const [presetIndex, setPresetIndex] = useState(Math.max(draftPreset, 0));
  const [exerciseName, setExerciseName] = useState(
    editing?.name || draft?.presetName || exercisePresets[Math.max(draftPreset, 0)].name,
  );
  const [minutes, setMinutes] = useState(editing?.duration ?? draft?.duration ?? 30);
  const [calorieOverride, setCalorieOverride] = useState<number | null>(editing?.caloriesBurned ?? null);
  const preset = exercisePresets[presetIndex];
  const estimatedCalories = estimateExerciseCalories(preset.met, minutes, weightLb);
  const calories = calorieOverride ?? estimatedCalories;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      type: preset.type,
      name: exerciseName,
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
        <h2>{editing ? "Edit exercise" : draft ? "Review exercise estimate" : "Log exercise"}</h2>
        {!editing && (
          <div className="nested-ai-actions">
            <button type="button" onClick={onDescribe}>
              <MessageSquareText size={15} /> Describe with AI
            </button>
          </div>
        )}
      </div>
      {draft && !editing && (
        <div className="ai-note ai-review-note">
          <Sparkles size={17} />
          <span>
            AI matched the closest activity. Edit the exercise, duration,
            distance, or calories before saving.
          </span>
        </div>
      )}
      <label>
        Exercise name
        <input
          value={exerciseName}
          onChange={(event) => setExerciseName(event.target.value)}
          placeholder="Morning run, leg day, basketball…"
          required
        />
      </label>
      <label>
        Activity type for calorie estimate
        <select
          value={presetIndex}
          onChange={(event) => {
            const nextIndex = Number(event.target.value);
            setPresetIndex(nextIndex);
            setExerciseName(exercisePresets[nextIndex].name);
            setCalorieOverride(null);
          }}
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
            defaultValue={editing?.distance ?? draft?.distance ?? undefined}
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
        <textarea name="notes" rows={3} placeholder="Optional notes" defaultValue={editing?.notes} />
      </label>
      <button className="submit-button" type="submit">
        {editing ? "Update workout" : "Save workout"}
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
      <VoiceDescriptionInput
        label="Exercise description"
        value={description}
        onChange={setDescription}
        placeholder="Ran 3 miles at an easy pace in about 32 minutes"
      />
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

type SpeechResult = { 0: { transcript: string } };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function VoiceDescriptionInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const SpeechRecognition =
    speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

  useEffect(() => () => recognitionRef.current?.abort(), []);

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechRecognition) return;
    const initialText = value.trim();
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      onChange([initialText, spoken].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setVoiceError(
        "Voice input stopped. Check microphone permission and try again.",
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setVoiceError("");
    setListening(true);
    recognition.start();
  }

  return (
    <label>
      {label}
      <div className="voice-input">
        <textarea
          rows={6}
          minLength={3}
          maxLength={2000}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          autoFocus
        />
        <button
          type="button"
          className={listening ? "voice-button listening" : "voice-button"}
          onClick={toggleVoice}
          disabled={!SpeechRecognition}
          aria-pressed={listening}
          title={
            SpeechRecognition
              ? listening
                ? "Stop listening"
                : "Speak description"
              : "Voice input is not supported in this browser"
          }
        >
          {listening ? <Square size={16} /> : <Mic size={18} />}
          {listening ? "Stop" : "Speak"}
        </button>
      </div>
      <small
        className={voiceError ? "voice-status error" : "voice-status"}
        role="status"
      >
        {voiceError ||
          (listening
            ? "Listening… speak naturally"
            : !SpeechRecognition
              ? "Voice input is unavailable in this browser"
              : "")}
      </small>
    </label>
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
          Goal calculation weight (lb)
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
