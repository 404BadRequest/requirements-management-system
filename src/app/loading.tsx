import { RmsLoader } from "@/components/common/rms-loader";

export default function Loading() {
  return (
    <RmsLoader
      title="Cargando aplicación..."
      description="Inicializando navegación, permisos y configuración de tu workspace."
    />
  );
}
