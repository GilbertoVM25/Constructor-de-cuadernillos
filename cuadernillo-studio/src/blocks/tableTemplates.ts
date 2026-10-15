
import type {
  TableTemplate,
  WorkbookTable,
} from '../models/document';

export const tableTemplateNames: Record<
  TableTemplate,
  string
> = {
  basic: 'Tabla básica',
  comparison: 'Tabla comparativa',
  experiment: 'Registro experimental',
};

export function createTable(
  template: TableTemplate = 'basic'
): WorkbookTable {
  const id = crypto.randomUUID();

  switch (template) {
    case 'comparison':
      return {
        id,
        showHeaders: true,
        headers: [
          'Característica',
          'Elemento A',
          'Elemento B',
        ],
        rows: [
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
      };

    case 'experiment':
      return {
        id,
        showHeaders: true,
        headers: [
          'Observación',
          'Resultado',
          'Conclusión',
        ],
        rows: [
          ['', '', ''],
          ['', '', ''],
          ['', '', ''],
        ],
      };

    default:
      return {
        id,
        showHeaders: true,
        headers: ['Concepto', 'Descripción'],
        rows: [
          ['', ''],
          ['', ''],
          ['', ''],
        ],
      };
  }
}
