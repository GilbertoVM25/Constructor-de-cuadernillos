
export type Column = 'auto' | 'left' | 'right';


export type BlockKind =
  | 'purpose'
  | 'pda'
  | 'start'
  | 'development'
  | 'question'
  | 'case'
  | 'activity'
  | 'pisa'
  | 'closing'
  | 'application'
  | 'selfEvaluation'
  | 'information';


export type BlockLayout = 'auto' | 'half' | 'full';

export type QuestionElement = {
  id: string;
  type: 'question';
  text: string;
  answerLines: number;
};


export type ChecklistItem = {
  id: string;
  text: string;
};

export type MultipleChoiceExercise = {
  situation: string;
  question: string;
  options: string[];
  justificationLines: number;
};



export type TextElement = {
  id: string;
  type: 'text';
  content: string;
};

export type TableElement = {
  id: string;
  type: 'table';
  table: WorkbookTable;
};

export type ImageElement = {
  id: string;
  type: 'image';
  src: string;
  caption: string;
  width: number;
  align: 'left' | 'center' | 'right';
};


export type GalleryImage = {
  id: string;
  src: string;
  caption: string;
};

export type GalleryElement = {
  id: string;
  type: 'gallery';
  images: GalleryImage[];
  gap: number;
};



export type ContentElement =
  | QuestionElement
  | TextElement
  | TableElement
  | ImageElement
  | GalleryElement;




export type Block = {
  id: string;
  kind: BlockKind;
  title: string;
  body: string;
  column: Column;
  minHeight: number;
  image?: string;
  /** Identificador del bloque original, solo en la vista previa. */
    sourceId?: string;

    /** Evita mostrar líneas antiguas en cada fragmento. */
    suppressLegacyLines?: boolean;
  layout?: BlockLayout;
  table?: WorkbookTable;
  
  checklist?: ChecklistItem[];
  multipleChoice?: MultipleChoiceExercise;


  // Componentes estructurados del bloque.
  // Es opcional para conservar proyectos antiguos.
  elements?: ContentElement[];
};

export type Workbook = {
  title: string;
  subtitle: string;
  sequence: number;
  blocks: Block[];
  contentNumber?: number;
  contentTitle?: string;
};


export type WorkbookSequence = Workbook & {
  id: string;
};

export type WorkbookProject = {
  id: string;
  name: string;
  sequences: WorkbookSequence[];
};



export type WorkbookTable = {
  id: string;
  headers: string[];
  rows: string[][];
  showHeaders: boolean;
};

export type TableTemplate =
  | 'basic'
  | 'comparison'
  | 'experiment';
