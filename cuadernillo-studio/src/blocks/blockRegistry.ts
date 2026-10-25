
import type { BlockKind } from '../models/document';

export type BlockDefinition = {
  kind: BlockKind;
  label: string;
  defaultTitle: string;
  description: string;
  defaultHeight: number;
};

export const blockRegistry: Record<
  BlockKind,
  BlockDefinition
> = {
  purpose: {
    kind: 'purpose',
    label: 'Propósito',
    defaultTitle: 'PROPÓSITO',
    description: 'Intención didáctica de la secuencia.',
    defaultHeight: 110,
  },

  pda: {
    kind: 'pda',
    label: 'PDA',
    defaultTitle: 'PROCESO DE DESARROLLO DE APRENDIZAJE',
    description: 'Aprendizaje que se busca desarrollar.',
    defaultHeight: 110,
  },

  start: {
    kind: 'start',
    label: 'Inicio',
    defaultTitle: 'INICIO',
    description: 'Recuperación de conocimientos previos.',
    defaultHeight: 160,
  },

  development: {
    kind: 'development',
    label: 'Desarrollo',
    defaultTitle: 'DESARROLLO',
    description: 'Construcción de conocimientos.',
    defaultHeight: 180,
  },

  question: {
    kind: 'question',
    label: 'Pregunta detonadora',
    defaultTitle: 'PREGUNTA DETONADORA',
    description: 'Pregunta para iniciar una reflexión.',
    defaultHeight: 120,
  },

  case: {
    kind: 'case',
    label: 'Caso real',
    defaultTitle: 'CASO REAL',
    description: 'Situación vinculada con la realidad.',
    defaultHeight: 180,
  },

  activity: {
    kind: 'activity',
    label: 'Actividad',
    defaultTitle: 'NUEVA ACTIVIDAD',
    description: 'Ejercicios, preguntas, tablas y práctica.',
    defaultHeight: 160,
  },

  pisa: {
    kind: 'pisa',
    label: 'Actividad tipo PISA',
    defaultTitle: 'ACTIVIDAD TIPO PISA',
    description: 'Problema contextualizado y razonamiento.',
    defaultHeight: 200,
  },

  closing: {
    kind: 'closing',
    label: 'Cierre',
    defaultTitle: 'CIERRE · LO QUE APRENDÍ',
    description: 'Reflexión y síntesis de aprendizajes.',
    defaultHeight: 180,
  },

  application: {
    kind: 'application',
    label: 'Aplica lo aprendido',
    defaultTitle: 'APLICA LO APRENDIDO',
    description: 'Aplicación práctica del conocimiento.',
    defaultHeight: 180,
  },

  selfEvaluation: {
    kind: 'selfEvaluation',
    label: 'Autoevaluación',
    defaultTitle: 'AUTOEVALUACIÓN',
    description: 'Valoración personal de los aprendizajes.',
    defaultHeight: 200,
  },

  image: {
    kind: 'image',
    label: 'Imagen independiente',
    defaultTitle: '',
    description: 'Ilustración independiente sin encabezado.',
    defaultHeight: 90,
  },

  information: {
    kind: 'information',
    label: 'Recuadro informativo',
    defaultTitle: 'INFORMACIÓN IMPORTANTE',
    description: 'Conceptos, ejemplos o resúmenes clave.',
    defaultHeight: 120,
  },
};

export const availableBlocks = Object.values(blockRegistry);
