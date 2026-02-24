import { BrowserRouter, Routes, Route } from "react-router-dom"
import NavBar from "./components/NavBar/NavBar"
import Landing from "./pages/Landing/Landing"
import Scores from "./pages/Scores/Scores"
import GameInfo from "./pages/GameInfo/GameInfo"
import Players from "./pages/Players/Players"
import Rankings from "./pages/Rankings/Rankings"
import StartSit from "./pages/StartSit/StartSit"
import NotFound from "./pages/NotFound/NotFound"

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <NavBar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/game/:gameId" element={<GameInfo />} />
          <Route path="/players" element={<Players />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/start-sit" element={<StartSit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
