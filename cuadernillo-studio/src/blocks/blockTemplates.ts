
import type {
  BlockKind,
  ChecklistItem,
  MultipleChoiceExercise,
} from '../models/document';

export type TemplateContent = {
  body?: string;
  checklist?: ChecklistItem[];
  multipleChoice?: MultipleChoiceExercise;
};

export function createBlockTemplate(
  kind: BlockKind
): TemplateContent {
  switch (kind) {
    case 'selfEvaluation':
      return {
        body: 'Marca el nivel de logro alcanzado en cada criterio.',
        checklist: [
          {
            id: crypto.randomUUID(),
            text: 'Identifico los conceptos estudiados.',
          },
          {
            id: crypto.randomUUID(),
            text: 'Explico lo aprendido con mis propias palabras.',
          },
          {
            id: crypto.randomUUID(),
            text: 'Aplico mis conocimientos en situaciones cotidianas.',
          },
        ],
      };

    case 'pisa':
      return {
        body: 'Lee la situación y responde la pregunta.',
        multipleChoice: {
          situation:
            'Escribe aquí una situación relacionada con el tema.',
          question:
            '¿Cuál de las siguientes opciones es correcta?',
          options: [
            'Primera opción',
            'Segunda opción',
            'Tercera opción',
            'Cuarta opción',
          ],
          justificationLines: 2,
        },
      };

    default:
      return {
        body: '',
      };
  }
}
