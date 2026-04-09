# Manual de usuario — DocFincas

**Gestión documental de comunidades de propietarios**
Versión 1.0 · Asesoría Díaz

---

## Índice

1. [Acceso a la plataforma](#1-acceso-a-la-plataforma)
2. [Panel de control (Dashboard)](#2-panel-de-control-dashboard)
3. [Comunidades](#3-comunidades)
4. [Ficha de comunidad](#4-ficha-de-comunidad)
   - 4.1 Resumen documental
   - 4.2 Documentos
   - 4.3 Notas
   - 4.4 Historial
   - 4.5 Checklist
   - 4.6 Info. Operativa
5. [Buscar documentos](#5-buscar-documentos)
6. [Documentación pendiente](#6-documentación-pendiente)
7. [Comparar comunidades](#7-comparar-comunidades)
8. [Escáner](#8-escáner)
9. [Usuarios](#9-usuarios-solo-administradores)
10. [Auditoría](#10-auditoría)
11. [Ajustes](#11-ajustes)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Acceso a la plataforma

### Cómo iniciar sesión

1. Abre el navegador y accede a la dirección de la plataforma.
2. Introduce tu **correo electrónico** y **contraseña**.
3. Pulsa **Iniciar sesión**.

> Si no recuerdas tu contraseña, contacta con el administrador del sistema para que te la restablezca.

### Navegación

Una vez dentro, encontrarás un **menú lateral izquierdo** con todas las secciones de la plataforma. Puedes navegar entre ellas haciendo clic en cada opción.

---

## 2. Panel de control (Dashboard)

**Acceso:** Menú lateral → *Dashboard*

El Dashboard es la pantalla de inicio. Muestra de un vistazo el estado global de la documentación de todas las comunidades.

### Qué encontrarás

**Cabecera con estado de sincronización**
En la parte superior verás un subtítulo como:
> *● Última sincronización: hace 3 min · +5 nuevos, 2 modificados*

Esto confirma que el sistema está al día con SharePoint. La sincronización ocurre automáticamente cada 5 minutos mientras la página esté abierta. No hace falta hacer nada.

**Tarjetas de resumen**
Cuatro cifras clave de un vistazo:
- **Comunidades activas** — total de comunidades registradas
- **Carpetas vinculadas** — cuántas tienen carpeta en SharePoint
- **Archivos totales** — documentos almacenados en total
- **Archivos nuevos (últimas 24h)** — actividad reciente

**Estadísticas de documentación**
- *Comunidades al día* — con checklist completado al 100%
- *Incidencias activas* — alertas de vencimientos próximos
- *Tipos de documentos* — total de tipos de archivo presentes

**Informe ejecutivo**
Botón en la esquina superior derecha. Genera un informe PDF con el estado documental global.

> **Consejo:** El Dashboard se actualiza solo. No hay que pulsar ningún botón para sincronizar.

> **¿Un archivo no aparece?** Si acabas de subir un documento a SharePoint y todavía no lo ves en la plataforma, es completamente normal. El sistema se actualiza cada 5 minutos de forma automática. No hay que recargar la página ni hacer nada — el archivo aparecerá solo en el próximo ciclo. Este intervalo existe para no saturar la conexión con SharePoint.

---

## 3. Comunidades

**Acceso:** Menú lateral → *Comunidades*

Esta sección muestra el listado completo de las 171 comunidades gestionadas.

### Cómo buscar una comunidad

Usa la barra de búsqueda en la parte superior para filtrar por:
- **Código** de comunidad (ej. "0042")
- **Nombre** del edificio o urbanización
- **NIF** de la comunidad
- **Dirección** o **código postal**

Escribe cualquiera de estos datos y la lista se filtrará al instante.

### Filtros disponibles

**Filtro SharePoint** (desplegable):
- *Todas* — muestra todas
- *Con carpeta SP* — solo las que tienen documentos en SharePoint
- *Sin carpeta SP* — las que aún no están vinculadas
- *Por revisar* — las vinculadas provisionalmente (requieren confirmación manual)

**Filtro de completitud** (desplegable):
- *Alta* — tienen más del 70% de documentos
- *Media* — entre 40% y 70%
- *Baja* — menos del 40%

**Favoritos:** Marca con la estrella (☆) las comunidades que consultas con más frecuencia para filtrarlas rápidamente con el botón *Favoritos*.

### Columnas de la tabla

| Columna | Significado |
|---------|------------|
| Cód. | Código interno de la comunidad |
| Comunidad | Nombre y dirección |
| NIF | Número de identificación fiscal |
| CP | Código postal |
| OneDrive | ✓ verde = tiene carpeta · ⚠ naranja = por revisar · ✗ = sin carpeta |
| Completitud | Porcentaje de documentos obligatorios presentes |

### Cifras del subtítulo (clicables)

En el subtítulo de la página verás algo como:
> *171 comunidades · 156 con documentos · **25 por revisar** · 3 sin carpeta*

Las cifras en color son botones. Al hacer clic, la tabla se filtra automáticamente para mostrar solo ese grupo.

### Crear una nueva comunidad

Pulsa el botón **+ Nueva comunidad** (arriba a la derecha). Rellena los datos del formulario:
- Código, nombre, NIF, dirección, CP y número de pisos
- Pulsa **Guardar**

La comunidad aparecerá inmediatamente en el listado.

---

## 4. Ficha de comunidad

**Acceso:** Haz clic en cualquier comunidad del listado

La ficha agrupa toda la información de una comunidad en seis pestañas.

---

### 4.1 Resumen documental

Esta pestaña muestra el estado de la documentación agrupada por categorías:

- **Documentación Jurídica** (escrituras, estatutos, NIF…)
- **Órganos de Gobierno** (actas, nombramientos…)
- **Contabilidad** (presupuestos, extractos…)
- **Seguros** (pólizas, siniestros…)
- **Contratos y Proveedores** (ascensor, limpieza, luz…)
- **Prevención de Riesgos** (evaluaciones, planes de emergencia…)

Cada categoría muestra una barra de progreso y el número de documentos completados sobre el total. Es la forma más rápida de ver qué falta en una comunidad.

---

### 4.2 Documentos

Esta pestaña es el **explorador de archivos** de la comunidad en SharePoint. Muestra exactamente los mismos documentos que están en SharePoint, sincronizados en tiempo real.

**Estructura de carpetas**

Los documentos están organizados por subcarpetas estándar. Verás una **pestaña por cada subcarpeta** en la parte superior:
- *Raíz* — archivos sueltos en la carpeta principal
- *01_Actas* — actas de juntas
- *02_Presupuestos_y_Cuentas* — contabilidad
- *03_Contratos* — contratos de proveedores
- *04_Facturas* — facturas
- *05_Seguros* — pólizas y siniestros
- *06_Certificados_e_Informes* — certificados
- *07_Recibos* — recibos
- *08_Correspondencia* — cartas y emails
- *09_Documentacion_Legal* — escrituras, estatutos
- *10_Mantenimiento* — partes de mantenimiento
- *11_Otros* — otros documentos

**Cómo abrir un documento**

1. Selecciona la subcarpeta correspondiente (pestaña en la parte superior)
2. En la lista de archivos, haz clic en el **nombre** del archivo
3. El archivo se abrirá directamente en SharePoint (en una nueva pestaña)

**Información de cada archivo**

Cada fila muestra:
- Icono de tipo (PDF, Word, Excel, imagen…)
- Nombre del archivo
- Tamaño
- Fecha de última modificación
- Etiqueta de vencimiento si tiene fecha asignada (ver más abajo)

**Subir un documento**

Para subir un nuevo archivo a la carpeta de esta comunidad:
1. Selecciona la subcarpeta donde quieres subirlo (pestaña)
2. Pulsa el botón **Subir archivo** (arriba a la derecha de la lista)
3. Selecciona el archivo desde tu ordenador
4. El archivo se sube directamente a SharePoint

**Asignar fecha de vencimiento a un documento**

Algunos documentos tienen caducidad (seguros, contratos, ITE…). Para registrarla:
1. Haz clic en el icono de calendario junto al nombre del archivo
2. Introduce la **fecha de vencimiento** y, opcionalmente, los días de aviso previo
3. Pulsa **Guardar**

A partir de ese momento, el documento mostrará una etiqueta de color:
- **Verde** — vence en más de 30 días
- **Naranja** — vence en menos de 30 días
- **Rojo** — ya vencido

---

### 4.3 Notas

Espacio para escribir notas internas sobre la comunidad, visibles solo para el equipo de la asesoría.

**Cómo añadir una nota:**
1. Escribe el texto en el campo de texto inferior
2. Pulsa **Guardar nota**

Las notas aparecen ordenadas por fecha, de la más reciente a la más antigua. Puedes **eliminar** cualquier nota pulsando el icono de papelera.

> Las notas **no son visibles para los propietarios**. Son exclusivamente internas.

---

### 4.4 Historial

Registro automático de todas las acciones realizadas sobre esta comunidad: documentos añadidos, eliminados, notas creadas, cambios en el checklist, etc.

Útil para saber quién hizo qué y cuándo, sin necesidad de recordarlo.

---

### 4.5 Checklist

El checklist es la **lista de control documental** de la comunidad. Contiene los 27 tipos de documentos estándar que debe tener cada comunidad.

**Estados posibles de cada documento:**

| Estado | Significado |
|--------|------------|
| ✓ Completado | El documento está disponible |
| ⏳ Pendiente | Falta este documento |
| — No aplica | Este tipo de documento no corresponde a esta comunidad |

**Cómo actualizar el estado de un documento:**
1. Localiza el tipo de documento en la lista
2. Haz clic en el estado actual para cambiarlo
3. El cambio se guarda automáticamente

**Botón "Auto-detectar"**
Este botón analiza automáticamente los archivos presentes en SharePoint y marca como *Completado* todos los tipos de documento que detecta. Úsalo cuando la carpeta de SharePoint ya tenga archivos subidos.

**Porcentaje de completitud**
En la parte superior se muestra el porcentaje global, que también aparece en el listado de comunidades.

---

### 4.6 Info. Operativa

Ficha con características específicas de la comunidad que afectan a la gestión diaria:

- ¿Usa Agre/Gasfincas?
- ¿Somos corredor de seguro?
- ¿Tiene la app TuComunidad?
- ¿Tiene portero / conserje / garajista / limpiadora?
- ¿Tiene videovigilancia?
- ¿Actúa como arrendadora?
- ¿Gestiona consumos / permisos de gasóleo?
- ¿Tiene reforma de fontanería / saneamiento / electricidad?
- ¿Está obligada a ITE?
- ¿Usa el nuevo sistema de incidencias?

Para **editar** esta información: activa o desactiva cada interruptor y pulsa **Guardar cambios**.

---

## 5. Buscar documentos

**Acceso:** Menú lateral → *Buscar docs* (o similar)

Permite buscar archivos en **todas las comunidades** a la vez, sin tener que entrar en cada una.

### Cómo buscar

Escribe en el campo principal el nombre (o parte del nombre) del archivo que buscas. Los resultados aparecen en tiempo real.

### Filtros adicionales

Puedes combinar varios filtros para acotar la búsqueda:

| Filtro | Para qué sirve |
|--------|----------------|
| **Subcarpeta** | Busca solo en un tipo de carpeta (ej. solo en "Actas") |
| **Comunidad** | Limita la búsqueda a una comunidad concreta |
| **Tipo de archivo** | Filtra por PDF, Word, Excel o imagen |

### Resultados

Cada resultado muestra:
- Nombre del archivo (clic para abrirlo en SharePoint)
- Comunidad a la que pertenece (clic para ir a su ficha)
- Subcarpeta donde está guardado
- Tamaño y fecha de modificación

---

## 6. Documentación pendiente

**Acceso:** Menú lateral → *Doc. Pendiente*

Esta sección identifica automáticamente qué comunidades tienen **subcarpetas vacías o inexistentes**. Es la herramienta para hacer seguimiento de la documentación que falta.

### Cómo funciona

La pantalla muestra todas las comunidades vinculadas a SharePoint que tienen alguna subcarpeta estándar vacía o sin crear. Para cada comunidad se indica:

- **Barras de subcarpetas** — verde si tiene archivos, rojo si está vacía
- **% de cobertura** — porcentaje de subcarpetas con documentos
- **Subcarpetas presentes** — lista de carpetas que ya tienen contenido
- **Subcarpetas faltantes** — las que están vacías o no existen

### Filtrar por subcarpeta

Usa el desplegable de la parte superior para ver solo las comunidades que les falta una subcarpeta específica. Por ejemplo: "¿Qué comunidades no tienen contrato de ascensor?" → selecciona *03_Contratos*.

### Exportar informe CSV

Pulsa el botón **Exportar CSV** para descargar un informe Excel con toda la información. Útil para enviarlo por correo o imprimirlo.

El archivo descargado tendrá nombre como `informe_documentacion_2025-04-08.csv`.

---

## 7. Comparar comunidades

**Acceso:** Menú lateral → *Comparar* (o desde el botón *Comparar* en la lista de comunidades)

Permite comparar entre 2 y 5 comunidades en paralelo para ver diferencias y similitudes en su documentación.

### Cómo comparar

1. Busca las comunidades que quieres comparar usando el buscador
2. Haz clic en cada comunidad para seleccionarla (aparecerá marcada)
3. Puedes seleccionar hasta 5 comunidades
4. Pulsa el botón **Comparar**

### Información que aparece por comunidad

- **Carpeta SharePoint** vinculada (o si no tiene)
- **Número de archivos** totales
- **Tamaño total** de documentos
- **Cobertura de subcarpetas** — qué porcentaje de carpetas estándar tiene archivos
- **Detalle subcarpeta a subcarpeta** — ✓ o ✗ para cada tipo de carpeta
- **Tipos de archivo** presentes (PDF, Word, Excel…)
- **Última actividad** — fecha del último cambio en SharePoint
- **Notas** — cuántas notas internas tiene

> Útil para detectar comunidades que van por detrás en documentación respecto a otras similares.

---

## 8. Escáner

**Acceso:** Menú lateral → *Escáner*

El Escáner es una herramienta para **clasificar y organizar documentos en lote**. Cuando alguien sube archivos a la carpeta de entrada de SharePoint (la carpeta "Escáner"), esta herramienta los analiza, detecta a qué comunidad pertenece cada uno y propone dónde moverlos.

### Flujo de trabajo

**Paso 1 — Escanear**

Pulsa el botón **Escanear carpeta**. El sistema analiza todos los archivos que están en la carpeta de entrada de SharePoint y muestra una lista con:

- Nombre del archivo
- Comunidad detectada (basado en el código o nombre en el nombre del archivo)
- Subcarpeta propuesta (ej. *01_Actas*)
- **Confianza** de la clasificación:
  - **Alta** (verde) — muy seguro
  - **Media** (naranja) — probable pero revisar
  - **Baja** (rojo) — incierto, requiere corrección manual
  - **Sin clasificar** (gris) — no se ha podido determinar

**Paso 2 — Revisar y corregir**

Antes de mover los archivos, revisa la lista:
- Los de confianza **Alta** normalmente son correctos
- Los de confianza **Media** y **Baja** conviene comprobarlos
- Puedes **editar manualmente** la comunidad y la subcarpeta de cualquier archivo usando los desplegables

Para filtrar la lista:
- Filtro de confianza (Alta / Media / Baja / Sin clasificar)
- Búsqueda por nombre de archivo

**Paso 3 — Mover archivos**

Una vez revisada la lista:
1. Marca los archivos que quieres mover (o usa "Seleccionar todos")
2. Pulsa **Mover seleccionados**
3. Los archivos se moverán en SharePoint a la carpeta de su comunidad correspondiente
4. Al finalizar verás un resumen de cuántos se movieron correctamente y si hubo algún error

> **Importante:** Esta operación mueve los archivos en SharePoint. No se pueden deshacer desde la plataforma, aunque siempre puedes moverlos manualmente desde SharePoint si hay un error.

### Consejo: cómo nombrar los archivos para el Escáner

El sistema detecta a qué comunidad pertenece cada archivo leyendo su nombre. Cuanto más claro sea el nombre, más fiable será la clasificación automática. Seguir este formato garantiza una confianza **Alta** en la mayoría de los casos:

```
CODIGO_TipoDocumento_Fecha.pdf
```

Ejemplos correctos:

| Nombre de archivo | Resultado |
|-------------------|-----------|
| `0042_Acta_2025-03.pdf` | Comunidad 0042 → carpeta Actas · confianza Alta |
| `0117_Seguro_Multirriesgo_2025-01.pdf` | Comunidad 0117 → carpeta Seguros · confianza Alta |
| `0085_Contrato_Limpieza_2024.pdf` | Comunidad 0085 → carpeta Contratos · confianza Alta |
| `0033_Presupuesto_2025.xlsx` | Comunidad 0033 → carpeta Presupuestos · confianza Alta |

Nombres que generan clasificación Media o Baja (evitar):
- `Factura.pdf` — sin código de comunidad
- `Documento enero.pdf` — sin código ni tipo claro
- `Escaneo0001.pdf` — nombre genérico sin información

> Si el nombre no contiene el código de la comunidad, el sistema puede adivinar la comunidad pero con confianza Baja o Media, lo que obliga a revisión manual.

### La plataforma no puede borrar documentos

Por diseño, **ningún usuario puede eliminar documentos desde esta plataforma**, independientemente de su rol. Todo lo que se ve en la lista de archivos solo puede abrirse o descargarse. Esto significa que nadie puede "romper" nada por accidente al usar la plataforma.

Si necesitas eliminar un documento, deberás hacerlo directamente desde SharePoint con las credenciales de administrador. La plataforma detectará la eliminación en la próxima sincronización y actualizará la vista automáticamente.

---

## 9. Usuarios (solo administradores)

**Acceso:** Menú lateral → *Usuarios*

Sección exclusiva para administradores. Permite gestionar quién puede acceder a la plataforma.

### Ver usuarios existentes

La pantalla muestra todos los usuarios dados de alta con su nombre, correo y rol.

**Roles:**
- **Administrador** — acceso completo, incluida esta sección
- **Usuario** — acceso de solo lectura (no puede crear ni modificar)

### Crear un nuevo usuario

1. Pulsa **+ Nuevo usuario**
2. Rellena nombre, correo electrónico y contraseña
3. Selecciona el rol
4. Pulsa **Guardar**

El nuevo usuario ya podrá iniciar sesión inmediatamente.

### Eliminar un usuario

Pulsa el icono de papelera junto al usuario. Se pedirá confirmación antes de eliminarlo.

> No se puede eliminar el propio usuario con el que estás conectado.

---

## 10. Auditoría

**Acceso:** Menú lateral → *Auditoría*

Registro completo de todas las acciones realizadas en la plataforma por todos los usuarios.

### Qué se registra

- Inicios de sesión
- Creación y eliminación de comunidades y usuarios
- Sincronizaciones con SharePoint
- Cambios en checklists
- Notas creadas o eliminadas
- Actualizaciones de información operativa

### Cómo usar el registro

La lista está ordenada de la acción más reciente a la más antigua. Para cada entrada se muestra:
- Fecha y hora
- Usuario que realizó la acción
- Tipo de acción
- Descripción del cambio

Útil para resolver dudas del tipo "¿Quién borró ese archivo?" o "¿Cuándo se hizo el último cambio en esta comunidad?".

---

## 11. Ajustes

**Acceso:** Menú lateral → *Ajustes*

Sección de configuración técnica de la plataforma. **Solo para administradores.**

### Conexión SharePoint

Muestra si la conexión con Microsoft SharePoint está activa. Indica el sitio y las carpetas a las que tiene acceso la plataforma.

Si aparece un mensaje de error en rojo, significa que hay un problema con las credenciales de conexión. En ese caso contacta con el administrador del sistema.

**Carpetas permitidas**
La plataforma solo accede a dos carpetas en SharePoint:
- *Comunidades* — donde están las carpetas de cada comunidad
- *Escáner* — carpeta de entrada para el escáner de documentos

**Botón "Redescubrir"**: Vuelve a buscar estas carpetas en SharePoint. Úsalo solo si se ha cambiado la ubicación de las carpetas.

### Sincronización

La sincronización es automática y no requiere intervención. Aquí solo encontrarás:

**Resetear sync**: Usa este botón únicamente si la sincronización se ha quedado bloqueada indefinidamente (indicador de "sincronizando" que no avanza durante más de 20 minutos). Restablece el estado sin borrar ningún dato.

### Modelos de IA

Permite configurar qué motor de inteligencia artificial se usa para las funciones automáticas de la plataforma (clasificación de documentos, sugerencias, etc.). No es necesario modificar esto salvo instrucción explícita del administrador.

---

## 12. Preguntas frecuentes

**¿Por qué no aparece un documento que acabo de subir a SharePoint?**
La sincronización ocurre automáticamente cada 5 minutos mientras el Dashboard esté abierto. Si acabas de subir un archivo, espera un momento y recarga la página. También puedes abrir el Dashboard para que la sincronización se active.

**¿Los documentos se guardan en la plataforma o en SharePoint?**
Los documentos siempre están en **SharePoint**. La plataforma es un espejo que muestra lo que hay en SharePoint, pero los archivos en sí se almacenan ahí. Si abres un documento desde la plataforma, se abre en SharePoint.

**¿Puedo eliminar documentos desde la plataforma?**
No, y esto es intencionado. Ningún usuario, sea administrador o no, puede eliminar documentos desde esta plataforma. La plataforma es solo de consulta y organización: puedes abrir, descargar, clasificar y añadir notas, pero nunca borrar. Puedes usarla con total tranquilidad sabiendo que no es posible eliminar nada por error. Si en algún momento necesitas eliminar un documento, deberás hacerlo directamente desde SharePoint.

**¿Qué significa "por revisar" en una comunidad?**
Significa que la plataforma ha encontrado una carpeta en SharePoint que probablemente corresponde a esa comunidad, pero no está completamente segura. Hay que confirmar manualmente si el vínculo es correcto.

**¿Qué hago si una comunidad aparece "sin carpeta" pero sé que tiene documentos en SharePoint?**
Es posible que la carpeta en SharePoint tenga un nombre que no coincide con el nombre o código de la comunidad. En este caso hay que contactar con el administrador para vincularla manualmente.

**¿Los cambios en el checklist se guardan automáticamente?**
Sí. Cada vez que cambias el estado de un ítem del checklist, el cambio se guarda en el momento.

**¿Quién puede ver las notas internas?**
Solo los usuarios con acceso a la plataforma. Las notas no son visibles para los propietarios ni se sincronizan con SharePoint.

**¿Puedo usar la plataforma desde el móvil?**
Sí, la plataforma es accesible desde cualquier navegador web, incluyendo dispositivos móviles y tabletas.

---

*Manual DocFincas v1.0 · Asesoría Díaz · Uso interno*
