export function generateShortName(name: string): string {
  const cleaned = name
    .replace(/[-_.:;(#)]/g, '')
    .replace(/,/g, '')
    .replace(/\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(
      /(Almacenamiento|Generación|Generacion|Sistema|Planta|Proyecto|Declaración|Declaracion|Impacto|Ambiental|Modificación|Modificacion|Ampliación|Ampliacion|\sde|\scon|baterías|baterias|parque)/gi,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) return name.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
