import type { Block, Workbook } from '../../models/document';
import { availableBlocks } from '../../blocks/blockRegistry';
import { TemplateEditors } from './TemplateEditors';
import { TableEditor } from './TableEditor';
import { ContentEditor } from './ContentEditor';
export function Inspector({workbook,selected,onChange,onBlockChange}:{workbook:Workbook;selected:Block|undefined;onChange:(w:Workbook)=>void;onBlockChange:(id:string,p:Partial<Block>)=>void}) {

 return <aside className="inspector"><h2>Propiedades</h2>
  <label>Título de la secuencia<input value={workbook.title} onChange={e=>onChange({...workbook,title:e.target.value})}/></label>
  <label>Subtítulo<input value={workbook.subtitle} onChange={e=>onChange({...workbook,subtitle:e.target.value})}/></label>
  {selected ? <><hr/><h3>Editar bloque</h3>
  
  <label>
    Tipo de bloque

    <select
      value={selected.kind}
      onChange={(event) => {
        const kind = event.target.value as Block['kind'];

        onBlockChange(selected.id, { kind });
      }}
    >
      {availableBlocks.map((definition) => (
        <option
          key={definition.kind}
          value={definition.kind}
        >
          {definition.label}
        </option>
      ))}
    </select>
  </label>

    <label>Título<input value={selected.title} onChange={e=>onBlockChange(selected.id,{title:e.target.value})}/></label>
    {/* <label>Texto<textarea rows={10} value={selected.body} onChange={e=>onBlockChange(selected.id,{body:e.target.value})}/></label> */}
    
    
    <label>
      Distribución del bloque

      <select
        value={selected.layout ?? 'auto'}
        onChange={(event) =>
          onBlockChange(selected.id, {
            layout: event.target.value as
              | 'auto'
              | 'half'
              | 'full',
          })
        }
      >
        <option value="auto">
          Automática
        </option>

        <option value="half">
          Media página de ancho
        </option>

        <option value="full">
          Ancho completo
        </option>
      </select>
    </label>


    <label>Altura mínima (px)<input type="number" min={75} max={650} value={selected.minHeight} onChange={e=>onBlockChange(selected.id,{minHeight:Number(e.target.value)})}/></label>
    
    <hr />

    <ContentEditor
      selected={selected}
      onBlockChange={onBlockChange}
    />

    <TemplateEditors
      selected={selected}
      onBlockChange={onBlockChange}
    />
    {/* <TableEditor
      selected={selected}
      onBlockChange={onBlockChange}
    /> */}
  </> : <p>Selecciona un bloque para editarlo.</p>}
  </aside>;
}
