import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { useEffect } from "react"
import NavBar from "./components/NavBar/NavBar"
import Landing from "./pages/Landing/Landing"
import Scores from "./pages/Scores/Scores"
import GameInfo from "./pages/GameInfo/GameInfo"
import Players from "./pages/Players/Players"
import Rankings from "./pages/Rankings/Rankings"
import StartSit from "./pages/StartSit/StartSit"
import NotFound from "./pages/NotFound/NotFound"

const PAGE_TITLES = {
  '/': 'StatStack — NFL Analytics',
  '/scores': 'Scores | StatStack',
  '/players': 'Player Search | StatStack',
  '/rankings': 'Player Rankings | StatStack',
  '/start-sit': 'Start/Sit Tool | StatStack',
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)

    const title = PAGE_TITLES[pathname] || 'StatStack'
    document.title = title
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
