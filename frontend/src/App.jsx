import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ArtistExplorer from "./pages/ArtistExplorer";
import BusinessQuestions from "./pages/BusinessQuestions";
import CrudDemo from "./pages/CrudDemo";
import Dashboard from "./pages/Dashboard";
import MuseumMapPage from "./pages/MuseumMapPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explorateur" element={<ArtistExplorer />} />
          <Route path="/carte" element={<MuseumMapPage />} />
          <Route path="/questions" element={<BusinessQuestions />} />
          <Route path="/crud" element={<CrudDemo />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
