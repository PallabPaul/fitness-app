export type Profile = {
  weightLb: number
  heightFt: number
  heightIn: number
  age: number
  sex: 'male' | 'female'
  activity: 'sedentary' | 'light' | 'moderate' | 'active'
  weeklyLossLb: 0.5 | 1 | 1.5
  customGoals: { calories: number; protein: number; carbs: number; fat: number } | null
}

export const defaultProfile: Profile = {
  weightLb: 195,
  heightFt: 5,
  heightIn: 11,
  age: 30,
  sex: 'male',
  activity: 'light',
  weeklyLossLb: 1.5,
  customGoals: null,
}

const activityFactors: Record<Profile['activity'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

export function calculateRecommendedGoals(profile: Profile) {
  const kilograms = profile.weightLb * 0.453592
  const centimeters = (profile.heightFt * 12 + profile.heightIn) * 2.54
  const bmr = 10 * kilograms + 6.25 * centimeters - 5 * profile.age + (profile.sex === 'male' ? 5 : -161)
  const maintenance = bmr * activityFactors[profile.activity]
  const calorieGoal = Math.max(1200, Math.round((maintenance - profile.weeklyLossLb * 500) / 10) * 10)
  const protein = Math.round(profile.weightLb * 0.8)
  const fat = Math.round((calorieGoal * 0.28) / 9)
  const carbs = Math.max(0, Math.round((calorieGoal - protein * 4 - fat * 9) / 4))
  return { calories: calorieGoal, protein, carbs, fat, maintenance: Math.round(maintenance) }
}

export function calculateGoals(profile: Profile) {
  const recommended = calculateRecommendedGoals(profile)
  return profile.customGoals ? { ...recommended, ...profile.customGoals } : recommended
}

export const exercisePresets = [
  { name: 'Running · easy pace', type: 'Running', met: 8.3 },
  { name: 'Running · steady pace', type: 'Running', met: 9.8 },
  { name: 'Running · fast pace', type: 'Running', met: 11.5 },
  { name: 'Weight training · moderate', type: 'Weights', met: 3.5 },
  { name: 'Weight training · vigorous', type: 'Weights', met: 6 },
  { name: 'Walking · relaxed', type: 'Walking', met: 2.8 },
  { name: 'Walking · brisk', type: 'Walking', met: 4.3 },
  { name: 'Cycling · moderate', type: 'Other', met: 7.5 },
  { name: 'HIIT', type: 'Other', met: 8 },
] as const

export function estimateExerciseCalories(met: number, minutes: number, weightLb: number) {
  return Math.max(0, Math.round((met * 3.5 * weightLb * 0.453592 / 200) * minutes))
}