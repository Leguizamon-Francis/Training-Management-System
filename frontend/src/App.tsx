import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
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
import PagoNuevo from "./paginas/PagoNuevo";
import PagosDeAlumno from "./paginas/PagosDeAlumno";
import Pagos from "./paginas/Pagos";
import Pruebas from "./paginas/Pruebas";
import RegistrarAsistencia from "./paginas/RegistrarAsistencia";
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

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="alumnos" element={<Alumnos />} />
              <Route path="alumnos/nuevo" element={<AlumnoFormulario />} />
              <Route path="alumnos/:id" element={<AlumnoFicha />} />
              <Route path="alumnos/:id/editar" element={<AlumnoFormulario />} />
              <Route path="alumnos/:id/evaluaciones" element={<AlumnoEvaluaciones />} />
              <Route path="alumnos/:id/evaluaciones/nueva" element={<EvaluacionFormulario />} />
              <Route path="evaluaciones" element={<Evaluaciones />} />
              <Route path="evaluaciones/configuracion" element={<Pruebas />} />
              <Route path="evaluaciones/:evaluacionId" element={<EvaluacionDetalle />} />
              <Route path="evaluaciones/:evaluacionId/editar" element={<EvaluacionFormulario />} />
              <Route path="pagos" element={<Pagos />} />
              <Route path="pagos/nuevo" element={<PagoNuevo />} />
              <Route path="pagos/alumnos/:id" element={<PagosDeAlumno />} />
              <Route path="pagos/configuracion" element={<GestionPlanes />} />
              <Route path="ingresos" element={<Ingresos />} />
              <Route path="rutinas" element={<Rutinas />} />
              <Route path="rutinas/:alumnoId" element={<RutinasAlumno />} />
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
