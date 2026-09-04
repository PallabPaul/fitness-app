export type FoodPreset = {
  name: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const foodPresets: FoodPreset[] = [
  { name: 'Chicken breast, cooked', serving: '100 g', calories: 165, protein: 31, carbs: 0, fat: 4 },
  { name: 'White rice, cooked', serving: '1 cup (158 g)', calories: 205, protein: 4, carbs: 45, fat: 0 },
  { name: 'Brown rice, cooked', serving: '1 cup (195 g)', calories: 216, protein: 5, carbs: 45, fat: 2 },
  { name: 'Whole egg', serving: '1 large egg', calories: 72, protein: 6, carbs: 0, fat: 5 },
  { name: 'Greek yogurt, nonfat', serving: '1 cup (245 g)', calories: 130, protein: 23, carbs: 9, fat: 0 },
  { name: 'Oats, dry', serving: '1/2 cup (40 g)', calories: 150, protein: 5, carbs: 27, fat: 3 },
  { name: 'Banana', serving: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Apple', serving: '1 medium', calories: 95, protein: 1, carbs: 25, fat: 0 },
  { name: 'Avocado', serving: '1/2 medium', calories: 120, protein: 2, carbs: 6, fat: 11 },
  { name: 'Salmon, cooked', serving: '100 g', calories: 206, protein: 22, carbs: 0, fat: 12 },
  { name: 'Ground beef, 90% lean', serving: '100 g cooked', calories: 217, protein: 26, carbs: 0, fat: 12 },
  { name: 'Whole wheat bread', serving: '1 slice', calories: 81, protein: 4, carbs: 14, fat: 1 },
  { name: 'Peanut butter', serving: '2 tbsp (32 g)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { name: 'Whey protein powder', serving: '1 scoop (30 g)', calories: 120, protein: 24, carbs: 3, fat: 2 },
  { name: 'Milk, 2%', serving: '1 cup (240 ml)', calories: 122, protein: 8, carbs: 12, fat: 5 },
  { name: 'Paneer', serving: '100 g', calories: 265, protein: 18, carbs: 3, fat: 20 },
  { name: 'Dal, cooked', serving: '1 cup', calories: 230, protein: 14, carbs: 40, fat: 4 },
  { name: 'Roti', serving: '1 medium', calories: 120, protein: 4, carbs: 22, fat: 3 },
]