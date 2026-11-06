import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import Cargando from "./componentes/Cargando";
import Layout from "./componentes/Layout";
import RutaProtegida from "./componentes/RutaProtegida";
import { ProveedorSesion } from "./componentes/Sesion";
import AlumnoEvaluaciones from "./paginas/AlumnoEvaluaciones";
import AlumnoFicha from "./paginas/AlumnoFicha";
import AlumnoFormulario from "./paginas/AlumnoFormulario";
import Alumnos from "./paginas/Alumnos";
import Asistencias from "./paginas/Asistencias";
import AsistenciasAlumno from "./paginas/AsistenciasAlumno";
import Configuracion from "./paginas/Configuracion";
import EliminarAlumno from "./paginas/EliminarAlumno";
import EvaluacionDetalle from "./paginas/EvaluacionDetalle";
import EvaluacionFormulario from "./paginas/EvaluacionFormulario";
import Evaluaciones from "./paginas/Evaluaciones";
import GestionPlanes from "./paginas/GestionPlanes";
import Ingresos from "./paginas/Ingresos";
import Inicio from "./paginas/Inicio";
import Login from "./paginas/Login";
import OlvidePassword from "./paginas/OlvidePassword";
import PagoNuevo from "./paginas/PagoNuevo";
import PagosDeAlumno from "./paginas/PagosDeAlumno";
import Pagos from "./paginas/Pagos";
import Pruebas from "./paginas/Pruebas";
import RegistrarAsistencia from "./paginas/RegistrarAsistencia";
import RestablecerPassword from "./paginas/RestablecerPassword";
import Rutinas from "./paginas/Rutinas";
import RutinasAlumno from "./paginas/RutinasAlumno";

// El editor de rutinas usa pdf.js (más de 1 MB con su hoja de estilos): se descarga recién al abrirlo,
// así las demás pantallas cargan más rápido.
const EditorRutina = lazy(() => import("./paginas/EditorRutina"));
const editorRutina = (
  <Suspense fallback={<Cargando />}>
    <EditorRutina />
  </Suspense>
);

// Direcciones viejas guardadas, que llevan a las nuevas: Membresías antes estaba en /pagos (e Ingresos en
// /ingresos), y las evaluaciones de un alumno en /alumnos/:id/evaluaciones.
const DIRECCIONES_VIEJAS: [RegExp, string][] = [
  [/^\/ingresos/, "/membresias/ingresos"],
  [/^\/pagos/, "/membresias"],
  [/^\/alumnos\/(\d+)\/evaluaciones/, "/evaluaciones/alumnos/$1"],
];

function DireccionVieja() {
  const { pathname } = useLocation();
  const [vieja, nueva] = DIRECCIONES_VIEJAS.find(([patron]) => patron.test(pathname)) ?? [/^/, ""];
  return <Navigate to={pathname.replace(vieja, nueva) || "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/olvide-password" element={<OlvidePassword />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />

          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="alumnos" element={<Alumnos />} />
              <Route path="alumnos/nuevo" element={<AlumnoFormulario />} />
              <Route path="alumnos/:id" element={<AlumnoFicha />} />
              <Route path="alumnos/:id/editar" element={<AlumnoFormulario />} />
              <Route path="alumnos/:id/evaluaciones/*" element={<DireccionVieja />} />
              <Route path="evaluaciones/alumnos/:id" element={<AlumnoEvaluaciones />} />
              <Route path="evaluaciones/alumnos/:id/nueva" element={<EvaluacionFormulario />} />
              <Route path="evaluaciones" element={<Evaluaciones />} />
              <Route path="evaluaciones/configuracion" element={<Pruebas />} />
              <Route path="evaluaciones/:evaluacionId" element={<EvaluacionDetalle />} />
              <Route path="evaluaciones/:evaluacionId/editar" element={<EvaluacionFormulario />} />
              <Route path="membresias" element={<Pagos />} />
              <Route path="membresias/nuevo" element={<PagoNuevo />} />
              <Route path="membresias/alumnos/:id" element={<PagosDeAlumno />} />
              <Route path="membresias/configuracion" element={<GestionPlanes />} />
              <Route path="membresias/ingresos" element={<Ingresos />} />
              <Route path="pagos/*" element={<DireccionVieja />} />
              <Route path="ingresos" element={<DireccionVieja />} />
              <Route path="rutinas" element={<Rutinas />} />
              <Route path="rutinas/:alumnoId" element={<RutinasAlumno />} />
              <Route path="rutinas/sin-alumno/nueva" element={editorRutina} />
              <Route path="rutinas/:alumnoId/nueva" element={editorRutina} />
              <Route path="rutinas/editar/:rutinaId" element={editorRutina} />
              <Route path="asistencias" element={<Asistencias />} />
              <Route path="asistencias/registrar" element={<RegistrarAsistencia />} />
              <Route path="asistencias/:alumnoId" element={<AsistenciasAlumno />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="configuracion/eliminar-alumno" element={<EliminarAlumno />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  );
}
