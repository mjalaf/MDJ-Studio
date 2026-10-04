export const SAMPLE_MARKDOWN = `# 🚀 Reader & Editor de Markdown + Mermaid

¡Bienvenido a tu nuevo lector y editor de **Markdown** y **Mermaid**! Esta aplicación está optimizada tanto para la **Web** como para **Electron** (Escritorio).

---

## 🎨 Características Destacadas

- 📄 **Soporte Completo Markdown (GFM)**: Encabezados, tablas, listas de tareas, bloques de código con sintaxis.
- 🧜‍♂️ **Diagramas Mermaid (\`.mmd\`)**: Renderizado dinámico e interactivo de diagramas en tiempo real.
- 🎨 **Estilos & Decoración**: Personaliza fuentes, interlineados y 5 temas visuales (*Dark Glass, GitHub Light, Cyberpunk, Sepia, Nord*).
- 📤 **Exportación a PDF**: Genera documentos PDF vectoriales y limpios listos para compartir.
- 💻 **Modo Dual**: Funciona en tu navegador o instalada como aplicación nativa de escritorio.

---

## 📊 Ejemplo de Diagrama Mermaid

Puedes incluir diagramas Mermaid escribiendo bloques \`\`\`mermaid:

\`\`\`mermaid
graph TD
    A[Inicio: Archivo .md o .mmd] --> B{¿Es Electron o Web?}
    B -->|Electron| C[Diálogos Nativos + printToPDF]
    B -->|Web| D[File API + html2pdf.js]
    C --> E[Vista Previa & Renderizado Mermaid]
    D --> E
    E --> F[Exportar a PDF / Guardar]
\`\`\`

### 🔄 Diagrama de Secuencia

\`\`\`mermaid
sequenceDiagram
    autonumber
    Usuario->>Editor: Escribe Markdown / Mermaid
    Editor->>Preview: Actualiza contenido en tiempo real
    Preview->>MermaidEngine: Renderiza nodos SVG
    MermaidEngine-->>Preview: Muestra diagrama fluido
    Usuario->>PDFExporter: Clic en "Exportar a PDF"
    PDFExporter-->>Usuario: Descarga documento compilado
\`\`\`

---

## 📝 Elementos de Formato y Estilo

### Lista de Tareas Decoradas
- [x] Crear arquitectura para Web y Electron
- [x] Integrar motor de renderizado Markdown
- [x] Implementar soporte completo para \`.mmd\` y Mermaid.js
- [x] Agregar exportador a PDF
- [ ] ¡Disfrutar escribiendo documentos geniales!

### Tablas Estilizadas

| Elemento | Descripción | Compatibilidad |
| :--- | :--- | :---: |
| **Editor Split** | Vista dividida con scroll sincronizado | 🟢 100% |
| **Archivos .mmd** | Apertura y renderizado de diagramas puros | 🟢 100% |
| **Temas Visuales** | 5 paletas de colores cuidadosamente seleccionadas | 🟢 100% |
| **Exportación PDF** | Salida limpia vectorial para impresión | 🟢 100% |

### Bloques de Cita & Código

> *"El código elegante no solo funciona bien; se siente increíble de usar."*

\`\`\`typescript
interface DocumentState {
  title: string;
  content: string;
  theme: 'dark-glass' | 'github-light' | 'cyberpunk';
  renderMermaid: boolean;
}

const initializeApp = (doc: DocumentState): void => {
  console.log("Cargando documento...");
};
\`\`\`
`;

export const SAMPLE_MERMAID = `graph TD
    title[Diagrama de Flujo Mermaid (.mmd)]
    
    A[💻 Usuario escribe sintaxis Mermaid] --> B[⚡ Analizador sintáctico]
    B --> C{¿Sintaxis Válida?}
    C -->|Sí| D[🎨 Generación Vectorial SVG]
    C -->|No| E[⚠️ Mostrar mensaje de ayuda]
    
    D --> F[🔍 Controles de Zoom & Pan]
    D --> G[📸 Exportación SVG / PNG]
    D --> H[📄 Inclusión en PDF]
    
    classDef primary fill:#6366f1,stroke:#4f46e5,color:#fff,stroke-width:2px;
    classDef success fill:#10b981,stroke:#059669,color:#fff,stroke-width:2px;
    classDef warning fill:#f59e0b,stroke:#d97706,color:#fff,stroke-width:2px;

    class A,B primary;
    class D,F,G,H success;
    class E warning;
`;
