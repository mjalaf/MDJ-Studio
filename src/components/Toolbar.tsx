import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  GitFork,
  ChevronDown
} from 'lucide-react';

interface ToolbarProps {
  onInsertText: (before: string, after?: string, defaultText?: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onInsertText }) => {
  const [showMermaidMenu, setShowMermaidMenu] = useState(false);

  const insertMermaid = (templateType: string) => {
    setShowMermaidMenu(false);
    let template = '';

    switch (templateType) {
      case 'flowchart':
        template = `\`\`\`mermaid\ngraph TD\n    A[Inicio] --> B{¿Procesar?}\n    B -->|Sí| C[Resultado Exitoso]\n    B -->|No| D[Fin]\n\`\`\`\n`;
        break;
      case 'sequence':
        template = `\`\`\`mermaid\nsequenceDiagram\n    autonumber\n    Cliente->>Servidor: Solicitud API\n    Servidor-->>Cliente: Respuesta JSON 200 OK\n\`\`\`\n`;
        break;
      case 'gantt':
        template = `\`\`\`mermaid\ngantt\n    title Planificación del Proyecto\n    dateFormat  YYYY-MM-DD\n    section Diseño\n    Bocetos       :a1, 2026-09-01, 7d\n    section Desarrollo\n    Frontend      :after a1, 10d\n\`\`\`\n`;
        break;
      case 'class':
        template = `\`\`\`mermaid\nclassDiagram\n    class Documento {\n      +String titulo\n      +String contenido\n      +guardar()\n    }\n\`\`\`\n`;
        break;
      case 'mindmap':
        template = `\`\`\`mermaid\nmindmap\n  root((Proyecto Markdown))\n    Características\n      Editor Split\n      Mermaid.js\n      PDF Export\n    Plataformas\n      Web Browser\n      Electron App\n\`\`\`\n`;
        break;
      default:
        template = `\`\`\`mermaid\ngraph LR\n    Node1 --> Node2\n\`\`\`\n`;
    }

    onInsertText(template, '');
  };

  return (
    <div className="formatting-toolbar">
      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => onInsertText('**', '**', 'texto en negrita')}
          title="Negrita (Ctrl+B)"
        >
          <Bold size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('*', '*', 'texto en cursiva')}
          title="Cursiva (Ctrl+I)"
        >
          <Italic size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('~~', '~~', 'texto tachado')}
          title="Tachado"
        >
          <Strikethrough size={15} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => onInsertText('# ', '', 'Título 1')}
          title="Encabezado 1"
        >
          <Heading1 size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('## ', '', 'Título 2')}
          title="Encabezado 2"
        >
          <Heading2 size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('### ', '', 'Título 3')}
          title="Encabezado 3"
        >
          <Heading3 size={15} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => onInsertText('- ', '', 'Elemento de lista')}
          title="Lista con viñetas"
        >
          <List size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('1. ', '', 'Primer elemento')}
          title="Lista numerada"
        >
          <ListOrdered size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('- [ ] ', '', 'Nueva tarea')}
          title="Lista de tareas"
        >
          <CheckSquare size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('> ', '', 'Cita de texto')}
          title="Bloque de cita"
        >
          <Quote size={15} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => onInsertText('```typescript\n', '\n```', '// Código aquí')}
          title="Bloque de Código Sintáctico"
        >
          <Code size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() =>
            onInsertText(
              '| Columna 1 | Columna 2 |\n| :--- | :--- |\n| Dato A | Dato B |\n'
            )
          }
          title="Insertar Tabla"
        >
          <TableIcon size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('[', '](https://ejemplo.com)', 'Texto enlace')}
          title="Insertar Enlace"
        >
          <LinkIcon size={15} />
        </button>

        <button
          className="tool-btn"
          onClick={() => onInsertText('![', '](https://via.placeholder.com/600x300)', 'Descripción imagen')}
          title="Insertar Imagen"
        >
          <ImageIcon size={15} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Mermaid Templates Menu */}
      <div className="toolbar-group mermaid-dropdown-wrapper">
        <button
          className="tool-btn mermaid-btn"
          onClick={() => setShowMermaidMenu(!showMermaidMenu)}
          title="Insertar Diagrama Mermaid"
        >
          <GitFork size={15} />
          <span>Mermaid</span>
          <ChevronDown size={12} />
        </button>

        {showMermaidMenu && (
          <div className="mermaid-menu-dropdown">
            <button onClick={() => insertMermaid('flowchart')}>📊 Diagrama de Flujo (Flowchart)</button>
            <button onClick={() => insertMermaid('sequence')}>🔄 Diagrama de Secuencia</button>
            <button onClick={() => insertMermaid('gantt')}>📅 Diagrama Gantt</button>
            <button onClick={() => insertMermaid('class')}>🏗️ Diagrama de Clases</button>
            <button onClick={() => insertMermaid('mindmap')}>🧠 Mapa Mental (Mindmap)</button>
          </div>
        )}
      </div>
    </div>
  );
};
