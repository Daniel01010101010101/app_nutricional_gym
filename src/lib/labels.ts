import type {
  Allergen,
  BodyFatMethod,
  Budget,
  DietRestriction,
  Equipment,
  ExperienceLevel,
  JobType,
  Joint,
  LoadType,
  MainLift,
  MovementPattern,
  WeightUnit,
} from '@/domain/types'

export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export const JOB_LABEL: Record<JobType, string> = {
  sedentary: 'Sentado la mayor parte del día',
  standing: 'De pie o en movimiento',
  physical: 'Trabajo físico pesado',
}

export const BODY_FAT_METHOD_LABEL: Record<BodyFatMethod, string> = {
  dexa: 'DEXA (densitometría)',
  bodpod: 'BodPod',
  'skinfold-pro': 'Plicometría profesional',
  'bia-pro': 'Bioimpedancia profesional (InBody o similar)',
  'bia-home': 'Báscula de bioimpedancia casera',
  navy: 'Estimación US Navy (medidas)',
  visual: 'Estimación visual',
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barra olímpica',
  rack: 'Rack / jaula',
  bench: 'Banco',
  dumbbell: 'Mancuernas',
  machine: 'Máquinas',
  cable: 'Poleas',
  'pullup-bar': 'Barra de dominadas',
  kettlebell: 'Kettlebell',
  band: 'Bandas elásticas',
  'ez-bar': 'Barra Z',
  'trap-bar': 'Barra hexagonal',
  smith: 'Máquina Smith',
  bodyweight: 'Peso corporal',
}

export const JOINT_LABEL: Record<Joint, string> = {
  shoulder: 'Hombro',
  elbow: 'Codo',
  wrist: 'Muñeca',
  'lower-back': 'Zona lumbar',
  hip: 'Cadera',
  knee: 'Rodilla',
  ankle: 'Tobillo',
  neck: 'Cuello',
}

export const RESTRICTION_LABEL: Record<DietRestriction, string> = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  'lactose-free': 'Sin lactosa',
  'gluten-free': 'Sin gluten',
}

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  peanut: 'Maní',
  'tree-nuts': 'Frutos secos',
  egg: 'Huevo',
  fish: 'Pescado',
  shellfish: 'Mariscos',
  soy: 'Soya',
  milk: 'Leche',
  gluten: 'Gluten',
}

export const BUDGET_LABEL: Record<Budget, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
}

export const MAIN_LIFT_EXERCISE_LABEL: Record<MainLift, string> = {
  squat: 'Sentadilla',
  bench: 'Press banca',
  deadlift: 'Peso muerto',
  ohp: 'Press militar',
  row: 'Remo con barra',
  pullup: 'Dominadas / jalón',
}

export const UNIT_LABEL: Record<WeightUnit, string> = { kg: 'kg', lb: 'lb' }

export const PATTERN_LABEL: Record<MovementPattern, string> = {
  squat: 'Sentadilla',
  hinge: 'Bisagra de cadera',
  lunge: 'Zancada',
  'horizontal-push': 'Empuje horizontal',
  'vertical-push': 'Empuje vertical',
  'horizontal-pull': 'Jalón horizontal (remo)',
  'vertical-pull': 'Jalón vertical',
  'chest-fly': 'Aperturas de pecho',
  'lateral-raise': 'Elevación lateral',
  'rear-delt': 'Deltoide posterior',
  'elbow-flexion': 'Flexión de codo (bíceps)',
  'elbow-extension': 'Extensión de codo (tríceps)',
  'knee-extension': 'Extensión de rodilla',
  'knee-flexion': 'Flexión de rodilla (femoral)',
  'hip-thrust': 'Empuje de cadera',
  'hip-abduction': 'Abducción de cadera',
  'calf-raise': 'Pantorrilla',
  'core-flexion': 'Flexión de tronco',
  'core-stability': 'Estabilidad de core',
  shrug: 'Encogimientos',
  carry: 'Cargadas / paseos',
}

export const LOAD_TYPE_LABEL: Record<LoadType, string> = {
  barbell: 'Barra con discos',
  dumbbell: 'Mancuernas',
  stack: 'Máquina o polea',
  bodyweight: 'Peso corporal (+ lastre)',
  fixed: 'Peso fijo (kettlebell, banda…)',
}
