import type { Workbook } from '../models/document';
export const initialWorkbook: Workbook = {
  title: '¿De dónde proviene la ciencia?',
  subtitle: 'Saberes de diferentes pueblos y culturas',
  sequence: 1,
  blocks: [
    {id:'a',kind:'purpose',title:'PROPÓSITO',body:'Que las y los estudiantes reconozcan los aportes de saberes de diferentes pueblos y culturas en la satisfacción de necesidades humanas, valorando su importancia en la vida actual.',column:'left',minHeight:140,image:'/assets/brain.png'},
    {id:'b',kind:'pda',title:'PROCESO DE DESARROLLO DE APRENDIZAJE',body:'Reconoce los aportes de saberes de diferentes pueblos y culturas en la satisfacción de necesidades humanas en diversos ámbitos (medicina, construcción, artesanías, textiles y alimentos).',column:'right',minHeight:140,image:'/assets/star.png'},
    {id:'c',kind:'start',title:'INICIO · ACTIVIDAD 1. Lo que ya sabes',body:'¿Qué conocimientos utilizas en tu vida diaria que crees que vienen de generaciones anteriores?\n\nEscribe un ejemplo de un conocimiento tradicional en tu comunidad:',column:'left',minHeight:325,image:'/assets/pencil.png'},
    {id:'d',kind:'development',title:'DESARROLLO · Construyendo el conocimiento',body:'Los pueblos originarios desarrollaron conocimientos para resolver necesidades como curar enfermedades, construir viviendas, elaborar alimentos y crear herramientas.\n\nEstos saberes se basan en la observación y la experiencia, elementos fundamentales del pensamiento científico.',column:'right',minHeight:325,image:'/assets/herbs.png'},
    {id:'e',kind:'question',title:'PREGUNTA DETONADORA',body:'¿Es posible que la ciencia moderna exista sin los conocimientos de las culturas antiguas?',column:'left',minHeight:155,image:'/assets/question.png'},
    {id:'f',kind:'activity',title:'ACTIVIDAD 2. Relaciona y completa',body:'Completa una tabla relacionando cultura o comunidad, saber desarrollado, necesidad que resolvía y relación con la química.',column:'right',minHeight:165},
    {id:'g',kind:'case',title:'CASO REAL · Contaminación del Río Bravo',body:'El Río Bravo es un recurso fundamental para muchas comunidades, pero enfrenta problemas como contaminación por residuos industriales, uso excesivo de fertilizantes y descargas de aguas residuales.',column:'left',minHeight:250,image:'/assets/river.png'},
    {id:'h',kind:'activity',title:'ACTIVIDAD 3. Analiza el problema',body:'¿Cómo afecta esta situación a las personas?\n\n¿Qué consecuencias tiene para el ambiente?\n\n¿Qué conocimientos tradicionales podrían ayudar a mejorar esta situación?',column:'right',minHeight:250},
  ]
};
